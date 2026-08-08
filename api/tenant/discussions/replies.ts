import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    if (req.method === 'GET') {
      const { discussionId } = req.query
      if (!discussionId) {
        return res.status(400).json({ error: 'discussionId query param is required' })
      }
      const result = await sql`
        SELECT * FROM discussion_replies
        WHERE discussion_id = ${discussionId as string} AND tenant_id = ${tenantId}
        ORDER BY created_at ASC
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
      if (discussion.rows[0]?.is_locked) {
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
