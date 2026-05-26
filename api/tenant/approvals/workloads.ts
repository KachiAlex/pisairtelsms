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
 * GET /api/tenant/approvals/workloads - List reviewer workloads
 * POST /api/tenant/approvals/workloads - Update reviewer workload
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
          reviewer,
          pending_count,
          eta,
          last_updated
        FROM reviewer_workloads
        WHERE tenant_id = $1
        ORDER BY pending_count DESC
      `, [tenantId])

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching reviewer workloads:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch reviewer workloads',
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

      const { reviewer, pendingCount, eta } = req.body

      if (!reviewer) {
        return res.status(400).json({ success: false, error: 'Reviewer is required' })
      }

      const result = await sql.query(`
        INSERT INTO reviewer_workloads (id, tenant_id, reviewer, pending_count, eta, last_updated)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
        ON CONFLICT (tenant_id, reviewer) 
        DO UPDATE SET 
          pending_count = EXCLUDED.pending_count,
          eta = EXCLUDED.eta,
          last_updated = NOW()
        RETURNING *
      `, [tenantId, reviewer, pendingCount || 0, eta || null])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error updating reviewer workload:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update reviewer workload',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
