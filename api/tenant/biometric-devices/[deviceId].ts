import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDevice, updateDeviceConfig, updateDeviceStatus, deleteDevice } from '../_lib/biometric-devices.js'
import { requireRole } from '../../_lib/auth-middleware.js'

function getTenantId(req: VercelRequest): string | null {
  const tenantId = req.headers['x-tenant-id'] as string | undefined
  if (tenantId) return tenantId
  const queryTenantId = req.query['tenantId'] as string | undefined
  if (queryTenantId) return queryTenantId
  return null
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

function isValidIpAddress(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^[0-9a-fA-F:]+$/
  return ipv4.test(ip) || ipv6.test(ip)
}

/**
 * GET    /api/tenant/biometric-devices/[deviceId]  — get device details
 * PUT    /api/tenant/biometric-devices/[deviceId]  — update device config
 * DELETE /api/tenant/biometric-devices/[deviceId]  — delete device
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  const { deviceId } = req.query
  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ success: false, error: 'deviceId is required' })
  }

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const device = await getDevice(tenantId, deviceId)
      if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' })
      }
      return res.status(200).json({ success: true, data: device })
    } catch (error) {
      console.error('Error fetching device:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch device',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // ── PUT ──────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { deviceName, manufacturer, model, location, ipAddress, port,
            connectionProtocol, syncFrequency, status } = body

    // Validate optional fields
    if (ipAddress && !isValidIpAddress(ipAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid IP address format' })
    }

    if (port !== undefined) {
      const portNum = parseInt(port, 10)
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return res.status(400).json({ success: false, error: 'Port must be between 1 and 65535' })
      }
    }

    const validFrequencies = ['hourly', 'every_4_hours', 'daily', 'manual']
    if (syncFrequency && !validFrequencies.includes(syncFrequency)) {
      return res.status(400).json({
        success: false,
        error: `syncFrequency must be one of: ${validFrequencies.join(', ')}`,
      })
    }

    const validStatuses = ['active', 'inactive', 'maintenance', 'error']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(', ')}`,
      })
    }

    try {
      // Check device exists
      const existing = await getDevice(tenantId, deviceId)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Device not found' })
      }

      // Update status separately if provided
      if (status && status !== existing.status) {
        await updateDeviceStatus(tenantId, deviceId, status)
      }

      // Update config
      const updated = await updateDeviceConfig(tenantId, deviceId, {
        deviceName,
        manufacturer,
        model,
        location,
        ipAddress,
        port: port ? parseInt(port, 10) : undefined,
        connectionProtocol,
        syncFrequency,
      })

      return res.status(200).json({
        success: true,
        data: { ...updated, message: 'Device configuration updated' },
      })
    } catch (error) {
      console.error('Error updating device:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update device',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const existing = await getDevice(tenantId, deviceId)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Device not found' })
      }

      const deleted = await deleteDevice(tenantId, deviceId)
      if (!deleted) {
        return res.status(500).json({ success: false, error: 'Failed to delete device' })
      }

      return res.status(200).json({
        success: true,
        data: { message: 'Device deleted successfully' },
      })
    } catch (error) {
      console.error('Error deleting device:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete device',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  res.setHeader('Allow', 'GET,PUT,DELETE')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
