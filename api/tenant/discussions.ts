import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

// Author IDs may reference staff, students, or parents — resolve a display name
const AUTHOR_JOIN = `
  LEFT JOIN staff sf ON sf.id = d.created_by AND sf.tenant_id = d.tenant_id
  LEFT JOIN students stu ON stu.id = d.created_by AND stu.tenant_id = d.tenant_id
  LEFT JOIN parents pa ON pa.id = d.created_by AND pa.tenant_id = d.tenant_id
`
const AUTHOR_NAME = `COALESCE(sf.name, stu.name, pa.name) AS author_name`
const REPLY_AUTHOR_JOIN = `
  LEFT JOIN staff sf ON sf.id = r.created_by AND sf.tenant_id = r.tenant_id
  LEFT JOIN students stu ON stu.id = r.created_by AND stu.tenant_id = r.tenant_id
  LEFT JOIN parents pa ON pa.id = r.created_by AND pa.tenant_id = r.tenant_id
`

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.staffId || decoded.studentId || decoded.parentId || decoded.sub || 'system'
  const userRole = decoded.role
  const isStaff = userRole === 'staff' || userRole === 'tenant_admin'

  try {
    if (req.method === 'GET') {
      const { classroomId, id } = req.query
      if (id) {
        const discussion = await sql.query(
          `SELECT d.*, ${AUTHOR_NAME}
           FROM discussions d ${AUTHOR_JOIN}
           WHERE d.id = $1 AND d.tenant_id = $2`,
          [id, tenantId]
        )
        if (!discussion.rows[0]) {
          return res.status(404).json({ error: 'Discussion not found' })
        }
        const replies = await sql.query(
          `SELECT r.*, COALESCE(sf.name, stu.name, pa.name) AS author_name
           FROM discussion_replies r ${REPLY_AUTHOR_JOIN}
           WHERE r.discussion_id = $1 AND r.tenant_id = $2
           ORDER BY r.created_at ASC`,
          [id, tenantId]
        )
        return res.status(200).json({
          data: { ...discussion.rows[0], replies: replies.rows },
        })
      }
      if (!classroomId) {
        return res.status(400).json({ error: 'classroomId or id query param is required' })
      }
      const result = await sql.query(
        `SELECT d.*, ${AUTHOR_NAME}
         FROM discussions d ${AUTHOR_JOIN}
         WHERE d.classroom_id = $1 AND d.tenant_id = $2
         ORDER BY d.is_pinned DESC, d.created_at DESC`,
        [classroomId, tenantId]
      )
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST') {
      const { classroomId, lessonId, title, content } = req.body || {}
      if (!classroomId || !title) {
        return res.status(400).json({ error: 'classroomId and title are required' })
      }
      // Verify the classroom belongs to this tenant
      const classroom = await sql`
        SELECT id FROM virtual_classrooms WHERE id = ${classroomId} AND tenant_id = ${tenantId}
      `
      if (!classroom.rows[0]) {
        return res.status(404).json({ error: 'Classroom not found' })
      }
      const result = await sql`
        INSERT INTO discussions (classroom_id, lesson_id, tenant_id, title, content, created_by, author_role)
        VALUES (${classroomId}, ${lessonId || null}, ${tenantId}, ${title}, ${content || null}, ${userId}, ${userRole})
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    if (req.method === 'PUT') {
      const { id, title, content, is_pinned, is_locked } = req.body || {}
      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }
      const existing = await sql`
        SELECT created_by FROM discussions WHERE id = ${id} AND tenant_id = ${tenantId}
      `
      const discussion = existing.rows[0]
      if (!discussion) {
        return res.status(404).json({ error: 'Discussion not found' })
      }

      const isOwner = discussion.created_by === userId
      // Pin/lock are moderation actions — staff only
      const wantsModeration = is_pinned !== undefined || is_locked !== undefined
      if (wantsModeration && !isStaff) {
        return res.status(403).json({ error: 'Only staff can pin or lock discussions' })
      }
      // Content edits — owner or staff
      const wantsEdit = title !== undefined || content !== undefined
      if (wantsEdit && !isOwner && !isStaff) {
        return res.status(403).json({ error: 'You can only edit your own discussions' })
      }

      const result = await sql`
        UPDATE discussions SET
          title = COALESCE(${title || null}, title),
          content = COALESCE(${content || null}, content),
          is_pinned = COALESCE(${is_pinned === undefined ? null : is_pinned}, is_pinned),
          is_locked = COALESCE(${is_locked === undefined ? null : is_locked}, is_locked),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `
      return res.status(200).json({ data: result.rows[0] })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
      }
      const existing = await sql`
        SELECT created_by FROM discussions WHERE id = ${id as string} AND tenant_id = ${tenantId}
      `
      const discussion = existing.rows[0]
      if (!discussion) {
        return res.status(404).json({ error: 'Discussion not found' })
      }
      if (discussion.created_by !== userId && !isStaff) {
        return res.status(403).json({ error: 'You can only delete your own discussions' })
      }
      await sql`DELETE FROM discussions WHERE id = ${id as string} AND tenant_id = ${tenantId}`
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[discussions]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
