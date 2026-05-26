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
 * GET /api/tenant/tasks/squads - List squad assignments
 * POST /api/tenant/tasks/squads - Create squad assignment
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
          squad_name,
          owner,
          focus,
          risk,
          task_count,
          created_at,
          updated_at
        FROM squad_assignments
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenantId])

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching squad assignments:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch squad assignments',
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

      const { squadName, owner, focus, risk = 'low' } = req.body

      if (!squadName || !owner) {
        return res.status(400).json({ success: false, error: 'Squad name and owner are required' })
      }

      const result = await sql.query(`
        INSERT INTO squad_assignments (id, tenant_id, squad_name, owner, focus, risk, task_count, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 0, NOW(), NOW())
        RETURNING *
      `, [tenantId, squadName, owner, focus || null, risk])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating squad assignment:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create squad assignment',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
