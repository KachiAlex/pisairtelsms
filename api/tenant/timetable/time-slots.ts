import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot, timeSlotsOverlap } from './_lib/time-slots.js'
import { initializeDatabase, runMigrations } from '../cbt/_lib/db.js'
import { requireRole } from '../../_lib/auth-middleware.js'

const TENANT_ID = 'demo-tenant-001'
let migrationsInitialized = false

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant timetable
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Ensure migrations are run on first request
  if (!migrationsInitialized) {
    migrationsInitialized = true
    try {
      initializeDatabase()
      await runMigrations()
    } catch (err) {
      console.error('Migration initialization error:', err)
    }
  }

  try {
    const { method, query } = req
    const id = query.id as string | undefined

    if (method === 'GET') {
      const dayOfWeek = query.dayOfWeek !== undefined ? Number(query.dayOfWeek) : undefined
      const slots = await getTimeSlots(TENANT_ID, dayOfWeek)
      return res.status(200).json({ data: slots })
    }

    if (method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })

      // Batch insert for auto-configure
      if (body.slots && Array.isArray(body.slots)) {
        const created = []
        for (const slot of body.slots) {
          const { name, startTime, endTime, dayOfWeek, isBreak, sequence } = slot
          if (!name || !startTime || !endTime || dayOfWeek === undefined) continue
          if (startTime >= endTime) continue
          if (await timeSlotsOverlap(TENANT_ID, dayOfWeek, startTime, endTime)) continue
          const start = new Date(`1970-01-01T${startTime}:00`)
          const end = new Date(`1970-01-01T${endTime}:00`)
          const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
          const existing = await getTimeSlots(TENANT_ID, dayOfWeek)
          const seq = sequence ?? (existing.length + 1)
          const newSlot = await createTimeSlot(TENANT_ID, { name, startTime, endTime, durationMinutes, dayOfWeek, isBreak: !!isBreak, sequence: seq })
          created.push(newSlot)
        }
        return res.status(201).json({ data: created })
      }

      // Single slot insert
      const { name, startTime, endTime, dayOfWeek, isBreak, sequence } = body
      if (!name || !startTime || !endTime || dayOfWeek === undefined) {
        return res.status(400).json({ error: 'name, startTime, endTime, dayOfWeek are required' })
      }
      if (startTime >= endTime) {
        return res.status(400).json({ error: 'startTime must be before endTime' })
      }
      if (await timeSlotsOverlap(TENANT_ID, dayOfWeek, startTime, endTime)) {
        return res.status(400).json({ error: 'Time slot overlaps with an existing slot on this day' })
      }
      const start = new Date(`1970-01-01T${startTime}:00`)
      const end = new Date(`1970-01-01T${endTime}:00`)
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
      const existing = await getTimeSlots(TENANT_ID, dayOfWeek)
      const seq = sequence ?? (existing.length + 1)
      const newSlot = await createTimeSlot(TENANT_ID, { name, startTime, endTime, durationMinutes, dayOfWeek, isBreak: !!isBreak, sequence: seq })
      return res.status(201).json({
        data: newSlot,
      })
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id query param is required' })
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })
      const updated = await updateTimeSlot(id, body)
      if (!updated) return res.status(404).json({ error: 'Time slot not found' })
      return res.status(200).json({ data: updated })
    }

    if (method === 'DELETE') {
      // Bulk delete via ids query param
      const ids = query.ids as string | undefined
      if (ids) {
        const idList = ids.split(',').filter(Boolean)
        let deleted = 0
        for (const slotId of idList) {
          const ok = await deleteTimeSlot(slotId)
          if (ok) deleted++
        }
        return res.status(200).json({ data: { deleted } })
      }
      // Single delete via id query param
      if (!id) return res.status(400).json({ error: 'id or ids query param is required' })
      const ok = await deleteTimeSlot(id)
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
