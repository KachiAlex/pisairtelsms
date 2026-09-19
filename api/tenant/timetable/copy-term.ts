import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from './_lib/db.js'
import { randomUUID } from 'crypto'
import { requireRole } from '../../_lib/auth-middleware.js'

function parseBody(req: ApiRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

// Copy every class schedule from one term into another as drafts — most of a
// school's timetable carries over between terms, so this avoids regenerating.
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

  const { fromTermId, toTermId, overwrite = true } = body as {
    fromTermId?: string
    toTermId?: string
    overwrite?: boolean
  }
  if (!fromTermId || !toTermId) {
    return res.status(400).json({ error: 'fromTermId and toTermId are required' })
  }
  if (fromTermId === toTermId) {
    return res.status(400).json({ error: 'Source and target terms must differ' })
  }

  try {
    const [source, target] = await Promise.all([
      sql`SELECT id, class_id FROM timetable_class_schedules WHERE tenant_id = ${tenantId} AND term_id = ${fromTermId}`,
      sql`SELECT id, class_id FROM timetable_class_schedules WHERE tenant_id = ${tenantId} AND term_id = ${toTermId}`,
    ])
    if (source.rows.length === 0) {
      return res.status(400).json({ error: 'No schedules found in the source term' })
    }

    const targetByClass = new Map(target.rows.map((s: any) => [s.class_id, s.id]))
    let schedulesCopied = 0
    let entriesCopied = 0
    const classesSkipped: string[] = []

    for (const s of source.rows) {
      let targetId = targetByClass.get(s.class_id)
      if (targetId && overwrite) {
        await sql`DELETE FROM timetable_class_schedule_entries WHERE schedule_id = ${targetId}`
      } else if (!targetId) {
        targetId = randomUUID()
        await sql`INSERT INTO timetable_class_schedules (id, tenant_id, class_id, term_id, status) VALUES (${targetId}, ${tenantId}, ${s.class_id}, ${toTermId}, 'draft')`
        targetByClass.set(s.class_id, targetId)
      } else {
        classesSkipped.push(s.class_id)
        continue
      }

      const entries = await sql`SELECT time_slot_id, subject_id, subject_name, teacher_id, teacher_name, room_id, day_of_week FROM timetable_class_schedule_entries WHERE schedule_id = ${s.id}`
      for (const e of entries.rows) {
        await sql`
          INSERT INTO timetable_class_schedule_entries
          (id, schedule_id, time_slot_id, subject_id, subject_name, teacher_id, teacher_name, room_id, day_of_week)
          VALUES (${randomUUID()}, ${targetId}, ${e.time_slot_id}, ${e.subject_id}, ${e.subject_name}, ${e.teacher_id}, ${e.teacher_name}, ${e.room_id}, ${e.day_of_week})`
        entriesCopied++
      }
      schedulesCopied++
    }

    return res.status(200).json({
      data: { schedulesCopied, entriesCopied, skipped: classesSkipped.length },
    })
  } catch (error: any) {
    console.error('Copy-term error:', error)
    return res.status(500).json({ error: 'Failed to copy term schedules', details: error.message })
  }
}
