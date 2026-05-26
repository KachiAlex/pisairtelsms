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
 * GET /api/tenant/tasks/reminders - List reminders
 * POST /api/tenant/tasks/reminders - Create reminder
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

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
      const userId = getUserId(req)
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' })
      }

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
