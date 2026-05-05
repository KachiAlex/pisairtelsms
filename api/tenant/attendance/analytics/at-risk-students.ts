import type { VercelRequest, VercelResponse } from '@vercel/node'
import { identifyAtRiskStudents } from '../../_lib/attendance.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/attendance/analytics/at-risk-students
 * Returns list of at-risk students (attendance below 85% in rolling 30-day period).
 * Query params: class?, reason?, limit? (default 50), offset? (default 0)
 * Validates: Requirements 15
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
      class: className,
      reason,
      limit: limitParam = '50',
      offset: offsetParam = '0',
    } = req.query

    // Parse and validate pagination parameters
    let limit = parseInt(limitParam as string, 10)
    let offset = parseInt(offsetParam as string, 10)

    if (isNaN(limit) || limit < 1) limit = 50
    if (isNaN(offset) || offset < 0) offset = 0
    if (limit > 500) limit = 500

    // Validate reason filter if provided
    const validReasons = ['absence', 'late']
    if (reason && !validReasons.includes(reason as string)) {
      return res.status(400).json({
        success: false,
        error: `reason must be one of: ${validReasons.join(', ')}`,
      })
    }

    const allStudents = await identifyAtRiskStudents(
      tenantId,
      className as string | undefined,
      reason as string | undefined
    )

    const total = allStudents.length
    const data = allStudents.slice(offset, offset + limit)

    return res.status(200).json({
      success: true,
      data,
      pagination: { total, limit, offset },
    })
  } catch (error) {
    console.error('Error fetching at-risk students:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch at-risk students',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
