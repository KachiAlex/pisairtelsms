import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTeacherSchedules, getTeacherScheduleById, updateTeacherSchedule } from './_lib/teacher-schedules.js'

const TENANT_ID = 'demo-tenant-001'

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req
  const id = query.id as string | undefined

  if (method === 'GET') {
    if (id) {
      const schedule = getTeacherScheduleById(id)
      if (!schedule) return res.status(404).json({ error: 'Teacher schedule not found' })
      return res.status(200).json({ data: schedule })
    }
    const teacherId = query.teacherId as string | undefined
    const termId = query.termId as string | undefined
    return res.status(200).json({ data: getTeacherSchedules(TENANT_ID, teacherId, termId) })
  }

  if (method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id query param is required' })
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })
    const updated = updateTeacherSchedule(id, body)
    if (!updated) return res.status(404).json({ error: 'Teacher schedule not found' })
    return res.status(200).json({ data: updated })
  }

  res.setHeader('Allow', 'GET,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
