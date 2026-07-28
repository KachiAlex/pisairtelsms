import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getExamSchedules, getExamScheduleById, createExamSchedule,
  addHallAssignment, addInvigilator, removeInvigilator, getExamHalls,
} from './_lib/exam-schedules.js'
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
  const examId = query.examId as string | undefined
  const action = query.action as string | undefined  // 'hall-assignments' | 'invigilators'
  const subId = query.subId as string | undefined    // invigilatorId for DELETE

  // GET /exam-schedules?halls=true — list halls
  if (method === 'GET' && query.halls === 'true') {
    return res.status(200).json({ data: getExamHalls(TENANT_ID) })
  }

  // GET /exam-schedules or GET /exam-schedules?examId=xxx
  if (method === 'GET') {
    if (examId) {
      const schedule = getExamScheduleById(examId)
      if (!schedule) return res.status(404).json({ error: 'Exam schedule not found' })
      return res.status(200).json({ data: schedule })
    }
    const examPeriodId = query.examPeriodId as string | undefined
    const subjectId = query.subjectId as string | undefined
    return res.status(200).json({ data: getExamSchedules(TENANT_ID, examPeriodId, subjectId) })
  }

  // POST /exam-schedules — create exam
  if (method === 'POST' && !examId) {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })
    const { examPeriodId, subjectId, subjectName, examDate, startTime, endTime, examType } = body
    if (!examPeriodId || !subjectId || !examDate || !startTime || !endTime || !examType) {
      return res.status(400).json({ error: 'examPeriodId, subjectId, examDate, startTime, endTime, examType are required' })
    }
    if (startTime >= endTime) return res.status(400).json({ error: 'startTime must be before endTime' })
    const start = new Date(`1970-01-01T${startTime}:00`)
    const end = new Date(`1970-01-01T${endTime}:00`)
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
    return res.status(201).json({
      data: createExamSchedule(TENANT_ID, { examPeriodId, subjectId, subjectName: subjectName || subjectId, examDate, startTime, endTime, durationMinutes, examType }),
    })
  }

  // POST /exam-schedules?examId=xxx&action=hall-assignments
  if (method === 'POST' && examId && action === 'hall-assignments') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })
    const { hallId, studentCount } = body
    if (!hallId || studentCount === undefined) return res.status(400).json({ error: 'hallId and studentCount are required' })
    const result = addHallAssignment(examId, hallId, studentCount)
    if ('error' in result) return res.status(400).json({ error: result.error })
    return res.status(201).json({ data: result })
  }

  // POST /exam-schedules?examId=xxx&action=invigilators
  if (method === 'POST' && examId && action === 'invigilators') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })
    const { staffId, staffName, hallId } = body
    if (!staffId || !hallId) return res.status(400).json({ error: 'staffId and hallId are required' })
    const result = addInvigilator(examId, staffId, staffName || staffId, hallId)
    if ('error' in result) return res.status(409).json({ error: result.error })
    return res.status(201).json({ data: result })
  }

  // DELETE /exam-schedules?examId=xxx&action=invigilators&subId=yyy
  if (method === 'DELETE' && examId && action === 'invigilators' && subId) {
    const ok = removeInvigilator(subId)
    if (!ok) return res.status(404).json({ error: 'Invigilator assignment not found' })
    return res.status(204).end()
  }

  res.setHeader('Allow', 'GET,POST,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
