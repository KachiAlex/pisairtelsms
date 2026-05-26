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
 * GET /api/tenant/tasks/workstreams - List workstreams
 * POST /api/tenant/tasks/workstreams - Create workstream
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
          progress,
          blockers,
          next_milestone,
          status,
          created_by,
          created_at,
          updated_at
        FROM workstreams
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenantId])

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching workstreams:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch workstreams',
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

      const { label, progress = 0, blockers = 0, nextMilestone } = req.body

      if (!label) {
        return res.status(400).json({ success: false, error: 'Label is required' })
      }

      const result = await sql.query(`
        INSERT INTO workstreams (id, tenant_id, label, progress, blockers, next_milestone, status, created_by, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'active', $6, NOW(), NOW())
        RETURNING *
      `, [tenantId, label, progress, blockers, nextMilestone || null, userId])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating workstream:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create workstream',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
