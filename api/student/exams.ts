import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
    const studentRes = await sql`SELECT class FROM students WHERE id = ${studentId} AND tenant_id = ${decoded.tenantId || 'default-tenant'} AND deleted_at IS NULL LIMIT 1`;
    const studentClass = studentRes.rows[0]?.class || '';

    // Base class lets a 'JSS 1' exam cover arm-specific students ('JSS 1 A')
    // without leaking 'JSS 1 A' exams to 'JSS 1 B'.
    const studentClassBase = studentClass.replace(/\s+[A-Z]$/, '');

    const examResult = await sql`SELECT id::text, COALESCE(subject, title) AS subject, COALESCE(description, '') AS paper,
      scheduled_date::text AS date, scheduled_time::text AS start_time,
      duration AS duration_minutes, COALESCE(class, '') AS student_class
      FROM exams
      WHERE tenant_id = ${decoded.tenantId || 'default-tenant'}
        AND deleted_at IS NULL
        AND status IN ('Scheduled', 'Ongoing', 'Completed')
        AND (class = ${studentClass} OR class = ${studentClassBase} OR class IS NULL OR class = '')
      ORDER BY scheduled_date, scheduled_time`;

    const now = new Date();
    let exams: Exam[] = examResult.rows.map(r => {
      const examDate = new Date(`${r.date}T${r.start_time || '00:00'}`);
      const examEnd = new Date(examDate.getTime() + (Number(r.duration_minutes) || 0) * 60000);
      let examStatus: Exam['status'];
      if (now < examDate) examStatus = 'upcoming';
      else if (now >= examDate && now <= examEnd) examStatus = 'ongoing';
      else examStatus = 'completed';
      const start = r.start_time ? r.start_time.slice(0,5) : '';
      const end = r.start_time
        ? examEnd.toTimeString().slice(0,5)
        : '';
      const diffM = Number(r.duration_minutes) || 0;
      const durationStr = diffM >= 60 ? `${Math.floor(diffM/60)}h ${diffM%60}m` : `${diffM} mins`;
      return {
        id: r.id, subject: r.subject, paper: r.paper, date: r.date,
        startTime: start, endTime: end, duration: durationStr,
        venue: '', type: 'terminal' as Exam['type'],
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

    // Session/term from Timetable & Scheduling — the single source of truth.
    let academicSession = '', term = '';
    try {
      const today = new Date().toISOString().slice(0, 10);
      const termRes = await sql`
        SELECT name, academic_year FROM timetable_terms
        WHERE tenant_id = ${decoded.tenantId || 'default-tenant'}
        ORDER BY (start_date <= ${today} AND ${today} <= end_date) DESC, start_date ASC
        LIMIT 1`;
      if (termRes.rows[0]) {
        term = termRes.rows[0].name;
        academicSession = termRes.rows[0].academic_year;
      }
    } catch (err) {
      console.warn('timetable_terms lookup failed', err);
    }

    return res.status(200).json({ exams, summary, academicSession, term } as ExamScheduleResponse);
  } catch (error) {
    console.error('Error fetching exam schedule:', error);
    return res.status(500).json({ error: 'Failed to fetch exam schedule' });
  }
}
