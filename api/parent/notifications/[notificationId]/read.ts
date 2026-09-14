import type { VercelRequest, VercelResponse } from '../../../_lib/http-types.js'
import { sql } from '../../../_lib/sql.js'
import { requireRole } from '../../../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const decoded = await requireRole(req, res, ['parent'])
  if (!decoded) return

  const parentId = decoded.parentId
  if (!parentId) return res.status(401).json({ error: 'Unauthorized: Missing parentId' })

  const tenantId = decoded.tenantId || 'default-tenant'

  const { notificationId } = req.query
  if (!notificationId || typeof notificationId !== 'string') {
    return res.status(400).json({ error: 'notificationId is required' })
  }

  try {
    await sql`
      UPDATE parent_notifications
      SET is_read = TRUE
      WHERE id = ${notificationId} AND parent_id = ${parentId} AND tenant_id = ${tenantId}
    `
    return res.status(200).json({ id: notificationId, isRead: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return res.status(500).json({ error: 'Failed to update notification' })
  }
}
