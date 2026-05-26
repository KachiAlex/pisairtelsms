import type { VercelRequest, VercelResponse } from '@vercel/node'
import { registerDevice, listDevices } from './_lib/biometric-devices.js'
import { requireRole } from '../_lib/auth-middleware.js'

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
 * GET  /api/tenant/biometric-devices  — list devices
 * POST /api/tenant/biometric-devices  — register new device
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required (x-tenant-id header)' })
  }

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { status, limit = '50', offset = '0' } = req.query

      let parsedLimit = parseInt(limit as string, 10)
      let parsedOffset = parseInt(offset as string, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 50
      if (isNaN(parsedOffset) || parsedOffset < 0) parsedOffset = 0
      if (parsedLimit > 200) parsedLimit = 200

      const validStatuses = ['active', 'inactive', 'maintenance', 'error']
      if (status && !validStatuses.includes(status as string)) {
        return res.status(400).json({
          success: false,
          error: `status must be one of: ${validStatuses.join(', ')}`,
        })
      }

      const result = await listDevices(tenantId, {
        status: status as string | undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      })

      return res.status(200).json({
        success: true,
        data: result.devices,
        pagination: { total: result.total, limit: parsedLimit, offset: parsedOffset },
      })
    } catch (error) {
      console.error('Error listing devices:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to list devices',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { deviceName, deviceType, manufacturer, model, serialNumber, location,
            ipAddress, port, connectionProtocol, syncFrequency } = body

    // Validate required fields
    if (!deviceName) {
      return res.status(400).json({ success: false, error: 'deviceName is required' })
    }

    const validTypes = ['fingerprint', 'face', 'iris', 'palm']
    if (!deviceType || !validTypes.includes(deviceType)) {
      return res.status(400).json({
        success: false,
        error: `deviceType must be one of: ${validTypes.join(', ')}`,
      })
    }

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

    try {
      const device = await registerDevice(tenantId, {
        deviceName,
        deviceType,
        manufacturer,
        model,
        serialNumber,
        location,
        ipAddress,
        port: port ? parseInt(port, 10) : undefined,
        connectionProtocol,
        syncFrequency,
      })

      return res.status(201).json({
        success: true,
        data: {
          ...device,
          message: 'Device registered successfully. Status: inactive until first sync.',
        },
      })
    } catch (error) {
      console.error('Error registering device:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to register device',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
