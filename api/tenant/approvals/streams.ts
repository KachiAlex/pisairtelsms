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
 * GET /api/tenant/approvals/streams - List approval streams
 * POST /api/tenant/approvals/streams - Create approval stream
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      const result = await sql.query(`
        SELECT 
          id,
          surface,
          owner,
          sla_hours,
          risk,
          created_at,
          updated_at
        FROM approval_streams
        WHERE tenant_id = $1
        ORDER BY surface
      `, [tenantId])

      // Get pending counts for each stream
      const streamsWithCounts = await Promise.all(
        result.rows.map(async (stream) => {
          const countResult = await sql.query(`
            SELECT COUNT(*) as pending
            FROM approval_requests
            WHERE tenant_id = $1 AND type = $2 AND status = 'pending'
          `, [tenantId, stream.surface])
          
          return {
            ...stream,
            pending: parseInt(countResult.rows[0]?.pending || '0')
          }
        })
      )

      return res.status(200).json({
        success: true,
        data: streamsWithCounts
      })
    } catch (error) {
      console.error('Error fetching approval streams:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch approval streams',
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

      const { surface, owner, slaHours, risk = 'low' } = req.body

      if (!surface || !owner || !slaHours) {
        return res.status(400).json({ success: false, error: 'Surface, owner, and SLA hours are required' })
      }

      const result = await sql.query(`
        INSERT INTO approval_streams (id, tenant_id, surface, owner, sla_hours, risk, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [tenantId, surface, owner, slaHours, risk])

      return res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating approval stream:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create approval stream',
        details: error instanceof Error ? error.message : undefined
      })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
