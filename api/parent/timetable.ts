import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const tenantId = decoded.tenantId || 'default-tenant'

    const childId = req.query.childId as string
    const termId = req.query.termId as string

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const dayOrder: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 }

    const childRow = await sql`SELECT class, arm FROM students WHERE id = ${childId} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1`
    if (!childRow.rows[0]) return res.status(404).json({ error: 'Child not found' })
    const { class: studentClass, arm } = childRow.rows[0]
    const className = `${studentClass}${arm ?? ''}`

    // Terms come from Timetable & Scheduling (timetable_terms) — the single
    // source of truth. Resolve the requested term, else the one covering
    // today, else the earliest.
    const termRows = await sql`
      SELECT id::text, name, start_date::text AS start_date, end_date::text AS end_date
      FROM timetable_terms WHERE tenant_id = ${tenantId} ORDER BY start_date
    `
    const availableTerms = termRows.rows.map(r => ({
      id: r.id, name: r.name, startDate: r.start_date, endDate: r.end_date,
    }))
    const today = new Date().toISOString().slice(0, 10)
    const resolvedTermId =
      termId ||
      termRows.rows.find(r => r.start_date <= today && today <= r.end_date)?.id ||
      termRows.rows[0]?.id ||
      null
    const currentTerm = availableTerms.find(t => t.id === resolvedTermId)?.name || 'Current'

    // Resolve the child's class_id (classes.name + classes.arm)
    const classResult = await sql`
      SELECT id::text FROM classes
      WHERE tenant_id = ${tenantId}
        AND LOWER(name) = LOWER(${studentClass})
        AND LOWER(COALESCE(arm, '')) = LOWER(COALESCE(${arm ?? ''}, ''))
        AND deleted_at IS NULL
      LIMIT 1
    `
    const classId = classResult.rows[0]?.id as string | undefined

    // Primary source: Timetable & Scheduling tables
    let schedule: { id: string; dayOfWeek: number; timeSlot: string; subject: string; teacher: string; room: string; startTime: string; endTime: string }[] = []
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
      `
      schedule = entriesResult.rows.map(r => ({
        id: r.id, dayOfWeek: Number(r.day_of_week),
        timeSlot: `${r.start_time}-${r.end_time}`,
        subject: r.subject_name, teacher: r.teacher_name, room: r.room,
        startTime: r.start_time, endTime: r.end_time,
      }))
    }

    // Legacy fallback: rows in the old flat `timetable` table (class_name string)
    if (schedule.length === 0) {
      const ttResult = await sql`
        SELECT tt.id::text, tt.day, tt.start_time, tt.end_time,
               tt.start_time || '-' || tt.end_time AS time_slot,
               tt.subject, tt.room,
               COALESCE(st.name, '') AS teacher
        FROM timetable tt
        LEFT JOIN staff st ON st.id = tt.staff_id
        WHERE tt.class_name = ${className}
          AND tt.tenant_id = ${tenantId}
        ORDER BY tt.day, tt.start_time
      `
      schedule = ttResult.rows.map(r => ({
        id: r.id, dayOfWeek: dayOrder[r.day?.toLowerCase()] ?? 0,
        timeSlot: r.time_slot, subject: r.subject, teacher: r.teacher, room: r.room,
        startTime: r.start_time, endTime: r.end_time,
      }))
    }

    const examResult = await sql`
      SELECT id::text, title AS subject, exam_date::text AS date, start_time AS time, room,
             EXTRACT(EPOCH FROM (end_time::time - start_time::time))/60 AS duration
      FROM exams
      WHERE (student_class = ${studentClass} OR student_class IS NULL)
        AND tenant_id = ${tenantId}
        AND exam_date >= CURRENT_DATE
      ORDER BY exam_date, start_time
    `

    const examSchedule = examResult.rows.map(r => ({
      id: r.id, subject: r.subject, date: r.date, time: r.time ?? '',
      room: r.room ?? '', duration: Number(r.duration ?? 0), invigilator: '',
    }))

    return res.status(200).json({
      schedule, examSchedule,
      currentTerm,
      currentTermId: resolvedTermId,
      availableTerms,
      terms: availableTerms,
      holidays: [],
    })
  } catch (error) {
    console.error('Error fetching timetable:', error)
    return res.status(500).json({ error: 'Failed to fetch timetable data' })
  }
}
