import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface Assignment {
  id: string; subject: string; title: string; description: string;
  dueDate: string; status: 'pending' | 'submitted' | 'graded' | 'overdue';
  type: 'homework' | 'project' | 'essay' | 'quiz' | 'reading';
  teacherName: string; submittedAt?: string; score?: number; maxScore: number; feedback?: string;
}

interface AssignmentsResponse {
  assignments: Assignment[];
  summary: { total: number; pending: number; submitted: number; graded: number; overdue: number };
  childName: string;
}

function extractParentId(req: VercelRequest): string | null {
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
      return payload.parentId || payload.userId || payload.sub || null;
    }
  } catch {}
  return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parentId = extractParentId(req);
  if (!parentId) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { childId, status, type } = req.query;
    if (!childId) return res.status(400).json({ error: 'childId is required' });
    const childRes = await sql`SELECT name FROM students WHERE id = ${childId as string} AND deleted_at IS NULL LIMIT 1`;
    const childName = childRes.rows[0]?.name || '';

    const result = await sql`SELECT id::text, subject, title, description, due_date::text AS due_date,
      status, type, teacher_name, submitted_at::text AS submitted_at, score, max_score, feedback
      FROM student_assignments WHERE student_id = ${childId as string} ORDER BY due_date DESC`;

    const now = new Date();
    let assignments: Assignment[] = result.rows.map(r => {
      let st = r.status as Assignment['status'];
      if (st === 'pending' && r.due_date && new Date(r.due_date) < now) st = 'overdue';
      return {
        id: r.id, subject: r.subject || '', title: r.title,
        description: r.description || '', dueDate: r.due_date || '',
        status: st, type: (r.type || 'homework') as Assignment['type'],
        teacherName: r.teacher_name || '',
        submittedAt: r.submitted_at || undefined,
        score: r.score ? Number(r.score) : undefined,
        maxScore: Number(r.max_score) || 100,
        feedback: r.feedback || undefined,
      };
    });

    if (status) assignments = assignments.filter(a => a.status === status);
    if (type) assignments = assignments.filter(a => a.type === type);
    assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const summary = {
      total: assignments.length,
      pending: assignments.filter(a => a.status === 'pending').length,
      submitted: assignments.filter(a => a.status === 'submitted').length,
      graded: assignments.filter(a => a.status === 'graded').length,
      overdue: assignments.filter(a => a.status === 'overdue').length,
    };

    return res.status(200).json({ assignments, summary, childName } as AssignmentsResponse);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}
