import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/** Assigned teacher, co-teacher, or tenant admin may modify a lesson. */
async function canManageLesson(lessonId: string, decoded: any, tenantId: string): Promise<boolean> {
  if (decoded.role === 'tenant_admin') return true
  const callerId = decoded.staffId || decoded.userId || decoded.sub
  const r = await sql`
    SELECT vc.teacher_id, vc.co_teacher_id
    FROM lessons l JOIN virtual_classrooms vc ON vc.id = l.classroom_id
    WHERE l.id = ${lessonId} AND l.tenant_id = ${tenantId}
    LIMIT 1
  `
  const vc = r.rows[0]
  if (!vc) return false
  return vc.teacher_id === callerId || vc.co_teacher_id === callerId
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

  await sql`ALTER TABLE virtual_classrooms ADD COLUMN IF NOT EXISTS co_teacher_id TEXT`.catch(() => {})

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
      // Live lessons must be 'scheduled' at creation — 'draft' is invisible
      // to students (their list filters to scheduled/live/completed), which
      // made every live class a dead letter until someone manually flipped it.
      // Async lessons are always-available content → 'published'.
      const status = (type || 'async') === 'live' ? 'scheduled' : 'published'
      const result = await sql`
        INSERT INTO lessons (classroom_id, tenant_id, title, description, type, scheduled_at, duration_minutes, meeting_url, created_by, status)
        VALUES (${classroomId}, ${tenantId}, ${title}, ${description || null}, ${type || 'async'}, ${scheduledAt || null}, ${durationMinutes || 60}, ${meetingUrl || null}, ${userId}, ${status})
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    // PUT - update lesson (assigned teacher, co-teacher, or admin only)
    if (req.method === 'PUT') {
      const { id, title, description, type, scheduledAt, durationMinutes, meetingUrl, recordingUrl, status } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const allowed = await canManageLesson(id as string, decoded, tenantId)
      if (!allowed) {
        return res.status(403).json({ error: 'Only the assigned teacher or an admin can modify this lesson' })
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

    // DELETE - remove lesson (assigned teacher, co-teacher, or admin only)
    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
      }
      const allowed = await canManageLesson(id as string, decoded, tenantId)
      if (!allowed) {
        return res.status(403).json({ error: 'Only the assigned teacher or an admin can delete this lesson' })
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
