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
 * GET /api/tenant/system-alerts/channels - List channel health
 * POST /api/tenant/system-alerts/channels - Update channel health
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
          channel,
          status,
          latency,
          uptime,
          last_checked,
          created_at,
          updated_at
        FROM channel_health
        WHERE tenant_id = $1
        ORDER BY channel
      `, [tenantId])

      return res.status(200).json({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Error fetching channel health:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch channel health',
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

      const { channel, status, latency, uptime } = req.body

      if (!channel || !status) {
        return res.status(400).json({ success: false, error: 'Channel and status are required' })
      }

      const result = await sql.query(`
        INSERT INTO channel_health (id, tenant_id, channel, status, latency, uptime, last_checked, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW(), NOW())
        ON CONFLICT (tenant_id, channel) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          latency = EXCLUDED.latency,
          uptime = EXCLUDED.uptime,
          last_checked = NOW(),
          updated_at = NOW()
        RETURNING *
      `, [tenantId, channel, status, latency || null, uptime || null])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error updating channel health:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update channel health',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
