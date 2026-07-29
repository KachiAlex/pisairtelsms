import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

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
 * GET /api/tenant/approvals - List approval requests
 * POST /api/tenant/approvals - Create approval request
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      const { status, type, limit = 50 } = req.query

      const statusValue = Array.isArray(status) ? status[0] : status
      const typeValue = Array.isArray(type) ? type[0] : type
      const limitValue = parseInt(Array.isArray(limit) ? limit[0] : limit as string)

      let query = `
        SELECT 
          id,
          type,
          requester,
          submitted_at,
          sla_deadline,
          status,
          approved_by,
          approved_at,
          rejection_reason,
          created_at,
          updated_at
        FROM approval_requests
        WHERE tenant_id = $1
      `
      const params: any[] = [tenantId]
      let paramIndex = 2

      if (statusValue) {
        query += ` AND status = $${paramIndex}`
        params.push(statusValue)
        paramIndex++
      }

      if (typeValue) {
        query += ` AND type = $${paramIndex}`
        params.push(typeValue)
        paramIndex++
      }

      query += ` ORDER BY submitted_at DESC LIMIT $${paramIndex}`
      params.push(limitValue)

      const result = await sql.query(query, params)

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching approval requests:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch approval requests',
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

      const { type, requester, slaHours } = req.body

      if (!type || !requester) {
        return res.status(400).json({ success: false, error: 'Type and requester are required' })
      }

      const slaDeadline = slaHours ? new Date(Date.now() + slaHours * 60 * 60 * 1000) : null

      const result = await sql.query(`
        INSERT INTO approval_requests (id, tenant_id, type, requester, submitted_at, sla_deadline, status, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), $4, 'pending', NOW(), NOW())
        RETURNING *
      `, [tenantId, type, requester, slaDeadline])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating approval request:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create approval request',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
