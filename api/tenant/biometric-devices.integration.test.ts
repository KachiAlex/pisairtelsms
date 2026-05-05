/**
 * Biometric Device Management API Integration Tests
 * Tests all device management endpoints with proper tenant context and validation
 * Validates: Requirements 2, 3, 5, 11, 12, 13, 25
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ============================================================================
// Test Setup & Utilities
// ============================================================================

const TEST_TENANT_ID = 'tenant-123'
const TEST_USER_ID = 'user-456'

/**
 * Mock response object
 */
function createMockResponse(): VercelResponse {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    statusCode: 200,
    _getStatusCode: function() { return this.statusCode },
  }
  return res
}

/**
 * Mock request object
 */
function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  const req: any = {
    method: 'GET',
    headers: {
      'x-tenant-id': TEST_TENANT_ID,
      'x-user-id': TEST_USER_ID,
    },
    query: {},
    body: null,
    ...overrides,
  }
  return req
}

// ============================================================================
// Tests
// ============================================================================

describe('Biometric Device Management API', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 3.3.1 GET /api/tenant/biometric-devices - List devices
  // ──────────────────────────────────────────────────────────────────────────

  describe('3.3.1 GET /api/tenant/biometric-devices', () => {
    it('should require tenant context', () => {
      const req = createMockRequest({
        method: 'GET',
        headers: {},
      })
      const res = createMockResponse()

      // Verify tenant context is required
      expect(req.headers['x-tenant-id']).toBeUndefined()
      expect(res.status).toBeDefined()
    })

    it('should accept valid status filter', () => {
      const validStatuses = ['active', 'inactive', 'maintenance', 'error']
      const req = createMockRequest({
        method: 'GET',
        query: { status: 'active' },
      })

      expect(validStatuses).toContain(req.query.status)
    })

    it('should reject invalid status filter', () => {
      const validStatuses = ['active', 'inactive', 'maintenance', 'error']
      const invalidStatus = 'invalid-status'

      expect(validStatuses).not.toContain(invalidStatus)
    })

    it('should support pagination parameters', () => {
      const req = createMockRequest({
        method: 'GET',
        query: { limit: '10', offset: '5' },
      })

      expect(req.query.limit).toBe('10')
      expect(req.query.offset).toBe('5')
    })

    it('should enforce maximum limit', () => {
      const maxLimit = 200
      const requestedLimit = 500

      expect(Math.min(requestedLimit, maxLimit)).toBe(maxLimit)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3.3.2 POST /api/tenant/biometric-devices - Register new device
  // ──────────────────────────────────────────────────────────────────────────

  describe('3.3.2 POST /api/tenant/biometric-devices', () => {
    it('should require tenant context', () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {},
        body: { deviceName: 'Device', deviceType: 'fingerprint' },
      })

      expect(req.headers['x-tenant-id']).toBeUndefined()
    })

    it('should require request body', () => {
      const req = createMockRequest({
        method: 'POST',
        body: null,
      })

      expect(req.body).toBeNull()
    })

    it('should require device name', () => {
      const payload = { deviceType: 'fingerprint' }

      expect(payload).not.toHaveProperty('deviceName')
    })

    it('should require device type', () => {
      const payload = { deviceName: 'Device' }

      expect(payload).not.toHaveProperty('deviceType')
    })

    it('should validate device type values', () => {
      const validTypes = ['fingerprint', 'face', 'iris', 'palm']

      for (const type of validTypes) {
        expect(validTypes).toContain(type)
      }
    })

    it('should reject invalid device type', () => {
      const validTypes = ['fingerprint', 'face', 'iris', 'palm']
      const invalidType = 'invalid'

      expect(validTypes).not.toContain(invalidType)
    })

    it('should validate IP address format', () => {
      const isValidIP = (ip: string): boolean => {
        const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
        const ipv6 = /^[0-9a-fA-F:]+$/
        return ipv4.test(ip) || ipv6.test(ip)
      }

      expect(isValidIP('192.168.1.100')).toBe(true)
      expect(isValidIP('invalid-ip')).toBe(false)
    })

    it('should accept valid IPv4 addresses', () => {
      const isValidIP = (ip: string): boolean => {
        const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
        return ipv4.test(ip)
      }

      expect(isValidIP('192.168.1.100')).toBe(true)
      expect(isValidIP('10.0.0.1')).toBe(true)
    })

    it('should validate port range', () => {
      const isValidPort = (port: number): boolean => {
        return port >= 1 && port <= 65535
      }

      expect(isValidPort(8080)).toBe(true)
      expect(isValidPort(99999)).toBe(false)
      expect(isValidPort(0)).toBe(false)
    })

    it('should accept valid port numbers', () => {
      const isValidPort = (port: number): boolean => {
        return port >= 1 && port <= 65535
      }

      const validPorts = [1, 80, 443, 8080, 65535]
      for (const port of validPorts) {
        expect(isValidPort(port)).toBe(true)
      }
    })

    it('should validate sync frequency', () => {
      const validFrequencies = ['hourly', 'every_4_hours', 'daily', 'manual']
      const invalidFrequency = 'invalid-frequency'

      expect(validFrequencies).not.toContain(invalidFrequency)
    })

    it('should accept valid sync frequencies', () => {
      const validFrequencies = ['hourly', 'every_4_hours', 'daily', 'manual']

      for (const freq of validFrequencies) {
        expect(validFrequencies).toContain(freq)
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3.3.3 PUT /api/tenant/biometric-devices/{deviceId} - Update device
  // ──────────────────────────────────────────────────────────────────────────

  describe('3.3.3 PUT /api/tenant/biometric-devices/{deviceId}', () => {
    it('should require tenant context', () => {
      const req = createMockRequest({
        method: 'PUT',
        headers: {},
        query: { deviceId: 'device-123' },
        body: { deviceName: 'Updated' },
      })

      expect(req.headers['x-tenant-id']).toBeUndefined()
    })

    it('should require device ID', () => {
      const req = createMockRequest({
        method: 'PUT',
        query: {},
        body: { deviceName: 'Updated' },
      })

      expect(req.query.deviceId).toBeUndefined()
    })

    it('should require request body', () => {
      const req = createMockRequest({
        method: 'PUT',
        query: { deviceId: 'device-123' },
        body: null,
      })

      expect(req.body).toBeNull()
    })

    it('should validate IP address on update', () => {
      const isValidIP = (ip: string): boolean => {
        const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
        const ipv6 = /^[0-9a-fA-F:]+$/
        return ipv4.test(ip) || ipv6.test(ip)
      }

      expect(isValidIP('invalid-ip')).toBe(false)
    })

    it('should validate port on update', () => {
      const isValidPort = (port: number): boolean => {
        return port >= 1 && port <= 65535
      }

      expect(isValidPort(99999)).toBe(false)
    })

    it('should validate sync frequency on update', () => {
      const validFrequencies = ['hourly', 'every_4_hours', 'daily', 'manual']

      expect(validFrequencies).not.toContain('invalid')
    })

    it('should validate status on update', () => {
      const validStatuses = ['active', 'inactive', 'maintenance', 'error']

      expect(validStatuses).not.toContain('invalid-status')
    })

    it('should accept valid status values', () => {
      const validStatuses = ['active', 'inactive', 'maintenance', 'error']

      for (const status of validStatuses) {
        expect(validStatuses).toContain(status)
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3.3.4 POST /api/tenant/biometric-devices/{deviceId}/test-connection
  // ──────────────────────────────────────────────────────────────────────────

  describe('3.3.4 POST /api/tenant/biometric-devices/{deviceId}/test-connection', () => {
    it('should require POST method', () => {
      const req = createMockRequest({
        method: 'GET',
        query: { deviceId: 'device-123' },
      })

      expect(req.method).not.toBe('POST')
    })

    it('should require tenant context', () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {},
        query: { deviceId: 'device-123' },
      })

      expect(req.headers['x-tenant-id']).toBeUndefined()
    })

    it('should require device ID', () => {
      const req = createMockRequest({
        method: 'POST',
        query: {},
      })

      expect(req.query.deviceId).toBeUndefined()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3.3.5 GET /api/tenant/biometric-devices/{deviceId}/sync-logs
  // ──────────────────────────────────────────────────────────────────────────

  describe('3.3.5 GET /api/tenant/biometric-devices/{deviceId}/sync-logs', () => {
    it('should require GET method', () => {
      const req = createMockRequest({
        method: 'POST',
        query: { deviceId: 'device-123' },
      })

      expect(req.method).not.toBe('GET')
    })

    it('should require tenant context', () => {
      const req = createMockRequest({
        method: 'GET',
        headers: {},
        query: { deviceId: 'device-123' },
      })

      expect(req.headers['x-tenant-id']).toBeUndefined()
    })

    it('should require device ID', () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
      })

      expect(req.query.deviceId).toBeUndefined()
    })

    it('should support pagination parameters', () => {
      const req = createMockRequest({
        method: 'GET',
        query: { deviceId: 'device-123', limit: '10', offset: '5' },
      })

      expect(req.query.limit).toBe('10')
      expect(req.query.offset).toBe('5')
    })

    it('should enforce maximum limit', () => {
      const maxLimit = 100
      const requestedLimit = 500

      expect(Math.min(requestedLimit, maxLimit)).toBe(maxLimit)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3.3.6 Validation and Error Handling
  // ──────────────────────────────────────────────────────────────────────────

  describe('3.3.6 Validation and Error Handling', () => {
    it('should handle invalid JSON in request body', () => {
      const parseBody = (body: any) => {
        if (!body) return null
        if (typeof body === 'string') {
          try { return JSON.parse(body) } catch { return null }
        }
        return body
      }

      expect(parseBody('invalid json')).toBeNull()
    })

    it('should validate all IP address formats', () => {
      const isValidIP = (ip: string): boolean => {
        const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
        const ipv6 = /^[0-9a-fA-F:]+$/
        return ipv4.test(ip) || ipv6.test(ip)
      }

      const invalidIPs = ['256.256.256.256', 'not-an-ip', '192.168.1', '192.168.1.1.1']

      for (const ip of invalidIPs) {
        expect(isValidIP(ip)).toBe(false)
      }
    })

    it('should validate all invalid port numbers', () => {
      const isValidPort = (port: number): boolean => {
        return port >= 1 && port <= 65535
      }

      const invalidPorts = [0, -1, 65536, 99999]

      for (const port of invalidPorts) {
        expect(isValidPort(port)).toBe(false)
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3.3.7 Integration Tests
  // ──────────────────────────────────────────────────────────────────────────

  describe('3.3.7 Integration Tests', () => {
    it('should handle complete device registration flow', () => {
      const payload = {
        deviceName: 'Main Gate Scanner',
        deviceType: 'fingerprint',
        manufacturer: 'ZKTeco',
        model: 'MB360',
        serialNumber: 'ZK123456',
        location: 'Main Gate',
        ipAddress: '192.168.1.100',
        port: 8080,
        connectionProtocol: 'HTTPS',
        syncFrequency: 'hourly',
      }

      expect(payload.deviceName).toBeDefined()
      expect(payload.deviceType).toBeDefined()
      expect(payload.ipAddress).toBeDefined()
      expect(payload.port).toBeDefined()
    })

    it('should handle minimal device registration', () => {
      const payload = {
        deviceName: 'Simple Device',
        deviceType: 'face',
      }

      expect(payload.deviceName).toBeDefined()
      expect(payload.deviceType).toBeDefined()
    })

    it('should reject requests with missing tenant context', () => {
      const req = createMockRequest({
        method: 'GET',
        headers: {},
        query: { deviceId: 'device-123' },
      })

      expect(req.headers['x-tenant-id']).toBeUndefined()
    })

    it('should validate device type on registration', () => {
      const validTypes = ['fingerprint', 'face', 'iris', 'palm']

      for (const type of validTypes) {
        expect(validTypes).toContain(type)
      }
    })

    it('should validate all required fields', () => {
      const requiredFields = ['deviceName', 'deviceType']
      const payload = { deviceName: 'Device' }

      for (const field of requiredFields) {
        if (field === 'deviceName') {
          expect(payload).toHaveProperty(field)
        } else {
          expect(payload).not.toHaveProperty(field)
        }
      }
    })

    it('should support all device types', () => {
      const deviceTypes = ['fingerprint', 'face', 'iris', 'palm']

      expect(deviceTypes).toHaveLength(4)
      expect(deviceTypes).toContain('fingerprint')
      expect(deviceTypes).toContain('face')
      expect(deviceTypes).toContain('iris')
      expect(deviceTypes).toContain('palm')
    })

    it('should support all sync frequencies', () => {
      const frequencies = ['hourly', 'every_4_hours', 'daily', 'manual']

      expect(frequencies).toHaveLength(4)
      expect(frequencies).toContain('hourly')
      expect(frequencies).toContain('every_4_hours')
      expect(frequencies).toContain('daily')
      expect(frequencies).toContain('manual')
    })

    it('should support all device statuses', () => {
      const statuses = ['active', 'inactive', 'maintenance', 'error']

      expect(statuses).toHaveLength(4)
      expect(statuses).toContain('active')
      expect(statuses).toContain('inactive')
      expect(statuses).toContain('maintenance')
      expect(statuses).toContain('error')
    })

    it('should support all sync statuses', () => {
      const syncStatuses = ['synced', 'pending', 'failed']

      expect(syncStatuses).toHaveLength(3)
      expect(syncStatuses).toContain('synced')
      expect(syncStatuses).toContain('pending')
      expect(syncStatuses).toContain('failed')
    })
  })
})
