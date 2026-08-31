import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

  try {
    // GET - list attendance for a lesson
    if (req.method === 'GET') {
      const { lessonId } = req.query
      if (!lessonId) {
        return res.status(400).json({ error: 'lessonId query param is required' })
      }
      const result = await sql`
        SELECT * FROM virtual_attendance
        WHERE lesson_id = ${lessonId as string} AND tenant_id = ${tenantId}
        ORDER BY joined_at DESC
      `
      return res.status(200).json({ data: result.rows })
    }

    // POST - record attendance event (join/leave)
    if (req.method === 'POST') {
      const { lessonId, participantId, participantName, action, durationSeconds } = req.body || {}
      if (!lessonId || !participantId) {
        return res.status(400).json({ error: 'lessonId and participantId are required' })
      }

      if (action === 'joined') {
        // Upsert: create or update attendance record
        const result = await sql`
          INSERT INTO virtual_attendance (lesson_id, student_id, tenant_id, joined_at, status)
          VALUES (${lessonId}, ${participantId}, ${tenantId}, NOW(), 'present')
          ON CONFLICT (lesson_id, student_id)
          DO UPDATE SET joined_at = NOW(), status = 'present'
          RETURNING *
        `
        return res.status(200).json({ data: result.rows[0] })
      } else if (action === 'left') {
        // Update with left_at and duration
        const result = await sql`
          UPDATE virtual_attendance SET
            left_at = NOW(),
            duration_seconds = COALESCE(${durationSeconds || null},
              EXTRACT(EPOCH FROM (NOW() - joined_at))::integer)
          WHERE lesson_id = ${lessonId} AND student_id = ${participantId} AND tenant_id = ${tenantId}
          RETURNING *
        `
        return res.status(200).json({ data: result.rows[0] })
      }

      return res.status(400).json({ error: 'action must be "joined" or "left"' })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[virtual-attendance]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
