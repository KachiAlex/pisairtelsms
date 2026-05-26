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
 * GET /api/tenant/system-alerts/maintenance - List maintenance windows
 * POST /api/tenant/system-alerts/maintenance - Create maintenance window
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
          label,
          window_start,
          window_end,
          owner,
          status,
          notified,
          created_at,
          updated_at
        FROM maintenance_windows
        WHERE tenant_id = $1
        ORDER BY window_start ASC
      `, [tenantId])

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching maintenance windows:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance windows',
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

      const { label, windowStart, windowEnd, owner } = req.body

      if (!label || !windowStart || !windowEnd || !owner) {
        return res.status(400).json({ success: false, error: 'Label, window start, window end, and owner are required' })
      }

      const result = await sql.query(`
        INSERT INTO maintenance_windows (id, tenant_id, label, window_start, window_end, owner, status, notified, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'scheduled', false, NOW(), NOW())
        RETURNING *
      `, [tenantId, label, windowStart, windowEnd, owner])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating maintenance window:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create maintenance window',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
