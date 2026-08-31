import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

  try {
    // GET - list lessons for a classroom
    if (req.method === 'GET') {
      const { classroomId } = req.query
      if (!classroomId) {
        return res.status(400).json({ error: 'classroomId query param is required' })
      }
      const result = await sql`
        SELECT * FROM lessons
        WHERE classroom_id = ${classroomId as string} AND tenant_id = ${tenantId}
        ORDER BY scheduled_at DESC NULLS LAST, created_at DESC
      `
      return res.status(200).json({ data: result.rows })
    }

    // POST - create lesson
    if (req.method === 'POST') {
      const { classroomId, title, description, type, scheduledAt, durationMinutes, meetingUrl } = req.body || {}
      if (!classroomId || !title) {
        return res.status(400).json({ error: 'classroomId and title are required' })
      }
      const result = await sql`
        INSERT INTO lessons (classroom_id, tenant_id, title, description, type, scheduled_at, duration_minutes, meeting_url, created_by)
        VALUES (${classroomId}, ${tenantId}, ${title}, ${description || null}, ${type || 'async'}, ${scheduledAt || null}, ${durationMinutes || 60}, ${meetingUrl || null}, ${userId})
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    // PUT - update lesson
    if (req.method === 'PUT') {
      const { id, title, description, type, scheduledAt, durationMinutes, meetingUrl, recordingUrl, status } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const result = await sql`
        UPDATE lessons SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          type = COALESCE(${type || null}, type),
          scheduled_at = COALESCE(${scheduledAt || null}, scheduled_at),
          duration_minutes = COALESCE(${durationMinutes || null}, duration_minutes),
          meeting_url = COALESCE(${meetingUrl || null}, meeting_url),
          recording_url = COALESCE(${recordingUrl || null}, recording_url),
          status = COALESCE(${status || null}, status),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Lesson not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    // DELETE - remove lesson
    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
      }
      const result = await sql`
        DELETE FROM lessons WHERE id = ${id as string} AND tenant_id = ${tenantId}
        RETURNING id
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Lesson not found' })
      }
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[lessons]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
