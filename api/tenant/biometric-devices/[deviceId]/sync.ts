import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDevice } from '../../_lib/biometric-devices.js'
import { syncDevice } from '../../_lib/device-sync.js'
import { requireRole } from '../../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * POST /api/tenant/biometric-devices/[deviceId]/sync
 * Triggers a manual sync for a biometric device.
 * Can also be called by a scheduled cron job for automatic syncing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  const { deviceId } = req.query
  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'deviceId is required' })
  }

  try {
    const device = await getDevice(tenantId, deviceId as string)
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' })
    }

    if (device.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        error: 'Device is in maintenance mode. Sync is blocked until status is changed.',
      })
    }

    // Initiate sync (runs synchronously for simplicity; in production could be async/queued)
    const result = await syncDevice(tenantId, deviceId as string)

    return res.status(200).json({
      success: true,
      data: {
        syncId: result.syncId,
        status: result.status,
        recordsSynced: result.recordsSynced,
        recordsFailed: result.recordsFailed,
        durationMs: result.durationMs,
        message: result.status === 'success'
          ? `Sync completed: ${result.recordsSynced} records synced`
          : result.status === 'partial'
          ? `Partial sync: ${result.recordsSynced} synced, ${result.recordsFailed} failed`
          : `Sync failed: ${result.errorDetails}`,
        errorDetails: result.errorDetails,
      },
    })
  } catch (error) {
    console.error('Error syncing device:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to sync device',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
