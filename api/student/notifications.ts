import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { requireCSRF } from '../_lib/csrf.js'

/**
 * /api/student/notifications
 * GET  — event-driven notification feed (student_notifications) merged with
 *        virtual-learning notifications addressed to this student.
 * PUT  — ?id= marks one read; ?all=1 marks all read.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student'])
  if (!decoded) return
  const studentId = decoded.studentId || decoded.userId
  const tenantId = decoded.tenantId || 'default-tenant'
  if (!studentId) return res.status(401).json({ error: 'Invalid token payload' })

  try {
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
      const result = await sql`
        SELECT id, type, title, message, is_read, action_url, created_at::text AS date
        FROM student_notifications
        WHERE student_id = ${studentId} AND tenant_id = ${tenantId}
        UNION ALL
        SELECT id, type, title, message, is_read, NULL AS action_url, created_at::text AS date
        FROM virtual_learning_notifications
        WHERE user_id = ${studentId} AND tenant_id = ${tenantId} AND user_role = 'student'
        ORDER BY date DESC
        LIMIT ${limit}
      `
      const unreadRes = await sql`
        SELECT (
          (SELECT COUNT(*) FROM student_notifications
           WHERE student_id = ${studentId} AND tenant_id = ${tenantId} AND is_read = FALSE)
          +
          (SELECT COUNT(*) FROM virtual_learning_notifications
           WHERE user_id = ${studentId} AND tenant_id = ${tenantId} AND user_role = 'student' AND is_read = FALSE)
        )::int AS count
      `
      return res.status(200).json({
        notifications: result.rows.map(r => ({
          id: r.id,
          type: r.type,
          title: r.title,
          message: r.message || '',
          date: r.date,
          isRead: r.is_read,
          actionUrl: r.action_url,
        })),
        unreadCount: unreadRes.rows[0]?.count ?? 0,
      })
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      if (requireCSRF(req, res, studentId)) return
      const { id, all } = req.query
      if (all === '1' || all === 'true') {
        await sql`
          UPDATE student_notifications SET is_read = TRUE
          WHERE student_id = ${studentId} AND tenant_id = ${tenantId} AND is_read = FALSE
        `
        await sql`
          UPDATE virtual_learning_notifications SET is_read = TRUE
          WHERE user_id = ${studentId} AND tenant_id = ${tenantId} AND user_role = 'student' AND is_read = FALSE
        `.catch(() => {})
        return res.status(200).json({ success: true })
      }
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id or all=1 is required' })
      }
      const updated = await sql`
        UPDATE student_notifications SET is_read = TRUE
        WHERE id = ${id} AND student_id = ${studentId} AND tenant_id = ${tenantId}
        RETURNING id
      `
      if (!updated.rows.length) {
        await sql`
          UPDATE virtual_learning_notifications SET is_read = TRUE
          WHERE id = ${id} AND user_id = ${studentId} AND tenant_id = ${tenantId} AND user_role = 'student'
        `.catch(() => {})
      }
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', 'GET,PUT,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in student notifications:', error)
    return res.status(500).json({ error: 'Failed to process notifications' })
  }
}
