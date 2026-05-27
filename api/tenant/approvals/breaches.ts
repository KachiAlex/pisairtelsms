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
 * GET /api/tenant/approvals/breaches - List SLA breaches
 * POST /api/tenant/approvals/breaches - Create SLA breach record
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
      const result = await sql.query(`
        SELECT 
          id,
          label,
          owner,
          severity,
          breach_minutes,
          resolved_at,
          created_at
        FROM sla_breaches
        WHERE tenant_id = $1 AND resolved_at IS NULL
        ORDER BY created_at DESC
      `, [tenantId])

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching SLA breaches:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch SLA breaches',
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

      const { label, owner, severity = 'warning', breachMinutes } = req.body

      if (!label || !owner) {
        return res.status(400).json({ success: false, error: 'Label and owner are required' })
      }

      const result = await sql.query(`
        INSERT INTO sla_breaches (id, tenant_id, label, owner, severity, breach_minutes, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [tenantId, label, owner, severity, breachMinutes || null])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating SLA breach:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create SLA breach',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
