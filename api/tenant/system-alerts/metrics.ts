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

/**
 * GET /api/tenant/system-alerts/metrics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

  try {
    // Get incident metrics
    const incidentResult = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as open_incidents,
        COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= CURRENT_DATE) as resolved_today,
        COUNT(*) FILTER (WHERE status = 'resolved') as total_resolved
      FROM system_alerts
      WHERE tenant_id = $1
    `, [tenantId])

    const incidents = incidentResult.rows[0]

    // Calculate average MTTR (Mean Time To Resolve)
    const mttrResult = await sql.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_minutes
      FROM system_alerts
      WHERE tenant_id = $1 AND status = 'resolved' AND resolved_at IS NOT NULL
    `, [tenantId])

    const avgMttr = mttrResult.rows[0]?.avg_minutes ? Math.round(parseFloat(mttrResult.rows[0].avg_minutes)) : 0

    // Get channel health metrics
    const channelResult = await sql.query(`
      SELECT 
        channel,
        status,
        latency,
        uptime
      FROM channel_health
      WHERE tenant_id = $1
      ORDER BY channel
    `, [tenantId])

    return res.status(200).json({
      success: true,
      data: {
        openIncidents: parseInt(incidents.open_incidents || '0'),
        resolvedToday: parseInt(incidents.resolved_today || '0'),
        avgMttr: `${avgMttr} mins`,
        pagerDutyCoverage: '100%',
        channelHealth: channelResult.rows
      }
    })
  } catch (error) {
    console.error('Error fetching system alert metrics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch system alert metrics',
      details: error instanceof Error ? error.message : undefined
    })
  }
}
