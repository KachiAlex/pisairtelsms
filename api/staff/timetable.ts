import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface ScheduleEntry {
  id: string;
  dayOfWeek: number;
  slotName: string;
  sequence: number;
  timeSlot: string;
  subject: string;
  className: string;
  room: string;
  startTime: string;
  endTime: string;
}

interface ExamEntry {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  duration: number;
}

interface Term {
  id: string;
  name: string;
}

interface StaffTimetableResponse {
  schedule: ScheduleEntry[];
  examSchedule: ExamEntry[];
  currentTerm: string;
  availableTerms: Term[];
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
    if (!decoded) return;
    const staffId = decoded.staffId || decoded.userId;
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    const tenantId = decoded.tenantId || 'default-tenant';

    // Terms come from Timetable & Scheduling (timetable_terms) — the single
    // source of truth. Honor ?termId=, else the term covering today, else first.
    const requestedTermId = req.query.termId as string | undefined;
    let availableTerms: Term[] = [];
    let resolvedTermId: string | null = null;
    try {
      const termResult = await sql`
        SELECT id::text, name, start_date::text AS start_date, end_date::text AS end_date
        FROM timetable_terms WHERE tenant_id = ${tenantId} ORDER BY start_date`;
      availableTerms = termResult.rows.map(r => ({ id: r.id, name: r.name }));
      const today = new Date().toISOString().slice(0, 10);
      const active = termResult.rows.find(r => r.start_date <= today && today <= r.end_date);
      resolvedTermId = requestedTermId || active?.id || availableTerms[0]?.id || null;
    } catch (termErr) {
      console.error('Terms query error:', termErr);
    }
    const currentTerm = resolvedTermId || '';

    let schedule: ScheduleEntry[] = [];
    // Primary source: class schedule entries written by Timetable & Scheduling
    try {
      const tsResult = await sql`
        SELECT e.id::text, e.day_of_week, e.subject_name, e.room_id,
               t.name AS slot_name, t.sequence,
               COALESCE(c.name || COALESCE(' ' || NULLIF(c.arm, ''), ''), '') AS class_name,
               t.start_time::text AS start_time, t.end_time::text AS end_time
        FROM timetable_class_schedule_entries e
        JOIN timetable_class_schedules s ON s.id = e.schedule_id
        JOIN timetable_time_slots t ON t.id = e.time_slot_id
        LEFT JOIN classes c ON c.id::text = s.class_id::text
        WHERE e.teacher_id = ${staffId}
          AND s.tenant_id = ${tenantId}
          AND s.status = 'published'
          AND (${resolvedTermId}::text IS NULL OR s.term_id = ${resolvedTermId})
        ORDER BY e.day_of_week, t.sequence
      `;
      schedule = tsResult.rows.map(r => ({
        id: r.id,
        dayOfWeek: Number(r.day_of_week),
        slotName: r.slot_name || '',
        sequence: Number(r.sequence ?? 0),
        timeSlot: `${String(r.start_time).slice(0, 5)} - ${String(r.end_time).slice(0, 5)}`,
        subject: r.subject_name,
        className: r.class_name,
        room: r.room_id || '',
        startTime: String(r.start_time).slice(0, 5),
        endTime: String(r.end_time).slice(0, 5),
      }));
    } catch (tsErr) {
      console.error('Teacher schedule query error:', tsErr);
    }

    // The legacy flat `timetable` table is empty and has no tenant_id — no fallback.

    let examSchedule: ExamEntry[] = [];
    try {
      const examResult = await sql`
        SELECT e.id::text, COALESCE(e.subject, e.title) AS subject,
               e.scheduled_date::text AS date, e.scheduled_time::text AS time,
               '' AS room, COALESCE(e.duration, 0) AS duration
        FROM exams e
        WHERE e.scheduled_date >= CURRENT_DATE
          AND e.tenant_id = ${tenantId}
          AND e.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM timetable_class_schedule_entries en
            JOIN timetable_class_schedules sc ON sc.id = en.schedule_id
            WHERE en.teacher_id = ${staffId}
              AND sc.tenant_id = ${tenantId}
              AND COALESCE(e.subject, e.title) IS NOT NULL
              AND LOWER(en.subject_name) = LOWER(COALESCE(e.subject, e.title))
          )
        ORDER BY e.scheduled_date, e.scheduled_time
      `;
      examSchedule = examResult.rows.map(r => ({
        id: r.id, subject: r.subject, date: r.date,
        time: r.time ?? '', room: r.room ?? '', duration: Number(r.duration ?? 0),
      }));
    } catch (examErr) {
      console.error('Exam query error:', examErr);
    }

    return res.status(200).json({ schedule, examSchedule, currentTerm, availableTerms });
  } catch (error) {
    console.error('Error fetching staff timetable:', error);
    return res.status(500).json({ error: 'Failed to fetch timetable data' });
  }
}
