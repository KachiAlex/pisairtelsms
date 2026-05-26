/**
 * POST /api/tenant/biometric-devices/sync-all
 * Triggers sync for all devices in a tenant that are due for sync
 * 
 * This endpoint can be called by:
 * - External cron services (EasyCron, AWS EventBridge, etc.)
 * - Internal scheduled tasks
 * - Manual admin triggers
 * 
 * Authentication: Requires x-tenant-id header or API key
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { syncTenantDevices, formatSyncResult } from '../_lib/sync-scheduler.js'
import { requireRole } from '../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * Verify request is authorized (basic check)
 * In production, implement proper API key validation
 */
function isAuthorized(req: VercelRequest): boolean {
  // Check for API key in header
  const apiKey = req.headers['x-api-key'] as string | undefined
  if (apiKey) {
    // In production, validate against stored API keys
    return true
  }

  // Check for tenant context (less secure but acceptable for internal use)
  const tenantId = getTenantId(req)
  return !!tenantId
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Check authorization
  if (!isAuthorized(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Provide x-tenant-id header or x-api-key.',
    })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant context required (x-tenant-id header)',
    })
  }

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
