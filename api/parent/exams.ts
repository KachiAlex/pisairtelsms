import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { verifyParentChildAccess } from './_lib/verify-child.js';

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
  score?: number | null;
  totalMarks?: number | null;
  percentage?: number | null;
  resultStatus?: string | null;
  submittedAt?: string | null;
}

interface ExamsResponse {
  exams: Exam[];
  summary: {
    total: number;
    upcoming: number;
    completed: number;
    ongoing: number;
  };
  academicSession: string;
  term: string;
  childName: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['parent']);
  if (!decoded) return;
  const parentId = decoded.parentId!;
  const childrenIds = decoded.childrenIds || [];

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { childId, status } = req.query;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    // Verify parent-child relationship (SEC-05)
    if (!await verifyParentChildAccess(parentId, childId as string, decoded.tenantId || 'default-tenant')) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this child' });
    }

    const tenantId = decoded.tenantId || 'default-tenant';
    const childRes = await sql`SELECT name, class FROM students WHERE id = ${childId as string} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1`;
    const childName = childRes.rows[0]?.name || '';
    const studentClass = childRes.rows[0]?.class || '';

    const studentClassBase = studentClass.replace(/\s+[A-Z]$/, '');

    const examResult = await sql`SELECT e.id::text, COALESCE(e.subject, e.title) AS subject, COALESCE(e.description, '') AS paper,
      e.scheduled_date::text AS date, e.scheduled_time::text AS start_time,
      e.duration AS duration_minutes, COALESCE(e.class, '') AS student_class,
      er.score, er.total_marks, er.percentage, er.status AS result_status, er.submitted_at::text AS submitted_at
      FROM exams e
      LEFT JOIN exam_results er ON er.exam_id = e.id AND er.student_id = ${childId as string}
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.status IN ('Scheduled', 'Ongoing', 'Completed')
        AND (e.class = ${studentClass} OR e.class = ${studentClassBase} OR e.class IS NULL OR e.class = '')
      ORDER BY e.scheduled_date, e.scheduled_time`;

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
      const durationStr = diffM >= 60 ? `${Math.floor(diffM/60)} hour${Math.floor(diffM/60)>1?'s':''}` : `${diffM} mins`;
      return {
        id: r.id, subject: r.subject, paper: r.paper, date: r.date,
        startTime: start, endTime: end, duration: durationStr,
        venue: '', type: 'terminal' as Exam['type'],
        status: examStatus, instructions: '', materialsAllowed: [],
        score: r.score ?? null,
        totalMarks: r.total_marks ?? null,
        percentage: r.percentage ?? null,
        resultStatus: r.result_status ?? null,
        submittedAt: r.submitted_at ?? null,
      };
    });

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

    const response: ExamsResponse = {
      exams, summary,
      academicSession,
      term,
      childName,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return res.status(500).json({ error: 'Failed to fetch exam schedule' });
  }
}
