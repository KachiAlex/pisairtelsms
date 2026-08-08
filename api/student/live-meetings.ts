import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lessonId } = req.query
  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId query param is required' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  try {
    const result = await sql`
      SELECT l.id::text,
             l.title,
             l.description,
             l.type,
             l.scheduled_at::text AS scheduled_at,
             l.duration_minutes,
             l.meeting_url,
             l.recording_url,
             l.status,
             COALESCE(vc.name, '') AS classroom_name
      FROM lessons l
      LEFT JOIN virtual_classrooms vc ON vc.id = l.classroom_id
      WHERE l.id = ${lessonId as string}
        AND l.tenant_id = ${tenantId}
        AND l.type = 'live'
    `

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Live class not found' })
    }

    return res.status(200).json({ data: result.rows[0] })
  } catch (error) {
    console.error('[student/live-meetings]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
