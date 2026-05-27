import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const childId = req.query.childId as string
    const limit = parseInt(req.query.limit as string) || 10
    const category = req.query.category as string

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const dbResult = category
      ? await sql`
          SELECT id::text, title, body, COALESCE(category, 'general') AS category,
                 created_at::date::text AS date, COALESCE(author, 'Admin') AS author
          FROM announcements WHERE LOWER(category) = LOWER(${category})
          ORDER BY created_at DESC LIMIT ${limit}
        `
      : await sql`
          SELECT id::text, title, body, COALESCE(category, 'general') AS category,
                 created_at::date::text AS date, COALESCE(author, 'Admin') AS author
          FROM announcements
          ORDER BY created_at DESC LIMIT ${limit}
        `

    const announcements = dbResult.rows.map(r => ({
      id: r.id, title: r.title, body: r.body, category: r.category,
      date: r.date, author: r.author, attachments: [], isRead: false,
    }))

    const unreadCount = announcements.length

    return res.status(200).json({ announcements, categories: ['academic', 'event', 'notice', 'general'], unreadCount })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return res.status(500).json({ error: 'Failed to fetch announcements' })
  }
}
