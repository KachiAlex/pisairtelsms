import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const limit = parseInt(req.query.limit as string) || 20
    const type = req.query.type as string

    await sql`CREATE TABLE IF NOT EXISTS parent_notifications (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      student_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      action_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`

    let query = sql`
      SELECT id, type, title, message, is_read, action_url, created_at::text AS date
      FROM parent_notifications
      WHERE parent_id = ${parentInfo.parentId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    if (type) {
      query = sql`
        SELECT id, type, title, message, is_read, action_url, created_at::text AS date
        FROM parent_notifications
        WHERE parent_id = ${parentInfo.parentId} AND type = ${type}
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
      WHERE parent_id = ${parentInfo.parentId} AND is_read = FALSE
    `
    const unreadCount = parseInt(unreadRes.rows[0]?.count ?? '0')

    return res.status(200).json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'Failed to fetch notifications' })
  }
}
