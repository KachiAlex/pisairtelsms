import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacher: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  submissionType: 'online' | 'offline' | 'both';
  maxScore: number;
  score?: number | null;
  feedback?: string | null;
  attachments: Array<{ id: string; name: string; url: string; type: string }>;
  submittedAt?: string | null;
  submittedFiles?: Array<{ id: string; name: string; url: string }>;
  instructions: string;
  createdAt: string;
}

interface AssignmentsListResponse {
  assignments: Assignment[];
  summary: { total: number; pending: number; submitted: number; graded: number; overdue: number };
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) return xUserId.trim();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.studentId || payload.userId || payload.sub || null;
    }
  } catch {}
  return token || null;
}

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });

  if (req.method === 'GET') {
    try {
      const { status, subject } = req.query;

      const studentRes = await sql`SELECT tenant_id, class, arm FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1`;
      const tenantId = studentRes.rows[0]?.tenant_id || 'default-tenant';

      const result = await sql`
        SELECT a.id::text, a.title, a.instructions, a.points, a.due_date::text AS due_date,
          a.attachment_urls, a.is_published, a.created_at::text AS created_at,
          COALESCE(s.name, '') AS subject_name
        FROM assignments a
        LEFT JOIN virtual_classrooms vc ON vc.id = a.classroom_id
        LEFT JOIN subjects s ON s.id::text = vc.subject_id
        WHERE a.tenant_id = ${tenantId} AND a.is_published = true
        ORDER BY a.due_date DESC
      `;

      const submissionRes = await sql`
        SELECT assignment_id, status, submitted_at::text AS submitted_at, grade, feedback
        FROM submissions
        WHERE student_id = ${studentId} AND tenant_id = ${tenantId}
      `;
      const submissionMap = new Map<string, any>(submissionRes.rows.map(r => [r.assignment_id as string, r]));

      const now = new Date();

      let assignments: Assignment[] = result.rows.map(r => {
        const sub = submissionMap.get(r.id);
        let st: Assignment['status'] = 'pending';
        if (sub) {
          if (sub.status === 'graded') st = 'graded';
          else if (sub.status === 'returned') st = 'pending';
          else st = 'submitted';
        }
        if (st === 'pending' && r.due_date && new Date(r.due_date) < now) st = 'late';

        const attachments = Array.isArray(r.attachment_urls)
          ? r.attachment_urls.map((url: string) => ({ id: '', name: url.split('/').pop() || 'attachment', url, type: '' }))
          : [];

        return {
          id: r.id,
          title: r.title,
          description: r.instructions || '',
          subject: r.subject_name || '',
          teacher: '',
          dueDate: r.due_date || '',
          status: st,
          submissionType: 'online' as Assignment['submissionType'],
          maxScore: Number(r.points) || 100,
          score: sub?.grade ? Number(sub.grade) : null,
          feedback: sub?.feedback || null,
          attachments,
          submittedAt: sub?.submitted_at || null,
          submittedFiles: sub?.file_urls ? sub.file_urls.map((url: string) => ({ id: '', name: url.split('/').pop() || 'file', url })) : [],
          instructions: r.instructions || '',
          createdAt: r.created_at || new Date().toISOString(),
        };
      });

      if (status) assignments = assignments.filter(a => a.status === status);
      assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      const summary = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'pending').length,
        submitted: assignments.filter(a => a.status === 'submitted').length,
        graded: assignments.filter(a => a.status === 'graded').length,
        overdue: assignments.filter(a => a.status === 'late').length,
      };

      return res.status(200).json({ assignments, summary } as AssignmentsListResponse);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  } else if (req.method === 'POST') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Assignment ID is required' });
      const body = await parseBody(req);

      const studentRes = await sql`SELECT tenant_id FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1`;
      const tenantId = studentRes.rows[0]?.tenant_id || 'default-tenant';

      const assignment = await sql`SELECT due_date, allow_late_submission FROM assignments WHERE id = ${id as string} AND tenant_id = ${tenantId}`;
      if (!assignment.rows[0]) return res.status(404).json({ error: 'Assignment not found' });

      const isLate = new Date() > new Date(assignment.rows[0].due_date);
      if (isLate && !assignment.rows[0].allow_late_submission) {
        return res.status(400).json({ error: 'Late submissions are not allowed for this assignment' });
      }

      const files = Array.isArray(body.files) ? body.files : (body.fileUrls || []);
      const fileUrls = files.map((f: any) => (typeof f === 'string' ? f : f?.url || '')).filter(Boolean);

      const result = await sql`
        INSERT INTO submissions (assignment_id, student_id, tenant_id, content, file_urls, is_late, status)
        VALUES (${id as string}, ${studentId}, ${tenantId}, ${body.content || null}, ${fileUrls}, ${isLate}, 'submitted')
        ON CONFLICT (assignment_id, student_id)
        DO UPDATE SET
          content = EXCLUDED.content,
          file_urls = EXCLUDED.file_urls,
          is_late = EXCLUDED.is_late,
          status = 'resubmitted',
          submitted_at = NOW(),
          updated_at = NOW()
        RETURNING *
      `;

      return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error submitting assignment:', error);
      return res.status(500).json({ error: 'Failed to submit assignment' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
