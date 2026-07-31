import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'

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
