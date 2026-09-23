import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from './_lib/db.js'
import { randomUUID } from 'crypto'
import { requireRole } from '../../_lib/auth-middleware.js'

interface SubjectConfig {
  subjectName: string
  subjectId?: string
  teacherId: string
  teacherName: string
  periodsPerWeek: number
}

function parseBody(req: ApiRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

function rowToEntry(r: any) {
  return {
    id: r.id,
    scheduleId: r.schedule_id,
    timeSlotId: r.time_slot_id,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
    roomId: r.room_id ?? undefined,
    dayOfWeek: Number(r.day_of_week),
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Require authentication - only staff or tenant_admin can access tenant timetable
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  const body = parseBody(req)
  if (!body) return res.status(400).json({ error: 'Request body is required' })

  const { classId, termId, subjects, clearExisting } = body as {
    classId: string
    termId: string
    subjects: SubjectConfig[]
    clearExisting?: boolean
  }

  if (!classId || !termId || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'classId, termId, and subjects array are required' })
  }

  try {
    // 1. Get or create the schedule
    let scheduleResult = await sql`SELECT * FROM timetable_class_schedules WHERE tenant_id = ${tenantId} AND class_id = ${classId} AND term_id = ${termId}`
    let scheduleId: string
    if (scheduleResult.rows[0]) {
      scheduleId = scheduleResult.rows[0].id
    } else {
      scheduleId = randomUUID()
      await sql`INSERT INTO timetable_class_schedules (id, tenant_id, class_id, term_id) VALUES (${scheduleId}, ${tenantId}, ${classId}, ${termId})`
    }

    // 2. Optionally clear existing entries
    if (clearExisting) {
      await sql`DELETE FROM timetable_class_schedule_entries WHERE schedule_id = ${scheduleId}`
    }

    // 3. Get existing entries
    const existingResult = await sql`SELECT * FROM timetable_class_schedule_entries WHERE schedule_id = ${scheduleId}`
    const existingEntries = existingResult.rows.map(rowToEntry)

    // 4. Get available time slots (non-break, ordered by sequence)
    const slotsResult = await sql`SELECT * FROM timetable_time_slots WHERE is_break = false AND tenant_id = ${tenantId} ORDER BY sequence`
    const timeSlots = slotsResult.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      startTime: r.start_time,
      endTime: r.end_time,
      sequence: Number(r.sequence),
      dayOfWeek: Number(r.day_of_week),
    }))

    // 5. Get all teacher assignments to check conflicts (scoped to this tenant
    // via the parent schedule — entries table has no tenant_id column)
    const teacherAssignmentsResult = await sql`
      SELECT e.teacher_id, e.time_slot_id, e.day_of_week
      FROM timetable_class_schedule_entries e
      JOIN timetable_class_schedules s ON s.id = e.schedule_id
      WHERE s.tenant_id = ${tenantId}`
    const teacherAssignments = teacherAssignmentsResult.rows.map((r: any) => ({
      teacherId: r.teacher_id,
      timeSlotId: r.time_slot_id,
      dayOfWeek: Number(r.day_of_week),
    }))

    // Build available slots matrix: slotId + dayOfWeek combinations
    // Each slot can be used on days 1-5 (Mon-Fri)
    const days = [1, 2, 3, 4, 5]
    const availableSlots: { slotId: string; dayOfWeek: number; sequence: number }[] = []
    for (const slot of timeSlots) {
      for (const day of days) {
        const isTaken = existingEntries.some(e => e.timeSlotId === slot.id && e.dayOfWeek === day)
        const teacherConflict = false // checked per-subject later
        if (!isTaken) {
          availableSlots.push({ slotId: slot.id, dayOfWeek: day, sequence: slot.sequence })
        }
      }
    }

    // Sort by day then period so round-robin placement spreads each subject
    // across different days and periods rather than stacking one period daily
    availableSlots.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
      return a.sequence - b.sequence
    })

    const createdEntries: any[] = []
    const failedSubjects: { subjectName: string; reason: string }[] = []

    const takenClassSlots = new Set(existingEntries.map(e => `${e.timeSlotId}|${e.dayOfWeek}`))
    const busyTeacherSlots = new Set(teacherAssignments.map(ta => `${ta.teacherId}|${ta.timeSlotId}|${ta.dayOfWeek}`))
    const subjectDayCount = new Map<string, number>()

    const hashCode = (s: string) => {
      let h = 0
      for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
      return h
    }

    // 6. Assign periods round-robin: every subject gets one slot per pass so
    // a full grid starves subjects evenly instead of the first subjects in
    // the list consuming everything.
    const seenSubjects = new Set<string>()
    const queue = subjects
      .filter(s => {
        const key = (s.subjectName || '').toLowerCase().trim()
        if (seenSubjects.has(key)) return false
        seenSubjects.add(key)
        return true
      })
      .map(s => ({
        ...s,
        needed: Math.max(1, Math.min(s.periodsPerWeek, 10)),
        assigned: 0,
      }))

    let placedThisPass = true
    while (placedThisPass) {
      placedThisPass = false
      for (const subject of queue) {
        if (subject.assigned >= subject.needed) continue
        const perDayCap = Math.ceil(subject.needed / days.length)

        // Rotate the scan start per subject so different subjects prefer
        // different days/periods instead of all landing Monday morning.
        const offset = availableSlots.length === 0 ? 0
          : Math.abs(hashCode(`${classId}|${subject.subjectName}`)) % availableSlots.length
        for (let i = 0; i < availableSlots.length; i++) {
          const slot = availableSlots[(i + offset) % availableSlots.length]
          const classKey = `${slot.slotId}|${slot.dayOfWeek}`
          if (takenClassSlots.has(classKey)) continue
          if (busyTeacherSlots.has(`${subject.teacherId}|${slot.slotId}|${slot.dayOfWeek}`)) continue

          const dayKey = `${subject.subjectName}|${slot.dayOfWeek}`
          if ((subjectDayCount.get(dayKey) || 0) >= perDayCap) continue

          const entryId = randomUUID()
          await sql`
            INSERT INTO timetable_class_schedule_entries
            (id, schedule_id, time_slot_id, subject_id, subject_name, teacher_id, teacher_name, room_id, day_of_week)
            VALUES (
              ${entryId}, ${scheduleId}, ${slot.slotId},
              ${subject.subjectId || subject.subjectName}, ${subject.subjectName},
              ${subject.teacherId}, ${subject.teacherName},
              NULL, ${slot.dayOfWeek}
            )
          `

          createdEntries.push({
            id: entryId,
            scheduleId,
            timeSlotId: slot.slotId,
            subjectName: subject.subjectName,
            teacherId: subject.teacherId,
            teacherName: subject.teacherName,
            dayOfWeek: slot.dayOfWeek,
          })

          takenClassSlots.add(classKey)
          busyTeacherSlots.add(`${subject.teacherId}|${slot.slotId}|${slot.dayOfWeek}`)
          subjectDayCount.set(dayKey, (subjectDayCount.get(dayKey) || 0) + 1)
          subject.assigned++
          placedThisPass = true
          break
        }
      }
    }

    const freeClassSlots = availableSlots.filter(s => !takenClassSlots.has(`${s.slotId}|${s.dayOfWeek}`))
    for (const subject of queue) {
      if (subject.assigned >= subject.needed) continue
      failedSubjects.push({
        subjectName: subject.subjectName,
        reason: freeClassSlots.length === 0
          ? `Only assigned ${subject.assigned}/${subject.needed} periods — weekly grid is full (${availableSlots.length} slots). Add teaching periods in Timetable → Time Slots or reduce periods per subject`
          : `Only assigned ${subject.assigned}/${subject.needed} periods — ${subject.teacherName || 'the assigned teacher'} is booked in every remaining slot (teacher conflict)`,
      })
    }

    return res.status(200).json({
      data: {
        scheduleId,
        created: createdEntries.length,
        entries: createdEntries,
        failed: failedSubjects,
        capacity: availableSlots.length,
        requested: queue.reduce((sum, s) => sum + s.needed, 0),
      },
    })
  } catch (error: any) {
    console.error('Auto-schedule error:', error)
    return res.status(500).json({ error: 'Failed to auto-schedule', details: error.message })
  }
}
