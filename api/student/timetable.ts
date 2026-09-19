import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
}

interface ExamSchedule {
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  room: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireRole(req, res, ['student']);
  if (!decoded) return;

  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  const tenantId = decoded.tenantId || 'default-tenant';

  try {

    const { termId } = req.query;

    // Get student's class
    const studentResult = await sql`
      SELECT class, arm FROM students WHERE id = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1
    `;
    if (!studentResult.rows[0]) return res.status(404).json({ error: 'Student not found' });
    const { class: studentClass, arm } = studentResult.rows[0];
    const className = `${studentClass}${arm ? arm : ''}`;

    // Terms come from Timetable & Scheduling (timetable_terms) — the single
    // source of truth. Resolve the requested term, else the one covering
    // today, else the earliest.
    const termRows = await sql`
      SELECT id::text, name, start_date::text AS start_date, end_date::text AS end_date
      FROM timetable_terms WHERE tenant_id = ${tenantId} ORDER BY start_date
    `;
    const availableTerms = termRows.rows.map(r => ({ id: r.id, name: r.name }));
    const today = new Date().toISOString().slice(0, 10);
    const resolvedTermId =
      (termId as string) ||
      termRows.rows.find(r => r.start_date <= today && today <= r.end_date)?.id ||
      termRows.rows[0]?.id ||
      null;

    // Resolve the student's class_id (classes.name + classes.arm)
    const classResult = await sql`
      SELECT id::text FROM classes
      WHERE tenant_id = ${tenantId}
        AND LOWER(name) = LOWER(${studentClass})
        AND LOWER(COALESCE(arm, '')) = LOWER(COALESCE(${arm ?? ''}, ''))
        AND deleted_at IS NULL
      LIMIT 1
    `;
    const classId = classResult.rows[0]?.id as string | undefined;

    // Primary source: Timetable & Scheduling tables
    let schedule: TimeSlot[] = [];
    if (classId && resolvedTermId) {
      const entriesResult = await sql`
        SELECT e.id::text, e.day_of_week, e.subject_name, e.teacher_name,
               COALESCE(e.room_id, '') AS room,
               ts.start_time::text AS start_time, ts.end_time::text AS end_time
        FROM timetable_class_schedule_entries e
        JOIN timetable_class_schedules s ON s.id = e.schedule_id
        JOIN timetable_time_slots ts ON ts.id = e.time_slot_id
        WHERE s.tenant_id = ${tenantId}
          AND s.class_id = ${classId}
          AND s.term_id = ${resolvedTermId}
        ORDER BY e.day_of_week, ts.start_time
      `;
      const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      schedule = entriesResult.rows.map(r => ({
        day: dayNames[r.day_of_week] || String(r.day_of_week),
        startTime: r.start_time,
        endTime: r.end_time,
        subject: r.subject_name,
        teacher: r.teacher_name,
        room: r.room,
      }));
    }

    // Legacy fallback: rows in the old flat `timetable` table (class_name string)
    if (schedule.length === 0) {
      const ttResult = await sql`
        SELECT tt.day, tt.start_time, tt.end_time, tt.subject, tt.room,
               COALESCE(st.name, '') AS teacher
        FROM timetable tt
        LEFT JOIN staff st ON st.id = tt.staff_id
        WHERE tt.class_name = ${className}
          AND tt.tenant_id = ${tenantId}
        ORDER BY tt.day, tt.start_time
      `;
      schedule = ttResult.rows.map(r => ({
        day: r.day,
        startTime: r.start_time,
        endTime: r.end_time,
        subject: r.subject,
        teacher: r.teacher,
        room: r.room,
      }));
    }

    // Fetch upcoming exams for this class
    const examResult = await sql`
      SELECT title AS subject, exam_date::text AS date,
             start_time, end_time, room,
             EXTRACT(EPOCH FROM (end_time::time - start_time::time))/60 AS duration
      FROM exams
      WHERE (student_class = ${studentClass} OR student_class IS NULL)
        AND tenant_id = ${tenantId}
        AND exam_date >= CURRENT_DATE
      ORDER BY exam_date, start_time
    `;

    const examSchedule: ExamSchedule[] = examResult.rows.map(r => ({
      subject: r.subject,
      date: r.date,
      startTime: r.start_time ?? '',
      endTime: r.end_time ?? '',
      duration: Number(r.duration ?? 0),
      room: r.room ?? '',
    }));

    const currentTerm = availableTerms.find(t => t.id === resolvedTermId)?.name || 'Current';
    return res.status(200).json({ schedule, examSchedule, termId: resolvedTermId ?? 'current', currentTerm, availableTerms });
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return res.status(500).json({ error: 'Failed to fetch timetable' });
  }
}
