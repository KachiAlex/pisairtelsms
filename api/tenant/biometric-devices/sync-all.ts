/**
 * POST /api/tenant/biometric-devices/sync-all
 * Triggers sync for all devices in a tenant that are due for sync
 * 
 * This endpoint can be called by:
 * - External cron services (EasyCron, AWS EventBridge, etc.)
 * - Internal scheduled tasks
 * - Manual admin triggers
 * 
 * Authentication: Requires an authenticated staff or tenant_admin session.
 */

import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { syncTenantDevices, formatSyncResult } from '../_lib/sync-scheduler.js'
import { requireRole } from '../../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  try {
    // Extract optional academic session and term from request body
    const { academicSession, term } = req.body || {}

    // Sync all devices for tenant
    const result = await syncTenantDevices(tenantId, academicSession, term)

    // Log result
    const logMessage = formatSyncResult(result)
    console.log(logMessage)

    return res.status(200).json({
      success: true,
      data: {
        tenantId: result.tenantId,
        devicesProcessed: result.devicesProcessed,
        successCount: result.successCount,
        partialCount: result.partialCount,
        failureCount: result.failureCount,
        totalDuration: result.totalDuration,
        message: logMessage,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    })
  } catch (error) {
    console.error('Error syncing tenant devices:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to sync devices',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
