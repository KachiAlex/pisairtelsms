import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

function getUserId(decoded: any): string {
  return decoded.userId || decoded.staffId || 'system'
}

/**
 * GET /api/tenant/notifications - List tenant-scoped notifications for the current user
 * PATCH /api/tenant/notifications/:id - Mark a notification as read
 * DELETE /api/tenant/notifications/:id - Delete a notification
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = getUserId(decoded)

  if (req.method === 'GET') {
    try {
      const result = await sql.query(
        `
        SELECT id, user_id, title, message, type, is_read, created_at, read_at
        FROM notifications
        WHERE tenant_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT 100
        `,
        [tenantId, userId]
      )

      const data = result.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        message: r.message,
        type: r.type || 'system',
        status: r.is_read ? 'read' : 'unread',
        createdAt: r.created_at,
        actor: r.user_id,
      }))

      return res.status(200).json({ success: true, data })
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ success: false, error: 'Notification ID is required' })
      }

      const result = await sql.query(
        `
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND user_id = $3
        RETURNING *
        `,
        [id, tenantId, userId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Notification not found' })
      }

      return res.status(200).json({ success: true, data: result.rows[0] })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ success: false, error: 'Notification ID is required' })
      }

      const result = await sql.query(
        `
        DELETE FROM notifications
        WHERE id = $1 AND tenant_id = $2 AND user_id = $3
        RETURNING id
        `,
        [id, tenantId, userId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Notification not found' })
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting notification:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
