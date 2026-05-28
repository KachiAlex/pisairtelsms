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

      await sql`CREATE TABLE IF NOT EXISTS student_assignments (
        id TEXT PRIMARY KEY, student_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
        subject TEXT, teacher TEXT, due_date DATE, status TEXT DEFAULT 'pending',
        submission_type TEXT DEFAULT 'online', max_score NUMERIC DEFAULT 100,
        score NUMERIC, feedback TEXT, attachments JSONB DEFAULT '[]'::jsonb,
        submitted_at TIMESTAMP, submitted_files JSONB DEFAULT '[]'::jsonb,
        instructions TEXT DEFAULT '', created_at TIMESTAMP DEFAULT NOW()
      )`;

      let query = sql`SELECT id::text, title, description, subject, teacher, due_date::text AS due_date,
        status, submission_type, max_score, score, feedback, attachments,
        submitted_at::text AS submitted_at, submitted_files, instructions, created_at::text AS created_at
        FROM student_assignments WHERE student_id = ${studentId}`;

      if (subject) query = sql`SELECT id::text, title, description, subject, teacher, due_date::text AS due_date,
        status, submission_type, max_score, score, feedback, attachments,
        submitted_at::text AS submitted_at, submitted_files, instructions, created_at::text AS created_at
        FROM student_assignments WHERE student_id = ${studentId} AND LOWER(subject) = LOWER(${subject as string})`;

      const result = await query;
      const now = new Date();
      const nowStr = now.toISOString().split('T')[0];

      let assignments: Assignment[] = result.rows.map(r => {
        let st = r.status as Assignment['status'];
        if (st === 'pending' && r.due_date && r.due_date < nowStr) st = 'late';
        return {
          id: r.id, title: r.title, description: r.description || '', subject: r.subject || '',
          teacher: r.teacher || '', dueDate: r.due_date || '', status: st,
          submissionType: (r.submission_type || 'online') as Assignment['submissionType'],
          maxScore: Number(r.max_score) || 100, score: r.score ? Number(r.score) : null,
          feedback: r.feedback || null, attachments: Array.isArray(r.attachments) ? r.attachments : [],
          submittedAt: r.submitted_at || null,
          submittedFiles: Array.isArray(r.submitted_files) ? r.submitted_files : [],
          instructions: r.instructions || '', createdAt: r.created_at || new Date().toISOString(),
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
      const { action } = body || {};

      if (action === 'submit') {
        const existing = await sql`SELECT status FROM student_assignments WHERE id = ${id as string} AND student_id = ${studentId}`;
        if (!existing.rows[0]) return res.status(404).json({ error: 'Assignment not found' });
        if (existing.rows[0].status === 'submitted' || existing.rows[0].status === 'graded') {
          return res.status(400).json({ error: 'Assignment already submitted' });
        }
        await sql`UPDATE student_assignments SET status = 'submitted', submitted_at = NOW(),
          submitted_files = ${JSON.stringify(body.files || [])}::jsonb WHERE id = ${id as string} AND student_id = ${studentId}`;
        return res.status(200).json({ success: true, message: 'Assignment submitted successfully' });
      }
      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Error submitting assignment:', error);
      return res.status(500).json({ error: 'Failed to submit assignment' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
