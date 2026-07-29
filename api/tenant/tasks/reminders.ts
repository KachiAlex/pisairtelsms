import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

function getUserId(decoded: any): string {
  return decoded.userId || decoded.staffId || 'system'
}

/**
 * GET /api/tenant/tasks/reminders - List reminders
 * POST /api/tenant/tasks/reminders - Create reminder
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      const result = await sql.query(`
        SELECT 
          id,
          task_id,
          message,
          severity,
          due_date,
          is_sent,
          sent_at,
          created_at
        FROM reminders
        WHERE tenant_id = $1 AND is_sent = false
        ORDER BY due_date ASC
      `, [tenantId])

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching reminders:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch reminders',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const userId = getUserId(decoded)

      const { taskId, message, severity = 'warning', dueDate } = req.body

      if (!message || !dueDate) {
        return res.status(400).json({ success: false, error: 'Message and due date are required' })
      }

      const result = await sql.query(`
        INSERT INTO reminders (id, tenant_id, task_id, message, severity, due_date, is_sent, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, false, NOW())
        RETURNING *
      `, [tenantId, taskId || null, message, severity, dueDate])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating reminder:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create reminder',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
