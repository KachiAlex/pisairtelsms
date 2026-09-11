import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';

interface Exam {
  id: string;
  subject: string;
  paper: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  venue: string;
  type: 'midterm' | 'terminal' | 'mock' | 'promotion';
  status: 'upcoming' | 'ongoing' | 'completed';
  instructions: string;
  materialsAllowed: string[];
}

interface ExamScheduleResponse {
  exams: Exam[];
  summary: { total: number; upcoming: number; completed: number; ongoing: number };
  academicSession: string;
  term: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['student']);
  if (!decoded) return;
  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { type, status } = req.query;
    const studentRes = await sql`SELECT class FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1`;
    const studentClass = studentRes.rows[0]?.class || '';

    const examResult = await sql`SELECT id::text, title AS subject, COALESCE(description, '') AS paper,
      exam_date::text AS date, start_time::text AS start_time, end_time::text AS end_time,
      room AS venue, COALESCE(student_class, '') AS student_class
      FROM exams
      WHERE student_class = ${studentClass} OR student_class IS NULL
      ORDER BY exam_date, start_time`;

    const now = new Date();
    let exams: Exam[] = examResult.rows.map(r => {
      const examDate = new Date(`${r.date}T${r.start_time || '00:00'}`);
      const examEnd = new Date(`${r.date}T${r.end_time || '23:59'}`);
      let examStatus: Exam['status'];
      if (now < examDate) examStatus = 'upcoming';
      else if (now >= examDate && now <= examEnd) examStatus = 'ongoing';
      else examStatus = 'completed';
      const start = r.start_time ? r.start_time.slice(0,5) : '';
      const end = r.end_time ? r.end_time.slice(0,5) : '';
      let durationStr = '';
      if (r.start_time && r.end_time) {
        const diffMs = examEnd.getTime() - examDate.getTime();
        const diffH = Math.floor(diffMs / (1000*60*60));
        const diffM = Math.floor((diffMs % (1000*60*60)) / (1000*60));
        durationStr = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM} mins`;
      }
      return {
        id: r.id, subject: r.subject, paper: r.paper, date: r.date,
        startTime: start, endTime: end, duration: durationStr,
        venue: r.venue || '', type: 'terminal' as Exam['type'],
        status: examStatus, instructions: '', materialsAllowed: [],
      };
    });

    if (type) exams = exams.filter(e => e.type === type);
    if (status) exams = exams.filter(e => e.status === status);
    exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const summary = {
      total: exams.length,
      upcoming: exams.filter(e => e.status === 'upcoming').length,
      completed: exams.filter(e => e.status === 'completed').length,
      ongoing: exams.filter(e => e.status === 'ongoing').length,
    };

    let academicSession = '', term = '';
    try {
      const termRes = await sql`SELECT name FROM terms ORDER BY created_at DESC LIMIT 1`;
      if (termRes.rows[0]) {
        term = termRes.rows[0].name;
        const year = new Date().getFullYear();
        academicSession = `${year}/${year+1}`;
      }
    } catch (err) {
      // QUAL-02: previously silent — log so missing/misconfigured terms table is diagnosable
      console.warn('terms lookup failed; using fallback', err);
    }

    return res.status(200).json({ exams, summary, academicSession: academicSession || '2024/2025', term: term || 'First Term' } as ExamScheduleResponse);
  } catch (error) {
    console.error('Error fetching exam schedule:', error);
    return res.status(500).json({ error: 'Failed to fetch exam schedule' });
  }
}
