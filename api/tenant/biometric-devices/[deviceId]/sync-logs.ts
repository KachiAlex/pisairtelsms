import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDevice, getSyncLogs } from '../../_lib/biometric-devices.js'
import { requireRole } from '../../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * GET /api/tenant/biometric-devices/[deviceId]/sync-logs
 * Returns paginated sync history for a device.
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

  const { deviceId, limit = '20', offset = '0' } = req.query

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'deviceId is required' })
  }

  let parsedLimit = parseInt(limit as string, 10)
  let parsedOffset = parseInt(offset as string, 10)
  if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 20
  if (isNaN(parsedOffset) || parsedOffset < 0) parsedOffset = 0
  if (parsedLimit > 100) parsedLimit = 100

  try {
    // Verify device belongs to tenant
    const device = await getDevice(tenantId, deviceId as string)
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' })
    }

    const result = await getSyncLogs(deviceId as string, parsedLimit, parsedOffset)

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: { total: result.total, limit: parsedLimit, offset: parsedOffset },
    })
  } catch (error) {
    console.error('Error fetching sync logs:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sync logs',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
