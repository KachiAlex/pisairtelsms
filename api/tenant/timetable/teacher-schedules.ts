import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from './_lib/db.js'
import { requireRole } from '../../_lib/auth-middleware.js'

// Teacher schedules are derived from timetable_class_schedule_entries — the
// single source of truth written by auto-schedule and manual entry. The
// timetable_teacher_schedules table is not populated by any write path.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const { method, query } = req

  if (method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const teacherId = query.teacherId as string | undefined
  const termId = query.termId as string | undefined

  try {
    if (teacherId) {
      // Aggregated workload for one teacher
      const result = await sql`
        SELECT s.class_id,
               COALESCE(c.name || COALESCE(' ' || NULLIF(c.arm, ''), ''), s.class_id::text) AS class_name,
               e.subject_name,
               array_agg(DISTINCT e.day_of_week ORDER BY e.day_of_week) AS days,
               COALESCE(SUM(EXTRACT(EPOCH FROM (t.end_time::time - t.start_time::time)) / 3600.0), 0) AS hours
        FROM timetable_class_schedule_entries e
        JOIN timetable_class_schedules s ON s.id = e.schedule_id
        JOIN timetable_time_slots t ON t.id = e.time_slot_id
        LEFT JOIN classes c ON c.id::text = s.class_id::text
        WHERE e.teacher_id = ${teacherId}
          AND s.tenant_id = ${tenantId}
          AND (${termId ?? null}::text IS NULL OR s.term_id = ${termId ?? null})
        GROUP BY s.class_id, class_name, e.subject_name
        ORDER BY class_name, e.subject_name
      `
      const workload = result.rows.map((r: any, i: number) => ({
        id: `${teacherId}-${i}`,
        classId: r.class_id,
        className: r.class_name,
        subjectName: r.subject_name,
        hoursPerWeek: Math.round(Number(r.hours) * 10) / 10,
        days: (r.days || []).map(Number),
      }))
      const totals = await sql`
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (t.end_time::time - t.start_time::time)) / 3600.0), 0) AS total_hours,
               COUNT(DISTINCT s.class_id) AS total_classes,
               MAX(e.teacher_name) AS teacher_name
        FROM timetable_class_schedule_entries e
        JOIN timetable_class_schedules s ON s.id = e.schedule_id
        JOIN timetable_time_slots t ON t.id = e.time_slot_id
        WHERE e.teacher_id = ${teacherId}
          AND s.tenant_id = ${tenantId}
          AND (${termId ?? null}::text IS NULL OR s.term_id = ${termId ?? null})
      `
      const t = totals.rows[0] || {}
      const sessionsResult = await sql`
        SELECT e.id::text, e.day_of_week, e.subject_name, e.room_id,
               t.id::text AS slot_id, t.name AS slot_name, t.sequence,
               t.start_time::text AS start_time, t.end_time::text AS end_time,
               COALESCE(c.name || COALESCE(' ' || NULLIF(c.arm, ''), ''), s.class_id::text) AS class_name
        FROM timetable_class_schedule_entries e
        JOIN timetable_class_schedules s ON s.id = e.schedule_id
        JOIN timetable_time_slots t ON t.id = e.time_slot_id
        LEFT JOIN classes c ON c.id::text = s.class_id::text
        WHERE e.teacher_id = ${teacherId}
          AND s.tenant_id = ${tenantId}
          AND (${termId ?? null}::text IS NULL OR s.term_id = ${termId ?? null})
        ORDER BY t.sequence, e.day_of_week
      `
      const sessions = sessionsResult.rows.map((r: any) => ({
        id: r.id,
        dayOfWeek: Number(r.day_of_week),
        slotId: r.slot_id,
        slotName: r.slot_name,
        sequence: Number(r.sequence),
        startTime: String(r.start_time).slice(0, 5),
        endTime: String(r.end_time).slice(0, 5),
        subjectName: r.subject_name,
        className: r.class_name,
        roomId: r.room_id || '',
      }))
      return res.status(200).json({
        data: {
          teacherId,
          teacherName: t.teacher_name || '',
          termId: termId || null,
          totalHours: Math.round(Number(t.total_hours || 0) * 10) / 10,
          totalClasses: Number(t.total_classes || 0),
          maxHoursLimit: null,
          workload,
          sessions,
        },
      })
    }

    // Per-teacher summary across the tenant
    const summary = await sql`
      SELECT e.teacher_id,
             MAX(e.teacher_name) AS teacher_name,
             COUNT(DISTINCT s.class_id) AS total_classes,
             COALESCE(SUM(EXTRACT(EPOCH FROM (t.end_time::time - t.start_time::time)) / 3600.0), 0) AS total_hours
      FROM timetable_class_schedule_entries e
      JOIN timetable_class_schedules s ON s.id = e.schedule_id
      JOIN timetable_time_slots t ON t.id = e.time_slot_id
      WHERE s.tenant_id = ${tenantId}
        AND (${termId ?? null}::text IS NULL OR s.term_id = ${termId ?? null})
      GROUP BY e.teacher_id
      ORDER BY teacher_name
    `
    return res.status(200).json({
      data: summary.rows.map((r: any) => ({
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        totalClasses: Number(r.total_classes),
        totalHours: Math.round(Number(r.total_hours) * 10) / 10,
      })),
    })
  } catch (error) {
    console.error('Teacher schedules error:', error)
    return res.status(500).json({ error: 'Failed to load teacher schedules' })
  }
}
