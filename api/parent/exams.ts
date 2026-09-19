import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { verifyParentChildRelationship } from '../../src/lib/parentAuth';

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
    if (!verifyParentChildRelationship(parentId, childId as string, childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this child' });
    }

    const tenantId = decoded.tenantId || 'default-tenant';
    const childRes = await sql`SELECT name, class FROM students WHERE id = ${childId as string} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1`;
    const childName = childRes.rows[0]?.name || '';
    const studentClass = childRes.rows[0]?.class || '';

    const examResult = await sql`SELECT id::text, title AS subject, COALESCE(description, '') AS paper,
      exam_date::text AS date, start_time::text AS start_time, end_time::text AS end_time,
      room AS venue, COALESCE(student_class, '') AS student_class
      FROM exams
      WHERE tenant_id = ${tenantId}
        AND (student_class = ${studentClass} OR student_class IS NULL)
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
        durationStr = diffH > 0 ? `${diffH} hour${diffH>1?'s':''}` : `${diffM} mins`;
      }
      return {
        id: r.id, subject: r.subject, paper: r.paper, date: r.date,
        startTime: start, endTime: end, duration: durationStr,
        venue: r.venue || '', type: 'terminal' as Exam['type'],
        status: examStatus, instructions: '', materialsAllowed: [],
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
