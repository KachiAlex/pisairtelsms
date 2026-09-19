import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireAuth } from '../../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.staffId || decoded.studentId || decoded.parentId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    if (req.method === 'GET') {
      const { discussionId } = req.query
      if (!discussionId) {
        return res.status(400).json({ error: 'discussionId query param is required' })
      }
      const result = await sql`
        SELECT r.*,
          COALESCE(sf.name, stu.name, pa.name) AS author_name
        FROM discussion_replies r
        LEFT JOIN staff sf ON sf.id = r.created_by AND sf.tenant_id = r.tenant_id
        LEFT JOIN students stu ON stu.id = r.created_by AND stu.tenant_id = r.tenant_id
        LEFT JOIN parents pa ON pa.id = r.created_by AND pa.tenant_id = r.tenant_id
        WHERE r.discussion_id = ${discussionId as string} AND r.tenant_id = ${tenantId}
        ORDER BY r.created_at ASC
      `
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST') {
      const { discussionId, content, parentReplyId } = req.body || {}
      if (!discussionId || !content) {
        return res.status(400).json({ error: 'discussionId and content are required' })
      }
      const discussion = await sql`
        SELECT is_locked FROM discussions WHERE id = ${discussionId} AND tenant_id = ${tenantId}
      `
      if (!discussion.rows[0]) {
        return res.status(404).json({ error: 'Discussion not found' })
      }
      if (discussion.rows[0].is_locked) {
        return res.status(403).json({ error: 'Discussion is locked' })
      }
      const result = await sql`
        INSERT INTO discussion_replies (discussion_id, parent_reply_id, tenant_id, content, created_by, author_role)
        VALUES (
          ${discussionId},
          ${parentReplyId || null},
          ${tenantId},
          ${content},
          ${userId},
          ${userRole}
        )
        RETURNING *
      `
      return res.status(201).json({ data: result.rows[0] })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[discussion-replies]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
