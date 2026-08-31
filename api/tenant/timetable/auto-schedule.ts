import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './_lib/db.js'
import { randomUUID } from 'crypto'
import { requireRole } from '../../_lib/auth-middleware.js'
import { enforcePlan } from '../../_lib/plan-middleware.js'

interface SubjectConfig {
  subjectName: string
  teacherId: string
  teacherName: string
  periodsPerWeek: number
}

function parseBody(req: VercelRequest) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant timetable
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const allowed = await enforcePlan(req, res, 'scheduling', 'autoGeneration')
  if (!allowed) return

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
    const slotsResult = await sql`SELECT * FROM timetable_time_slots WHERE is_break = false ORDER BY sequence`
    const timeSlots = slotsResult.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      startTime: r.start_time,
      endTime: r.end_time,
      sequence: Number(r.sequence),
      dayOfWeek: Number(r.day_of_week),
    }))

    // 5. Get all teacher assignments to check conflicts
    const teacherAssignmentsResult = await sql`SELECT teacher_id, time_slot_id, day_of_week FROM timetable_class_schedule_entries`
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

    // Sort by sequence then day to get a nice distribution
    availableSlots.sort((a, b) => {
      if (a.sequence !== b.sequence) return a.sequence - b.sequence
      return a.dayOfWeek - b.dayOfWeek
    })

    const createdEntries: any[] = []
    const failedSubjects: { subjectName: string; reason: string }[] = []

    // 6. Assign each subject's periods
    for (const subject of subjects) {
      const needed = Math.max(1, Math.min(subject.periodsPerWeek, 10))
      let assigned = 0

      for (const slot of availableSlots) {
        if (assigned >= needed) break

        // Check teacher availability
        const teacherBusy = teacherAssignments.some(
          ta => ta.teacherId === subject.teacherId && ta.timeSlotId === slot.slotId && ta.dayOfWeek === slot.dayOfWeek
        ) || createdEntries.some(
          e => e.teacherId === subject.teacherId && e.timeSlotId === slot.slotId && e.dayOfWeek === slot.dayOfWeek
        )

        if (teacherBusy) continue

        // Check class slot not already taken by another subject in this batch
        const classSlotTaken = createdEntries.some(
          e => e.scheduleId === scheduleId && e.timeSlotId === slot.slotId && e.dayOfWeek === slot.dayOfWeek
        )
        if (classSlotTaken) continue

        const entryId = randomUUID()
        await sql`
          INSERT INTO timetable_class_schedule_entries
          (id, schedule_id, time_slot_id, subject_id, subject_name, teacher_id, teacher_name, room_id, day_of_week)
          VALUES (
            ${entryId}, ${scheduleId}, ${slot.slotId},
            ${subject.teacherId}, ${subject.subjectName},
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

        teacherAssignments.push({
          teacherId: subject.teacherId,
          timeSlotId: slot.slotId,
          dayOfWeek: slot.dayOfWeek,
        })

        assigned++
      }

      if (assigned < needed) {
        failedSubjects.push({
          subjectName: subject.subjectName,
          reason: `Only assigned ${assigned}/${needed} periods (insufficient slots or teacher conflicts)`,
        })
      }
    }

    return res.status(200).json({
      data: {
        scheduleId,
        created: createdEntries.length,
        entries: createdEntries,
        failed: failedSubjects,
      },
    })
  } catch (error: any) {
    console.error('Auto-schedule error:', error)
    return res.status(500).json({ error: 'Failed to auto-schedule', details: error.message })
  }
}
