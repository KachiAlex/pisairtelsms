/**
 * Unit tests for sync-scheduler service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('./biometric-devices.js', () => ({
  getDevicesByTenant: vi.fn(),
  getDevice: vi.fn(),
}))

vi.mock('./device-sync.js', () => ({
  syncWithRetry: vi.fn(),
}))

import * as biometricDevices from './biometric-devices.js'
import * as deviceSync from './device-sync.js'
import {
  calculateNextSyncTime,
  isDeviceDueForSync,
  syncTenantDevices,
  syncSpecificDevice,
  getDevicesDueForSync,
  formatSyncResult,
} from './sync-scheduler.js'

const mockGetDevicesByTenant = biometricDevices.getDevicesByTenant as ReturnType<typeof vi.fn>
const mockGetDevice = biometricDevices.getDevice as ReturnType<typeof vi.fn>
const mockSyncWithRetry = deviceSync.syncWithRetry as ReturnType<typeof vi.fn>

const mockDevice = {
  id: 'device-1',
  tenantId: 'tenant-1',
  deviceName: 'Test Scanner',
  deviceType: 'fingerprint' as const,
  status: 'active' as const,
  syncStatus: 'pending' as const,
  syncFrequency: 'daily' as const,
  consecutiveFailures: 0,
  enrolledStudentsCount: 2,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// calculateNextSyncTime
// ============================================================================

describe('calculateNextSyncTime', () => {
  it('returns 1 hour from now for hourly frequency', () => {
    const now = new Date()
    const next = calculateNextSyncTime(now.toISOString(), 'hourly')
    const diff = next.getTime() - now.getTime()

    expect(diff).toBeGreaterThan(59 * 60 * 1000)
    expect(diff).toBeLessThan(61 * 60 * 1000)
  })

  it('returns 4 hours from now for every_4_hours frequency', () => {
    const now = new Date()
    const next = calculateNextSyncTime(now.toISOString(), 'every_4_hours')
    const diff = next.getTime() - now.getTime()

    expect(diff).toBeGreaterThan(4 * 60 * 60 * 1000 - 1000)
    expect(diff).toBeLessThan(4 * 60 * 60 * 1000 + 1000)
  })

  it('returns 24 hours from now for daily frequency', () => {
    const now = new Date()
    const next = calculateNextSyncTime(now.toISOString(), 'daily')
    const diff = next.getTime() - now.getTime()

    expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 1000)
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000 + 1000)
  })

  it('returns far future for manual frequency', () => {
    const now = new Date()
    const next = calculateNextSyncTime(now.toISOString(), 'manual')
    const diff = next.getTime() - now.getTime()

    expect(diff).toBeGreaterThanOrEqual(365 * 24 * 60 * 60 * 1000)
  })

  it('uses current time if lastSync is undefined', () => {
    const before = Date.now()
    const next = calculateNextSyncTime(undefined, 'hourly')
    const after = Date.now()

    const diff = next.getTime() - before
    expect(diff).toBeGreaterThan(59 * 60 * 1000)
    expect(diff).toBeLessThan(61 * 60 * 1000)
  })
})

// ============================================================================
// isDeviceDueForSync
// ============================================================================

describe('isDeviceDueForSync', () => {
  it('returns true if never synced', () => {
    const result = isDeviceDueForSync(undefined, 'daily')
    expect(result).toBe(true)
  })

  it('returns false for manual frequency', () => {
    const result = isDeviceDueForSync(new Date().toISOString(), 'manual')
    expect(result).toBe(false)
  })

  it('returns true if hourly and last sync > 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString()
    const result = isDeviceDueForSync(oneHourAgo, 'hourly')
    expect(result).toBe(true)
  })

  it('returns false if hourly and last sync < 1 hour ago', () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const result = isDeviceDueForSync(thirtyMinutesAgo, 'hourly')
    expect(result).toBe(false)
  })

  it('returns true if daily and last sync > 24 hours ago', () => {
    const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const result = isDeviceDueForSync(oneDayAgo, 'daily')
    expect(result).toBe(true)
  })

  it('returns false if daily and last sync < 24 hours ago', () => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    const result = isDeviceDueForSync(twelveHoursAgo, 'daily')
    expect(result).toBe(false)
  })

  it('returns true if every_4_hours and last sync > 4 hours ago', () => {
    const fourHoursAgo = new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString()
    const result = isDeviceDueForSync(fourHoursAgo, 'every_4_hours')
    expect(result).toBe(true)
  })

  it('returns false if every_4_hours and last sync < 4 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const result = isDeviceDueForSync(twoHoursAgo, 'every_4_hours')
    expect(result).toBe(false)
  })
})

// ============================================================================
// syncTenantDevices
// ============================================================================

describe('syncTenantDevices', () => {
  it('returns empty result if no devices', async () => {
    mockGetDevicesByTenant.mockResolvedValueOnce([])

    const result = await syncTenantDevices('tenant-1')

    expect(result.tenantId).toBe('tenant-1')
    expect(result.devicesProcessed).toBe(0)
    expect(result.successCount).toBe(0)
    expect(result.failureCount).toBe(0)
  })

  it('skips devices not due for sync', async () => {
    const recentSync = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, lastSync: recentSync, syncFrequency: 'hourly' },
    ])

    const result = await syncTenantDevices('tenant-1')

    expect(result.devicesProcessed).toBe(1)
    expect(result.successCount).toBe(0)
    expect(result.failureCount).toBe(0)
    expect(mockSyncWithRetry).not.toHaveBeenCalled()
  })

  it('skips devices in maintenance', async () => {
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, status: 'maintenance' },
    ])

    const result = await syncTenantDevices('tenant-1')

    expect(result.devicesProcessed).toBe(1)
    expect(result.successCount).toBe(0)
    expect(result.failureCount).toBe(0)
    expect(mockSyncWithRetry).not.toHaveBeenCalled()
  })

  it('syncs devices due for sync', async () => {
    const oldSync = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, lastSync: oldSync, syncFrequency: 'daily' },
    ])
    mockSyncWithRetry.mockResolvedValueOnce({
      syncId: 'sync-1',
      deviceId: 'device-1',
      status: 'success',
      recordsSynced: 10,
      recordsFailed: 0,
      durationMs: 1000,
    })

    const result = await syncTenantDevices('tenant-1')

    expect(result.devicesProcessed).toBe(1)
    expect(result.successCount).toBe(1)
    expect(mockSyncWithRetry).toHaveBeenCalledWith('tenant-1', 'device-1', 5, undefined, undefined)
  })

  it('counts partial syncs', async () => {
    const oldSync = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, lastSync: oldSync, syncFrequency: 'daily' },
    ])
    mockSyncWithRetry.mockResolvedValueOnce({
      syncId: 'sync-1',
      deviceId: 'device-1',
      status: 'partial',
      recordsSynced: 5,
      recordsFailed: 2,
      durationMs: 1000,
    })

    const result = await syncTenantDevices('tenant-1')

    expect(result.partialCount).toBe(1)
    expect(result.successCount).toBe(0)
  })

  it('counts failed syncs', async () => {
    const oldSync = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, lastSync: oldSync, syncFrequency: 'daily' },
    ])
    mockSyncWithRetry.mockResolvedValueOnce({
      syncId: 'sync-1',
      deviceId: 'device-1',
      status: 'failed',
      recordsSynced: 0,
      recordsFailed: 0,
      errorDetails: 'Connection timeout',
      durationMs: 1000,
    })

    const result = await syncTenantDevices('tenant-1')

    expect(result.failureCount).toBe(1)
    expect(result.successCount).toBe(0)
  })

  it('handles errors gracefully', async () => {
    mockGetDevicesByTenant.mockRejectedValueOnce(new Error('DB error'))

    const result = await syncTenantDevices('tenant-1')

    expect(result.devicesProcessed).toBe(0)
    expect(result.failureCount).toBe(0)
    expect(result.errors).toContain('Failed to sync tenant devices: DB error')
  })

  it('passes academic session and term to sync', async () => {
    const oldSync = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, lastSync: oldSync, syncFrequency: 'daily' },
    ])
    mockSyncWithRetry.mockResolvedValueOnce({
      syncId: 'sync-1',
      deviceId: 'device-1',
      status: 'success',
      recordsSynced: 10,
      recordsFailed: 0,
      durationMs: 1000,
    })

    await syncTenantDevices('tenant-1', '2024/2025', '1')

    expect(mockSyncWithRetry).toHaveBeenCalledWith('tenant-1', 'device-1', 5, '2024/2025', '1')
  })
})

// ============================================================================
// syncSpecificDevice
// ============================================================================

describe('syncSpecificDevice', () => {
  it('returns error if device not found', async () => {
    mockGetDevice.mockResolvedValueOnce(null)

    const result = await syncSpecificDevice('tenant-1', 'device-1')

    expect(result.devicesProcessed).toBe(1)
    expect(result.failureCount).toBe(1)
    expect(result.errors).toContain('Device not found')
  })

  it('returns error if device in maintenance', async () => {
    mockGetDevice.mockResolvedValueOnce({ ...mockDevice, status: 'maintenance' })

    const result = await syncSpecificDevice('tenant-1', 'device-1')

    expect(result.devicesProcessed).toBe(1)
    expect(result.failureCount).toBe(1)
    expect(result.errors).toContain('Device is in maintenance mode')
  })

  it('syncs specific device', async () => {
    mockGetDevice.mockResolvedValueOnce(mockDevice)
    mockSyncWithRetry.mockResolvedValueOnce({
      syncId: 'sync-1',
      deviceId: 'device-1',
      status: 'success',
      recordsSynced: 10,
      recordsFailed: 0,
      durationMs: 1000,
    })

    const result = await syncSpecificDevice('tenant-1', 'device-1')

    expect(result.devicesProcessed).toBe(1)
    expect(result.successCount).toBe(1)
    expect(mockSyncWithRetry).toHaveBeenCalledWith('tenant-1', 'device-1', 5, undefined, undefined)
  })

  it('handles sync errors', async () => {
    mockGetDevice.mockResolvedValueOnce(mockDevice)
    mockSyncWithRetry.mockRejectedValueOnce(new Error('Sync failed'))

    const result = await syncSpecificDevice('tenant-1', 'device-1')

    expect(result.failureCount).toBe(1)
    expect(result.errors).toContain('Sync failed')
  })
})

// ============================================================================
// getDevicesDueForSync
// ============================================================================

describe('getDevicesDueForSync', () => {
  it('returns empty array if no devices due', async () => {
    const recentSync = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, lastSync: recentSync, syncFrequency: 'hourly' },
    ])

    const result = await getDevicesDueForSync(['tenant-1'])

    expect(result).toHaveLength(0)
  })

  it('returns devices due for sync', async () => {
    const oldSync = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, id: 'device-1', lastSync: oldSync, syncFrequency: 'daily' },
    ])

    const result = await getDevicesDueForSync(['tenant-1'])

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      tenantId: 'tenant-1',
      deviceId: 'device-1',
      frequency: 'daily',
    })
  })

  it('skips devices in maintenance', async () => {
    const oldSync = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetDevicesByTenant.mockResolvedValueOnce([
      { ...mockDevice, lastSync: oldSync, syncFrequency: 'daily', status: 'maintenance' },
    ])

    const result = await getDevicesDueForSync(['tenant-1'])

    expect(result).toHaveLength(0)
  })

  it('handles multiple tenants', async () => {
    const oldSync = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetDevicesByTenant
      .mockResolvedValueOnce([
        { ...mockDevice, id: 'device-1', lastSync: oldSync, syncFrequency: 'daily' },
      ])
      .mockResolvedValueOnce([
        { ...mockDevice, id: 'device-2', lastSync: oldSync, syncFrequency: 'daily' },
      ])

    const result = await getDevicesDueForSync(['tenant-1', 'tenant-2'])

    expect(result).toHaveLength(2)
    expect(result[0].tenantId).toBe('tenant-1')
    expect(result[1].tenantId).toBe('tenant-2')
  })

  it('handles errors gracefully', async () => {
    mockGetDevicesByTenant.mockRejectedValueOnce(new Error('DB error'))

    const result = await getDevicesDueForSync(['tenant-1'])

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// formatSyncResult
// ============================================================================

describe('formatSyncResult', () => {
  it('formats successful sync result', () => {
    const result = {
      tenantId: 'tenant-1',
      devicesProcessed: 5,
      successCount: 5,
      failureCount: 0,
      partialCount: 0,
      totalDuration: 5000,
      errors: [],
    }

    const formatted = formatSyncResult(result)

    expect(formatted).toContain('tenant-1')
    expect(formatted).toContain('5 devices processed')
    expect(formatted).toContain('5 successful')
    expect(formatted).toContain('5000ms')
  })

  it('formats result with errors', () => {
    const result = {
      tenantId: 'tenant-1',
      devicesProcessed: 5,
      successCount: 3,
      failureCount: 2,
      partialCount: 0,
      totalDuration: 5000,
      errors: ['Error 1', 'Error 2', 'Error 3'],
    }

    const formatted = formatSyncResult(result)

    expect(formatted).toContain('Error 1')
    expect(formatted).toContain('Error 2')
    expect(formatted).toContain('Error 3')
    // With 3 errors shown and 3 total, there are 0 more
    expect(formatted).not.toContain('(+')
  })

  it('truncates long error lists', () => {
    const errors = Array.from({ length: 10 }, (_, i) => `Error ${i + 1}`)
    const result = {
      tenantId: 'tenant-1',
      devicesProcessed: 10,
      successCount: 0,
      failureCount: 10,
      partialCount: 0,
      totalDuration: 5000,
      errors,
    }

    const formatted = formatSyncResult(result)

    expect(formatted).toContain('(+7 more)')
  })
})
