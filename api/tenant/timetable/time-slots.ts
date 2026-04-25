import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot, timeSlotsOverlap } from './_lib/time-slots'

const TENANT_ID = 'demo-tenant-001'

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method, query } = req
    const id = query.id as string | undefined

    if (method === 'GET') {
      const dayOfWeek = query.dayOfWeek !== undefined ? Number(query.dayOfWeek) : undefined
      return res.status(200).json({ data: getTimeSlots(TENANT_ID, dayOfWeek) })
    }

    if (method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const { name, startTime, endTime, dayOfWeek, isBreak, sequence } = body
      if (!name || !startTime || !endTime || dayOfWeek === undefined) {
        return res.status(400).json({ error: 'name, startTime, endTime, dayOfWeek are required' })
      }
      if (startTime >= endTime) {
        return res.status(400).json({ error: 'startTime must be before endTime' })
      }
      if (timeSlotsOverlap(TENANT_ID, dayOfWeek, startTime, endTime)) {
        return res.status(400).json({ error: 'Time slot overlaps with an existing slot on this day' })
      }
      const start = new Date(`1970-01-01T${startTime}:00`)
      const end = new Date(`1970-01-01T${endTime}:00`)
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
      const existing = getTimeSlots(TENANT_ID, dayOfWeek)
      const seq = sequence ?? (existing.length + 1)
      return res.status(201).json({
        data: createTimeSlot(TENANT_ID, { name, startTime, endTime, durationMinutes, dayOfWeek, isBreak: !!isBreak, sequence: seq }),
      })
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id query param is required' })
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const updated = updateTimeSlot(id, body)
      if (!updated) return res.status(404).json({ error: 'Time slot not found' })
      return res.status(200).json({ data: updated })
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id query param is required' })
      const ok = deleteTimeSlot(id)
      if (!ok) return res.status(404).json({ error: 'Time slot not found' })
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Time slots API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
