import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

  try {
    // GET - list assignments for a classroom
    if (req.method === 'GET') {
      const { classroomId } = req.query
      if (!classroomId) {
        return res.status(400).json({ error: 'classroomId query param is required' })
      }
      const result = await sql`
        SELECT a.*, 
               (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count
        FROM assignments a
        WHERE a.classroom_id = ${classroomId as string} AND a.tenant_id = ${tenantId}
        ORDER BY a.due_date DESC
      `
      return res.status(200).json({ data: result.rows })
    }

    // POST - create assignment
    if (req.method === 'POST') {
      const { classroomId, lessonId, title, instructions, points, dueDate, allowLateSubmission, latePenaltyPercent, attachmentUrls } = req.body || {}
      if (!classroomId || !title || !dueDate) {
        return res.status(400).json({ error: 'classroomId, title, and dueDate are required' })
      }
      const result = await sql`
        INSERT INTO assignments (classroom_id, lesson_id, tenant_id, title, instructions, points, due_date, allow_late_submission, late_penalty_percent, attachment_urls, created_by)
        VALUES (${classroomId}, ${lessonId || null}, ${tenantId}, ${title}, ${instructions || null}, ${points || 100}, ${dueDate}, ${allowLateSubmission ?? true}, ${latePenaltyPercent || 0}, ${attachmentUrls || null}, ${userId})
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    // PUT - update assignment
    if (req.method === 'PUT') {
      const { id, title, instructions, points, dueDate, allowLateSubmission, latePenaltyPercent, attachmentUrls, isPublished } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const result = await sql`
        UPDATE assignments SET
          title = COALESCE(${title || null}, title),
          instructions = COALESCE(${instructions || null}, instructions),
          points = COALESCE(${points || null}, points),
          due_date = COALESCE(${dueDate || null}, due_date),
          allow_late_submission = COALESCE(${allowLateSubmission === undefined ? null : allowLateSubmission}, allow_late_submission),
          late_penalty_percent = COALESCE(${latePenaltyPercent || null}, late_penalty_percent),
          attachment_urls = COALESCE(${attachmentUrls || null}, attachment_urls),
          is_published = COALESCE(${isPublished === undefined ? null : isPublished}, is_published),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Assignment not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    // DELETE - remove assignment
    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
      }
      const result = await sql`
        DELETE FROM assignments WHERE id = ${id as string} AND tenant_id = ${tenantId}
        RETURNING id
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Assignment not found' })
      }
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[assignments]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
