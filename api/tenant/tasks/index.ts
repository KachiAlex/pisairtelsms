import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware'

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
 * GET /api/tenant/tasks - List tasks
 * POST /api/tenant/tasks - Create task
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
      const { status, priority, assignedTo, limit = 50, offset = 0 } = req.query

      const statusValue = Array.isArray(status) ? status[0] : status
      const priorityValue = Array.isArray(priority) ? priority[0] : priority
      const assignedToValue = Array.isArray(assignedTo) ? assignedTo[0] : assignedTo
      const limitValue = parseInt(Array.isArray(limit) ? limit[0] : limit as string)
      const offsetValue = parseInt(Array.isArray(offset) ? offset[0] : offset as string)

      let query = `
        SELECT 
          t.id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.assigned_to,
          t.created_by,
          t.due_date,
          t.completed_at,
          t.created_at,
          t.updated_at,
          u.name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.tenant_id = $1
      `
      const params: any[] = [tenantId]
      let paramIndex = 2

      if (statusValue) {
        query += ` AND t.status = $${paramIndex}`
        params.push(statusValue)
        paramIndex++
      }

      if (priorityValue) {
        query += ` AND t.priority = $${paramIndex}`
        params.push(priorityValue)
        paramIndex++
      }

      if (assignedToValue) {
        query += ` AND t.assigned_to = $${paramIndex}`
        params.push(assignedToValue)
        paramIndex++
      }

      query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(limitValue, offsetValue)

      const result = await sql.query(query, params)

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM tasks WHERE tenant_id = $1
        ${statusValue ? `AND status = $2` : ''}
        ${priorityValue ? `AND priority = $${statusValue ? 3 : 2}` : ''}
        ${assignedToValue ? `AND assigned_to = $${statusValue ? (priorityValue ? 4 : 3) : (priorityValue ? 3 : 2)}` : ''}
      `
      const countParams = [tenantId]
      if (statusValue) countParams.push(statusValue)
      if (priorityValue) countParams.push(priorityValue)
      if (assignedToValue) countParams.push(assignedToValue)

      const countResult = await sql.query(countQuery, countParams)

      return res.status(200).json({
        success: true,
        data: result.rows,
        total: parseInt(countResult.rows[0]?.total || '0')
      })
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tasks',
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

      const { title, description, assignedTo, priority, dueDate } = req.body

      if (!title) {
        return res.status(400).json({ success: false, error: 'Title is required' })
      }

      const result = await sql.query(`
        INSERT INTO tasks (id, tenant_id, title, description, status, priority, assigned_to, created_by, due_date, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, 'open', $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [tenantId, title, description || null, priority || 'medium', assignedTo || null, userId, dueDate || null])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating task:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
