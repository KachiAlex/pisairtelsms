import type { VercelRequest, VercelResponse } from '@vercel/node'
import { calculateSummaryStats } from '../../_lib/attendance.js'
import { requireRole } from '../../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/attendance/analytics/dashboard
 * Returns summary attendance statistics (present/absent/late rates, total records, data freshness).
 * Query params: term?, academicSession?
 * Validates: Requirements 22
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  try {
    const { term, academicSession } = req.query

    const data = await calculateSummaryStats(
      tenantId,
      term as string | undefined,
      academicSession as string | undefined
    )

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
