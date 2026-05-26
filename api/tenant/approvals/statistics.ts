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

/**
 * GET /api/tenant/approvals/statistics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

  try {
    // Get approval statistics
    const statsResult = await sql.query(`
      SELECT 
        COUNT(*) as total_pending,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_review') as in_review,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM approval_requests
      WHERE tenant_id = $1
    `, [tenantId])

    const stats = statsResult.rows[0]

    // Calculate SLA compliance
    const slaResult = await sql.query(`
      SELECT 
        COUNT(*) FILTER (WHERE sla_deadline >= NOW() OR status = 'approved') as within_sla,
        COUNT(*) as total
      FROM approval_requests
      WHERE tenant_id = $1 AND submitted_at >= CURRENT_DATE - INTERVAL '30 days'
    `, [tenantId])

    const slaData = slaResult.rows[0]
    const slaCompliance = slaData.total > 0 ? Math.round((slaData.within_sla / slaData.total) * 100) : 0

    // Get escalation count
    const escalationResult = await sql.query(`
      SELECT COUNT(*) as count
      FROM sla_breaches
      WHERE tenant_id = $1 AND resolved_at IS NULL
    `, [tenantId])

    const escalations = parseInt(escalationResult.rows[0]?.count || '0')

    // Get fastest stream
    const fastestStreamResult = await sql.query(`
      SELECT 
        ar.type,
        AVG(EXTRACT(EPOCH FROM (ar.approved_at - ar.submitted_at)) / 60) as avg_minutes
      FROM approval_requests ar
      WHERE ar.tenant_id = $1 
        AND ar.status = 'approved' 
        AND ar.approved_at IS NOT NULL
      GROUP BY ar.type
      ORDER BY avg_minutes ASC
      LIMIT 1
    `, [tenantId])

    const fastestStream = fastestStreamResult.rows[0]
    const fastestStreamName = fastestStream?.type || 'N/A'
    const avgTurnaround = fastestStream?.avg_minutes ? `${Math.round(parseFloat(fastestStream.avg_minutes))}m` : 'N/A'

    return res.status(200).json({
      success: true,
      data: {
        itemsAwaitingAction: parseInt(stats.pending || '0') + parseInt(stats.in_review || '0'),
        withinSla: slaCompliance,
        escalationsOpen: escalations,
        fastestStream: fastestStreamName,
        avgTurnaround: avgTurnaround
      }
    })
  } catch (error) {
    console.error('Error fetching approval statistics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch approval statistics',
      details: error instanceof Error ? error.message : undefined
    })
  }
}
