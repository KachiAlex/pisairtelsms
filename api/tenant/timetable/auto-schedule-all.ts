import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from './_lib/db.js'
import { randomUUID } from 'crypto'
import { requireRole } from '../../_lib/auth-middleware.js'
import { detectConflicts } from './_lib/conflicts.js'

interface SubjectNeed {
  subjectName: string
  subjectId?: string
  teacherId: string
  teacherName: string
  isCore: boolean
  needed: number
  assigned: number
  teacherAssigned: boolean
}

interface ClassPlan {
  classId: string
  className: string
  scheduleId: string
  queue: SubjectNeed[]
  takenSlots: Set<string> // `${slotId}|${day}`
  dayCounts: Map<string, number> // `${subjectName}|${day}`
  freeSlots: { slotId: string; dayOfWeek: number; sequence: number }[]
}

const DAYS = [1, 2, 3, 4, 5]
const norm = (s: string) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const hashCode = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return h
}

function parseBody(req: ApiRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

// Distribute `capacity` periods across subjects fairly: 1 minimum each, then
// round-robin weighted toward Core subjects up to their desired load.
function allocatePeriods(subjects: { isCore: boolean; desired: number }[], capacity: number): number[] {
  const allocs = subjects.map(s => s.desired)
  if (allocs.reduce((a, b) => a + b, 0) <= capacity) return allocs
  for (let i = 0; i < allocs.length; i++) allocs[i] = 1
  let remaining = capacity - allocs.length
  const order = subjects.map((_, i) => i).sort((a, b) => Number(subjects[b].isCore) - Number(subjects[a].isCore))
  let progressed = true
  while (remaining > 0 && progressed) {
    progressed = false
    for (const i of order) {
      if (remaining <= 0) break
      if (allocs[i] < subjects[i].desired) { allocs[i]++; remaining--; progressed = true }
    }
  }
  return allocs
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'
  const body = parseBody(req)
  if (!body) return res.status(400).json({ error: 'Request body is required' })

  const { termId, classIds, clearExisting } = body as {
    termId?: string
    classIds?: string[]
    clearExisting?: boolean
  }
  if (!termId) return res.status(400).json({ error: 'termId is required' })

  try {
    // --- Load inputs -------------------------------------------------------
    const [classRows, matrixRows, subjectRows, staffRows, slotRows, scheduleRows] = await Promise.all([
      sql`SELECT id::text, name, COALESCE(arm, '') AS arm FROM classes WHERE tenant_id = ${tenantId} AND deleted_at IS NULL ORDER BY name, arm`,
      sql`SELECT class, subject, teacher, coverage FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}`,
      sql`SELECT id::text, name, type FROM subjects WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`,
      sql`SELECT id::text, name FROM staff WHERE tenant_id = ${tenantId}`,
      sql`SELECT id::text, sequence FROM timetable_time_slots WHERE tenant_id = ${tenantId} AND is_break = false ORDER BY sequence`,
      sql`SELECT id, class_id FROM timetable_class_schedules WHERE tenant_id = ${tenantId} AND term_id = ${termId}`,
    ])

    const targetClasses = classRows.rows.filter((c: any) => !classIds?.length || classIds.includes(c.id))
    if (targetClasses.length === 0) {
      return res.status(400).json({ error: 'No classes found to schedule' })
    }
    if (slotRows.rows.length === 0) {
      return res.status(400).json({ error: 'No teaching time slots configured — add them in Timetable → Time Slots first' })
    }

    // Lookups
    const subjectByName = new Map(subjectRows.rows.map((s: any) => [norm(s.name), s]))
    const staffIdByName = new Map(staffRows.rows.map((s: any) => [norm(s.name), s.id]))

    // A matrix row may name a level ("JSS 1" → every arm class of that level)
    // or a specific class ("JSS 1 B" / "JSS 1B" → just that arm). Try the
    // specific name+arm match first so explicit rows win over level rows.
    const classesForMatrixClass = (mClass: string): any[] => {
      const key = norm(mClass)
      const exact = targetClasses.filter((c: any) =>
        c.arm && (norm(`${c.name} ${c.arm}`) === key || norm(`${c.name}${c.arm}`) === key))
      if (exact.length > 0) return exact
      return targetClasses.filter((c: any) => norm(c.name) === key)
    }

    const matrixByClass = new Map<string, any[]>() // classId -> matrix rows
    for (const m of matrixRows.rows) {
      for (const cls of classesForMatrixClass(m.class)) {
        const list = matrixByClass.get(cls.id) || []
        list.push(m)
        matrixByClass.set(cls.id, list)
      }
    }

    // --- Clear / load existing state ---------------------------------------
    const scheduleIdByClass = new Map(scheduleRows.rows.map((s: any) => [s.class_id, s.id]))
    if (clearExisting) {
      for (const sid of scheduleIdByClass.values()) {
        await sql`DELETE FROM timetable_class_schedule_entries WHERE schedule_id = ${sid}`
      }
    }

    const existingEntries = await sql`
      SELECT e.schedule_id, e.teacher_id, e.time_slot_id, e.day_of_week
      FROM timetable_class_schedule_entries e
      JOIN timetable_class_schedules s ON s.id = e.schedule_id
      WHERE s.tenant_id = ${tenantId} AND s.term_id = ${termId}`

    // Global teacher pool: a teacher cannot be in two classes at once.
    const busyTeacherSlots = new Set(
      existingEntries.rows
        .filter((e: any) => e.teacher_id)
        .map((e: any) => `${e.teacher_id}|${e.time_slot_id}|${e.day_of_week}`)
    )
    const entriesBySchedule = new Map<string, Set<string>>()
    for (const e of existingEntries.rows) {
      const set = entriesBySchedule.get(e.schedule_id) || new Set<string>()
      set.add(`${e.time_slot_id}|${e.day_of_week}`)
      entriesBySchedule.set(e.schedule_id, set)
    }

    // --- Build per-class plans ----------------------------------------------
    const plans: ClassPlan[] = []
    const skipped: { className: string; reason: string }[] = []
    const uncovered: { className: string; subjectName: string }[] = []

    for (const cls of targetClasses) {
      const className = `${cls.name}${cls.arm ? ` ${cls.arm}` : ''}`
      const matrix = matrixByClass.get(cls.id)
      if (!matrix || matrix.length === 0) {
        skipped.push({ className, reason: 'No teacher allocations defined — set them up in Teacher Allocation first' })
        continue
      }

      // Resolve schedule row (create as draft if missing)
      let scheduleId = scheduleIdByClass.get(cls.id)
      if (!scheduleId) {
        scheduleId = randomUUID()
        await sql`INSERT INTO timetable_class_schedules (id, tenant_id, class_id, term_id, status) VALUES (${scheduleId}, ${tenantId}, ${cls.id}, ${termId}, 'draft')`
        scheduleIdByClass.set(cls.id, scheduleId)
      }

      const taken = entriesBySchedule.get(scheduleId) || new Set<string>()
      const freeSlots: ClassPlan['freeSlots'] = []
      for (const slot of slotRows.rows) {
        for (const day of DAYS) {
          if (!taken.has(`${slot.id}|${day}`)) {
            freeSlots.push({ slotId: slot.id, dayOfWeek: day, sequence: Number(slot.sequence) })
          }
        }
      }
      freeSlots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.sequence - b.sequence)

      // Level rows and arm-specific rows can both match a class — place each
      // subject once, preferring rows that actually name a teacher.
      const seenSubjects = new Set<string>()
      const dedupedMatrix = [...matrix]
        .sort((a: any, b: any) => Number(!!b.teacher) - Number(!!a.teacher))
        .filter((m: any) => {
          const key = norm(m.subject)
          if (seenSubjects.has(key)) return false
          seenSubjects.add(key)
          return true
        })

      const reqs = dedupedMatrix.map((m: any) => {
        const catalog = subjectByName.get(norm(m.subject))
        const teacherId = m.teacher ? (staffIdByName.get(norm(m.teacher)) || m.teacher) : ''
        const teacherAssigned = !!(m.teacher && String(m.teacher).trim()) && m.coverage !== 'Open'
        if (!teacherAssigned) uncovered.push({ className, subjectName: m.subject })
        return {
          subjectName: m.subject,
          subjectId: catalog?.id,
          teacherId,
          teacherName: m.teacher || 'Unassigned',
          isCore: catalog?.type === 'Core',
          desired: catalog?.type === 'Core' ? 5 : 3,
          teacherAssigned,
        }
      })

      const allocs = allocatePeriods(reqs, freeSlots.length)
      plans.push({
        classId: cls.id,
        className,
        scheduleId,
        queue: reqs.map((r, i) => ({ ...r, needed: allocs[i], assigned: 0 })),
        takenSlots: taken,
        dayCounts: new Map(),
        freeSlots,
      })
    }

    if (plans.length === 0) {
      return res.status(400).json({
        error: 'No classes have teacher allocations. Set up Teacher Allocation first, then generate.',
        data: { skipped, uncovered },
      })
    }

    // --- Round-robin placement: every subject of every class gets one shot
    // per pass, so a shared teacher pool starves everyone evenly.
    let placedThisPass = true
    while (placedThisPass) {
      placedThisPass = false
      for (const plan of plans) {
        for (const subject of plan.queue) {
          if (subject.assigned >= subject.needed) continue
          const perDayCap = Math.ceil(subject.needed / DAYS.length)

          // Rotate the scan start per subject so different subjects prefer
          // different days/periods instead of all landing Monday morning.
          const offset = plan.freeSlots.length === 0 ? 0
            : Math.abs(hashCode(`${plan.classId}|${subject.subjectName}`)) % plan.freeSlots.length
          for (let i = 0; i < plan.freeSlots.length; i++) {
            const slot = plan.freeSlots[(i + offset) % plan.freeSlots.length]
            const classKey = `${slot.slotId}|${slot.dayOfWeek}`
            if (plan.takenSlots.has(classKey)) continue
            if (subject.teacherAssigned &&
                busyTeacherSlots.has(`${subject.teacherId}|${slot.slotId}|${slot.dayOfWeek}`)) continue

            const dayKey = `${subject.subjectName}|${slot.dayOfWeek}`
            if ((plan.dayCounts.get(dayKey) || 0) >= perDayCap) continue

            const entryId = randomUUID()
            await sql`
              INSERT INTO timetable_class_schedule_entries
              (id, schedule_id, time_slot_id, subject_id, subject_name, teacher_id, teacher_name, room_id, day_of_week)
              VALUES (
                ${entryId}, ${plan.scheduleId}, ${slot.slotId},
                ${subject.subjectId || subject.subjectName}, ${subject.subjectName},
                ${subject.teacherId}, ${subject.teacherName},
                NULL, ${slot.dayOfWeek}
              )`

            plan.takenSlots.add(classKey)
            if (subject.teacherAssigned) {
              busyTeacherSlots.add(`${subject.teacherId}|${slot.slotId}|${slot.dayOfWeek}`)
            }
            plan.dayCounts.set(dayKey, (plan.dayCounts.get(dayKey) || 0) + 1)
            subject.assigned++
            placedThisPass = true
            break
          }
        }
      }
    }

    // --- Results + live conflict detection -----------------------------------
    const classes = plans.map(plan => ({
      classId: plan.classId,
      className: plan.className,
      created: plan.queue.reduce((sum, s) => sum + s.assigned, 0),
      capacity: plan.freeSlots.length,
      failed: plan.queue
        .filter(s => s.assigned < s.needed)
        .map(s => ({
          subjectName: s.subjectName,
          reason: !s.teacherAssigned
            ? `No teacher assigned in the allocation matrix (${s.assigned}/${s.needed} placed)`
            : `Only assigned ${s.assigned}/${s.needed} — ${s.teacherName} is booked in every remaining slot`,
        })),
    }))

    const conflicts = await detectConflicts(tenantId, termId)

    return res.status(200).json({
      data: {
        termId,
        classes,
        skipped,
        uncovered,
        totalCreated: classes.reduce((sum, c) => sum + c.created, 0),
        conflicts,
      },
    })
  } catch (error: any) {
    console.error('Auto-schedule-all error:', error)
    return res.status(500).json({ error: 'Failed to auto-schedule', details: error.message })
  }
}
