import type { VercelRequest, VercelResponse } from '@vercel/node'
import { triggerAtRiskNotifications } from '../../_lib/attendance.js'
import { getBulkNotificationJob } from '../../_lib/guardian-notifications.js'
import { requireRole } from '../../../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * POST /api/tenant/attendance/notifications/bulk-send
 * Send bulk notifications to guardians of at-risk students
 * Validates: Requirements 18
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  try {
    const { class: className, userId } = req.body

    // Trigger notifications for at-risk students
    const result = await triggerAtRiskNotifications(tenantId, className, userId)

    if (result.notificationCount === 0) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'No at-risk students found',
          notificationCount: 0,
          jobId: result.jobId,
        },
      })
    }

    // Get job details
    const job = await getBulkNotificationJob(result.jobId)

    return res.status(200).json({
      success: true,
      data: {
        message: `Notifications sent to ${result.notificationCount} guardians`,
        notificationCount: result.notificationCount,
        jobId: result.jobId,
        job,
      },
    })
  } catch (error) {
    console.error('Error sending bulk notifications:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send bulk notifications',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
