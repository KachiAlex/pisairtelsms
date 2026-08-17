import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPerformanceAnalytics, type AnalyticsFilters } from '../_lib/analytics/engine.js'
import { requireRole } from '../../_lib/auth-middleware.js'

/**
 * GET /api/tenant/analytics/performance
 * Returns performance analytics including overall metrics, grade distribution, and subject ranking
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  const filters: AnalyticsFilters = {
    academicSession: req.query.academicSession as string | undefined,
    term: req.query.term as string | undefined,
    class: req.query.class as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  }

  try {
    const data = await getPerformanceAnalytics(tenantId, filters)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching performance analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch performance analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
