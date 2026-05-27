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
 * GET /api/tenant/system-alerts - List system alerts
 * POST /api/tenant/system-alerts - Create system alert
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

  if (req.method === 'GET') {
    try {
      const { severity, status, limit = 50 } = req.query

      const severityValue = Array.isArray(severity) ? severity[0] : severity
      const statusValue = Array.isArray(status) ? status[0] : status
      const limitValue = parseInt(Array.isArray(limit) ? limit[0] : limit as string)

      let query = `
        SELECT 
          id,
          title,
          impact,
          owner,
          severity,
          eta,
          status,
          resolved_at,
          created_at,
          updated_at
        FROM system_alerts
        WHERE tenant_id = $1
      `
      const params: any[] = [tenantId]
      let paramIndex = 2

      if (severityValue) {
        query += ` AND severity = $${paramIndex}`
        params.push(severityValue)
        paramIndex++
      }

      if (statusValue) {
        query += ` AND status = $${paramIndex}`
        params.push(statusValue)
        paramIndex++
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`
      params.push(limitValue)

      const result = await sql.query(query, params)

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching system alerts:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch system alerts',
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

      const { title, impact, owner, severity = 'medium', eta } = req.body

      if (!title) {
        return res.status(400).json({ success: false, error: 'Title is required' })
      }

      const result = await sql.query(`
        INSERT INTO system_alerts (id, tenant_id, title, impact, owner, severity, eta, status, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
        RETURNING *
      `, [tenantId, title, impact || null, owner || null, severity, eta || null])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating system alert:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create system alert',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
