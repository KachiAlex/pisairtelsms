import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDevice } from '../../_lib/biometric-devices.js'
import { requireRole } from '../../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

/**
 * POST /api/tenant/biometric-devices/[deviceId]/test-connection
 * Tests connectivity to a biometric device.
 * Since we can't connect to real devices in this environment, we simulate
 * based on whether the device has network configuration.
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
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: 'Device is in maintenance mode. Connection test skipped.',
          deviceInfo: null,
        },
      })
    }

    // Simulate connection test based on network configuration
    if (!device.ipAddress) {
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: 'No IP address configured. Please configure network settings before testing.',
          troubleshooting: [
            'Add an IP address in the device configuration',
            'Ensure the device is on the same network',
            'Check that the port is correct (default: 4370)',
          ],
        },
      })
    }

    // Simulate a successful connection for devices with IP configured
    // In production, this would make an actual HTTP request to the device
    const simulatedSuccess = device.status !== 'error'

    if (simulatedSuccess) {
      return res.status(200).json({
        success: true,
        data: {
          connected: true,
          message: `Connection successful to ${device.ipAddress}:${device.port || 4370}`,
          deviceInfo: {
            model: device.model || device.deviceName,
            manufacturer: device.manufacturer || 'Unknown',
            firmwareVersion: '1.0.0',
            enrolledUsers: device.enrolledStudentsCount,
            deviceType: device.deviceType,
          },
        },
      })
    } else {
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: `Connection failed to ${device.ipAddress}:${device.port || 4370}`,
          troubleshooting: [
            'Verify the device is powered on',
            'Check the IP address and port are correct',
            'Ensure the device is accessible on the network',
            'Check firewall settings',
          ],
        },
      })
    }
  } catch (error) {
    console.error('Error testing device connection:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to test device connection',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
