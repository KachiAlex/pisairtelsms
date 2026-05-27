import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getClassSchedules, getClassScheduleById, createClassSchedule,
  addScheduleEntry, updateScheduleEntry, deleteScheduleEntry, isTeacherAvailable,
} from './_lib/class-schedules.js'
import { requireRole } from '../../_lib/auth-middleware.js'

const TENANT_ID = 'demo-tenant-001'

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant timetable
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method, query } = req
  const scheduleId = query.scheduleId as string | undefined
  const entryId = query.entryId as string | undefined

  // GET /class-schedules or GET /class-schedules?scheduleId=xxx
  if (method === 'GET') {
    if (scheduleId) {
      const schedule = getClassScheduleById(scheduleId)
      if (!schedule) return res.status(404).json({ error: 'Schedule not found' })
      return res.status(200).json({ data: schedule })
    }
    const classId = query.classId as string | undefined
    const termId = query.termId as string | undefined
    return res.status(200).json({ data: getClassSchedules(TENANT_ID, classId, termId) })
  }

  // POST /class-schedules — create schedule
  if (method === 'POST' && !scheduleId) {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })
    const { classId, termId } = body
    if (!classId || !termId) return res.status(400).json({ error: 'classId and termId are required' })
    return res.status(201).json({ data: createClassSchedule(TENANT_ID, classId, termId) })
  }

  // POST /class-schedules?scheduleId=xxx — add entry
  if (method === 'POST' && scheduleId) {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })
    const { timeSlotId, subjectId, subjectName, teacherId, teacherName, roomId, dayOfWeek } = body
    if (!timeSlotId || !subjectId || !teacherId || dayOfWeek === undefined) {
      return res.status(400).json({ error: 'timeSlotId, subjectId, teacherId, dayOfWeek are required' })
    }
    if (!isTeacherAvailable(teacherId, timeSlotId, dayOfWeek)) {
      return res.status(409).json({ error: `Teacher ${teacherName || teacherId} is already assigned to another class in this slot` })
    }
    const entry = addScheduleEntry(scheduleId, { timeSlotId, subjectId, subjectName: subjectName || subjectId, teacherId, teacherName: teacherName || teacherId, roomId, dayOfWeek })
    return res.status(201).json({ data: entry })
  }

  // PUT /class-schedules?scheduleId=xxx&entryId=yyy — update entry
  if (method === 'PUT' && scheduleId && entryId) {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })
    if (body.teacherId && body.timeSlotId && body.dayOfWeek !== undefined) {
      if (!isTeacherAvailable(body.teacherId, body.timeSlotId, body.dayOfWeek, entryId)) {
        return res.status(409).json({ error: 'Teacher is already assigned to another class in this slot' })
      }
    }
    const updated = updateScheduleEntry(entryId, body)
    if (!updated) return res.status(404).json({ error: 'Entry not found' })
    return res.status(200).json({ data: updated })
  }

  // DELETE /class-schedules?scheduleId=xxx&entryId=yyy — delete entry
  if (method === 'DELETE' && scheduleId && entryId) {
    const ok = deleteScheduleEntry(entryId)
    if (!ok) return res.status(404).json({ error: 'Entry not found' })
    return res.status(204).end()
  }

  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
