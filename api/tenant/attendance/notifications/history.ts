import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStudentNotificationHistory, getGuardianNotificationHistory } from '../../_lib/guardian-notifications.js'
import { requireRole } from '../../../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/attendance/notifications/history
 * Get notification history for a student or guardian
 * Query params: studentId?, guardianEmail?, limit? (default 50), offset? (default 0)
 * Validates: Requirements 18
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
    const { studentId, guardianEmail, limit: limitParam = '50', offset: offsetParam = '0' } = req.query

    // Parse and validate pagination parameters
    let limit = parseInt(limitParam as string, 10)
    let offset = parseInt(offsetParam as string, 10)

    if (isNaN(limit) || limit < 1) limit = 50
    if (isNaN(offset) || offset < 0) offset = 0
    if (limit > 500) limit = 500

    // Validate that either studentId or guardianEmail is provided
    if (!studentId && !guardianEmail) {
      return res.status(400).json({
        success: false,
        error: 'Either studentId or guardianEmail query parameter is required',
      })
    }

    let result

    if (studentId) {
      result = await getStudentNotificationHistory(
        tenantId,
        studentId as string,
        limit,
        offset
      )
    } else {
      result = await getGuardianNotificationHistory(
        tenantId,
        guardianEmail as string,
        limit,
        offset
      )
    }

    return res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching notification history:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notification history',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
