import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

function getUserId(req: VercelRequest): string | null {
  const auth = req.headers['authorization'] as string | undefined
  if (auth) {
    try {
      const token = auth.replace('Bearer ', '')
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
      return payload.userId || null
    } catch {
      return null
    }
  }
  return null
}

/**
 * GET /api/tenant/tasks/notifications - List notifications
 * POST /api/tenant/tasks/notifications - Create notification
 * PATCH /api/tenant/tasks/notifications/:id - Mark as read
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

  if (req.method === 'GET') {
    try {
      const userId = getUserId(req)
      const { unreadOnly = 'false' } = req.query

      let query = `
        SELECT 
          id,
          user_id,
          title,
          message,
          type,
          is_read,
          created_at,
          read_at
        FROM notifications
        WHERE tenant_id = $1
      `
      const params: any[] = [tenantId]

      if (userId) {
        query += ` AND user_id = $2`
        params.push(userId)
      }

      if (unreadOnly === 'true') {
        query += ` AND is_read = false`
      }

      query += ` ORDER BY created_at DESC LIMIT 50`

      const result = await sql.query(query, params)

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const userId = getUserId(req)
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' })
      }

      const { title, message, type = 'info', targetUserId } = req.body

      if (!title || !message) {
        return res.status(400).json({ success: false, error: 'Title and message are required' })
      }

      const result = await sql.query(`
        INSERT INTO notifications (id, tenant_id, user_id, title, message, type, is_read, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, false, NOW())
        RETURNING *
      `, [tenantId, targetUserId || userId, title, message, type])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating notification:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create notification',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id } = req.query
      const { isRead } = req.body

      if (!id) {
        return res.status(400).json({ success: false, error: 'Notification ID is required' })
      }

      const result = await sql.query(`
        UPDATE notifications
        SET is_read = $1, read_at = CASE WHEN $1 = true THEN NOW() ELSE read_at END
        WHERE id = $2 AND tenant_id = $3
        RETURNING *
      `, [isRead !== undefined ? isRead : true, id, tenantId])

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Notification not found' })
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error updating notification:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update notification',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
