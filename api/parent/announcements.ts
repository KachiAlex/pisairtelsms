import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildAccess } from './_lib/verify-child.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const tenantId = decoded.tenantId || 'default-tenant'

    const childId = req.query.childId as string
    const limit = parseInt(req.query.limit as string) || 10
    const category = req.query.category as string

    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!await verifyParentChildAccess(parentInfo.parentId, childId, tenantId)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const dbResult = category
      ? await sql`
          SELECT id::text, title, body, COALESCE(category, 'general') AS category,
                 created_at::date::text AS date, COALESCE(author, 'Admin') AS author
          FROM announcements WHERE tenant_id = ${tenantId} AND LOWER(category) = LOWER(${category})
            AND COALESCE(status, 'sent') = 'sent'
            AND COALESCE(audience, 'all') IN ('all', 'parents')
          ORDER BY created_at DESC LIMIT ${limit}
        `
      : await sql`
          SELECT id::text, title, body, COALESCE(category, 'general') AS category,
                 created_at::date::text AS date, COALESCE(author, 'Admin') AS author
          FROM announcements
          WHERE tenant_id = ${tenantId}
            AND COALESCE(status, 'sent') = 'sent'
            AND COALESCE(audience, 'all') IN ('all', 'parents')
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
