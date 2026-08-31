import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    if (req.method === 'GET') {
      const { classroomId, id } = req.query
      if (id) {
        const discussion = await sql`
          SELECT * FROM discussions WHERE id = ${id as string} AND tenant_id = ${tenantId}
        `
        if (!discussion.rows[0]) {
          return res.status(404).json({ error: 'Discussion not found' })
        }
        const replies = await sql`
          SELECT * FROM discussion_replies
          WHERE discussion_id = ${id as string} AND tenant_id = ${tenantId}
          ORDER BY created_at ASC
        `
        return res.status(200).json({
          data: { ...discussion.rows[0], replies: replies.rows },
        })
      }
      if (!classroomId) {
        return res.status(400).json({ error: 'classroomId or id query param is required' })
      }
      const result = await sql`
        SELECT * FROM discussions
        WHERE classroom_id = ${classroomId as string} AND tenant_id = ${tenantId}
        ORDER BY is_pinned DESC, created_at DESC
      `
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST') {
      const { classroomId, lessonId, title, content } = req.body || {}
      if (!classroomId || !title) {
        return res.status(400).json({ error: 'classroomId and title are required' })
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
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Discussion not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'id query param is required' })
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
