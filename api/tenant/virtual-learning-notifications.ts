import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  // Parent tokens carry parentId (not userId) — normalize
  const userId = decoded.userId || decoded.parentId || decoded.staffId || decoded.studentId || decoded.sub || 'system'

  try {
    if (req.method === 'GET') {
      const { unreadOnly } = req.query
      let result
      if (unreadOnly === 'true') {
        result = await sql`
          SELECT * FROM virtual_learning_notifications
          WHERE user_id = ${userId} AND tenant_id = ${tenantId} AND is_read = false
          ORDER BY created_at DESC
          LIMIT 50
        `
      } else {
        result = await sql`
          SELECT * FROM virtual_learning_notifications
          WHERE user_id = ${userId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT 50
        `
      }
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'PUT') {
      const { id, action } = req.body || {}
      if (!id || !action) {
        return res.status(400).json({ error: 'id and action are required' })
      }
      if (action === 'mark_read') {
        const result = await sql`
          UPDATE virtual_learning_notifications SET
            is_read = true,
            read_at = NOW()
          WHERE id = ${id} AND user_id = ${userId} AND tenant_id = ${tenantId}
          RETURNING *
        `
        return res.status(200).json({ data: result.rows[0] })
      }
      if (action === 'mark_all_read') {
        await sql`
          UPDATE virtual_learning_notifications SET
            is_read = true,
            read_at = NOW()
          WHERE user_id = ${userId} AND tenant_id = ${tenantId} AND is_read = false
        `
        return res.status(200).json({ data: { success: true } })
      }
      return res.status(400).json({ error: 'Unknown action' })
    }

    res.setHeader('Allow', 'GET,PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[virtual-learning-notifications]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
