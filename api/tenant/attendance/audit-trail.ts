import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGlobalAuditTrail } from '../_lib/attendance.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/attendance/audit-trail
 * Returns audit trail entries across all attendance records for a tenant.
 * Query params: studentId?, startDate?, endDate?, action?, limit? (default 50), offset? (default 0)
 * Validates: Requirements 19
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  try {
    const {
      studentId,
      startDate,
      endDate,
      action,
      limit: limitParam = '50',
      offset: offsetParam = '0',
    } = req.query

    // Validate action filter if provided
    const validActions = ['create', 'update', 'delete']
    if (action && !validActions.includes(action as string)) {
      return res.status(400).json({
        success: false,
        error: `action must be one of: ${validActions.join(', ')}`,
      })
    }

    // Parse and validate pagination parameters
    let limit = parseInt(limitParam as string, 10)
    let offset = parseInt(offsetParam as string, 10)

    if (isNaN(limit) || limit < 1) limit = 50
    if (isNaN(offset) || offset < 0) offset = 0
    if (limit > 500) limit = 500

    const result = await getGlobalAuditTrail(tenantId, {
      studentId: studentId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      action: action as string | undefined,
      limit,
      offset,
    })

    return res.status(200).json({
      success: true,
      data: result.entries,
      pagination: { total: result.total, limit, offset },
    })
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch audit trail',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
