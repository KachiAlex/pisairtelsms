import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return
    const parentId = decoded.parentId!

    const tenantId = decoded.tenantId || 'default-tenant'

    // Ensure tenant_id column exists
    await sql`ALTER TABLE parent_notifications ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant'`.catch(() => {})

    const limit = parseInt(req.query.limit as string) || 20
    const type = req.query.type as string

    let query = sql`
      SELECT id, type, title, message, is_read, action_url, created_at::text AS date
      FROM parent_notifications
      WHERE parent_id = ${parentId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    if (type) {
      query = sql`
        SELECT id, type, title, message, is_read, action_url, created_at::text AS date
        FROM parent_notifications
        WHERE parent_id = ${parentId} AND tenant_id = ${tenantId} AND type = ${type}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    }

    const result = await query
    const notifications = result.rows.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      date: r.date,
      isRead: r.is_read,
      actionUrl: r.action_url,
    }))

    const unreadRes = await sql`
      SELECT COUNT(*) AS count FROM parent_notifications
      WHERE parent_id = ${parentId} AND tenant_id = ${tenantId} AND is_read = FALSE
    `
    const unreadCount = parseInt(unreadRes.rows[0]?.count ?? '0')

    return res.status(200).json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'Failed to fetch notifications' })
  }
}
