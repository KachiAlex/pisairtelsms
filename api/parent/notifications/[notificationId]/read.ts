import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = extractTokenFromHeader(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

  const parentInfo = extractParentInfoFromJWT(token)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

  const { notificationId } = req.query
  if (!notificationId || typeof notificationId !== 'string') {
    return res.status(400).json({ error: 'notificationId is required' })
  }

  try {
    await sql`
      UPDATE parent_notifications
      SET is_read = TRUE
      WHERE id = ${notificationId} AND parent_id = ${parentInfo.parentId}
    `
    return res.status(200).json({ id: notificationId, isRead: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return res.status(500).json({ error: 'Failed to update notification' })
  }
}
