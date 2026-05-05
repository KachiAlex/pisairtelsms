/**
 * Unit tests for biometric-devices data access layer
 * Uses mocked DB functions to test logic without a real database
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DB module
vi.mock('../cbt/_lib/db.js', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}))

import * as db from '../cbt/_lib/db.js'
import {
  registerDevice,
  updateDeviceConfig,
  getDevice,
  getDeviceStatus,
  listDevices,
  updateDeviceStatus,
  deleteDevice,
  enrollStudent,
  unenrollStudent,
  getEnrollments,
  logSync,
  getSyncLogs,
  incrementConsecutiveFailures,
  resetConsecutiveFailures,
} from './biometric-devices.js'

const mockQueryOne = db.queryOne as ReturnType<typeof vi.fn>
const mockQueryAll = db.queryAll as ReturnType<typeof vi.fn>
const mockQuery = db.query as ReturnType<typeof vi.fn>

const mockDeviceRow = {
  id: 'device-1',
  tenant_id: 'tenant-1',
  device_name: 'Main Entrance Scanner',
  device_type: 'fingerprint',
  manufacturer: 'Suprema',
  model: 'BioStation 2',
  serial_number: 'SN-001',
  location: 'Main Entrance',
  status: 'inactive',
  sync_status: 'pending',
  ip_address: '192.168.1.100',
  port: 4000,
  connection_protocol: 'HTTPS',
  sync_frequency: 'daily',
  last_sync: null,
  last_error: null,
  consecutive_failures: 0,
  enrolled_students_count: 0,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

const mockSyncLogRow = {
  id: 'log-1',
  device_id: 'device-1',
  sync_timestamp: new Date('2024-01-01T10:00:00Z'),
  status: 'success',
  records_synced: 50,
  records_failed: 0,
  error_details: null,
  sync_duration_ms: 1200,
}

const mockEnrollmentRow = {
  id: 'enroll-1',
  device_id: 'device-1',
  student_id: 'student-1',
  biometric_id: 'bio-abc123',
  enrolled_at: new Date('2024-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// registerDevice
// ============================================================================

describe('registerDevice', () => {
  it('inserts a new device with status inactive and returns it', async () => {
    mockQueryOne.mockResolvedValueOnce(mockDeviceRow)

    const result = await registerDevice('tenant-1', {
      deviceName: 'Main Entrance Scanner',
      deviceType: 'fingerprint',
      manufacturer: 'Suprema',
      model: 'BioStation 2',
      serialNumber: 'SN-001',
      location: 'Main Entrance',
      ipAddress: '192.168.1.100',
      port: 4000,
    })

    expect(result.status).toBe('inactive')
    expect(result.deviceName).toBe('Main Entrance Scanner')
    expect(result.deviceType).toBe('fingerprint')
    expect(mockQueryOne).toHaveBeenCalledOnce()
    const sql = mockQueryOne.mock.calls[0][0] as string
    expect(sql).toContain("'inactive'")
  })

  it('throws if DB returns null', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    await expect(registerDevice('tenant-1', { deviceName: 'X', deviceType: 'face' })).rejects.toThrow()
  })
})

// ============================================================================
// updateDeviceConfig
// ============================================================================

describe('updateDeviceConfig', () => {
  it('updates device fields and returns updated device', async () => {
    const updatedRow = { ...mockDeviceRow, device_name: 'Updated Name', location: 'New Location' }
    mockQueryOne.mockResolvedValueOnce(updatedRow)

    const result = await updateDeviceConfig('tenant-1', 'device-1', {
      deviceName: 'Updated Name',
      location: 'New Location',
    })

    expect(result.deviceName).toBe('Updated Name')
    expect(result.location).toBe('New Location')
  })

  it('throws if device not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    await expect(updateDeviceConfig('tenant-1', 'bad-id', { deviceName: 'X' })).rejects.toThrow('Device not found')
  })
})

// ============================================================================
// getDevice
// ============================================================================

describe('getDevice', () => {
  it('returns device when found', async () => {
    mockQueryOne.mockResolvedValueOnce(mockDeviceRow)
    const result = await getDevice('tenant-1', 'device-1')
    expect(result).not.toBeNull()
    expect(result?.id).toBe('device-1')
  })

  it('returns null when not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    const result = await getDevice('tenant-1', 'missing')
    expect(result).toBeNull()
  })
})

// ============================================================================
// getDeviceStatus
// ============================================================================

describe('getDeviceStatus', () => {
  it('returns device status information when found', async () => {
    mockQueryOne.mockResolvedValueOnce({
      status: 'active',
      sync_status: 'synced',
      last_sync: new Date('2024-01-01T10:00:00Z'),
      last_error: null,
      consecutive_failures: 0,
    })
    const result = await getDeviceStatus('tenant-1', 'device-1')
    expect(result).not.toBeNull()
    expect(result?.status).toBe('active')
    expect(result?.syncStatus).toBe('synced')
    expect(result?.consecutiveFailures).toBe(0)
  })

  it('returns null when device not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    const result = await getDeviceStatus('tenant-1', 'missing')
    expect(result).toBeNull()
  })
})

// ============================================================================
// listDevices
// ============================================================================

describe('listDevices', () => {
  it('returns devices and total count', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '2' })
    mockQueryAll.mockResolvedValueOnce([mockDeviceRow, { ...mockDeviceRow, id: 'device-2' }])

    const result = await listDevices('tenant-1')
    expect(result.total).toBe(2)
    expect(result.devices).toHaveLength(2)
  })

  it('filters by status when provided', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '1' })
    mockQueryAll.mockResolvedValueOnce([{ ...mockDeviceRow, status: 'active' }])

    const result = await listDevices('tenant-1', { status: 'active' })
    expect(result.devices[0].status).toBe('active')
    const sql = mockQueryAll.mock.calls[0][0] as string
    expect(sql).toContain('status')
  })

  it('returns empty list when no devices', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '0' })
    mockQueryAll.mockResolvedValueOnce([])

    const result = await listDevices('tenant-1')
    expect(result.total).toBe(0)
    expect(result.devices).toHaveLength(0)
  })
})

// ============================================================================
// updateDeviceStatus
// ============================================================================

describe('updateDeviceStatus', () => {
  it('updates status and returns device', async () => {
    const updatedRow = { ...mockDeviceRow, status: 'active' }
    mockQueryOne.mockResolvedValueOnce(updatedRow)

    const result = await updateDeviceStatus('tenant-1', 'device-1', 'active')
    expect(result.status).toBe('active')
  })

  it('throws if device not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    await expect(updateDeviceStatus('tenant-1', 'bad-id', 'active')).rejects.toThrow('Device not found')
  })
})

// ============================================================================
// deleteDevice
// ============================================================================

describe('deleteDevice', () => {
  it('sets device to inactive and returns success', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const result = await deleteDevice('tenant-1', 'device-1')
    expect(result.success).toBe(true)
  })

  it('throws if device not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })
    await expect(deleteDevice('tenant-1', 'bad-id')).rejects.toThrow('Device not found')
  })
})

// ============================================================================
// enrollStudent
// ============================================================================

describe('enrollStudent', () => {
  it('inserts enrollment and updates count', async () => {
    mockQueryOne.mockResolvedValueOnce(mockEnrollmentRow)
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const result = await enrollStudent('device-1', 'student-1', 'bio-abc123')
    expect(result.studentId).toBe('student-1')
    expect(result.biometricId).toBe('bio-abc123')
    expect(mockQuery).toHaveBeenCalledOnce()
  })

  it('throws if DB returns null', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    await expect(enrollStudent('device-1', 'student-1', 'bio-abc123')).rejects.toThrow()
  })
})

// ============================================================================
// unenrollStudent
// ============================================================================

describe('unenrollStudent', () => {
  it('deletes enrollment and updates count', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const result = await unenrollStudent('device-1', 'student-1')
    expect(result.success).toBe(true)
  })

  it('throws if enrollment not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })
    await expect(unenrollStudent('device-1', 'student-1')).rejects.toThrow('Enrollment not found')
  })
})

// ============================================================================
// getEnrollments
// ============================================================================

describe('getEnrollments', () => {
  it('returns list of enrollments', async () => {
    mockQueryAll.mockResolvedValueOnce([mockEnrollmentRow])
    const result = await getEnrollments('device-1')
    expect(result).toHaveLength(1)
    expect(result[0].biometricId).toBe('bio-abc123')
  })

  it('returns empty array when no enrollments', async () => {
    mockQueryAll.mockResolvedValueOnce([])
    const result = await getEnrollments('device-1')
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// logSync
// ============================================================================

describe('logSync', () => {
  it('inserts sync log and updates device sync status', async () => {
    mockQueryOne.mockResolvedValueOnce(mockSyncLogRow)
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const result = await logSync('device-1', 'success', 50, 0, undefined, 1200)
    expect(result.status).toBe('success')
    expect(result.recordsSynced).toBe(50)
    expect(result.syncDurationMs).toBe(1200)
  })

  it('sets sync_status to failed on failure', async () => {
    const failedRow = { ...mockSyncLogRow, status: 'failed', records_synced: 0, records_failed: 5 }
    mockQueryOne.mockResolvedValueOnce(failedRow)
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const result = await logSync('device-1', 'failed', 0, 5, 'Connection timeout')
    expect(result.status).toBe('failed')
    expect(result.recordsFailed).toBe(5)
  })
})

// ============================================================================
// getSyncLogs
// ============================================================================

describe('getSyncLogs', () => {
  it('returns paginated sync logs', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '3' })
    mockQueryAll.mockResolvedValueOnce([mockSyncLogRow])

    const result = await getSyncLogs('device-1', 20, 0)
    expect(result.total).toBe(3)
    expect(result.logs).toHaveLength(1)
  })
})

// ============================================================================
// incrementConsecutiveFailures
// ============================================================================

describe('incrementConsecutiveFailures', () => {
  it('increments counter and returns updated device', async () => {
    const updatedRow = { ...mockDeviceRow, consecutive_failures: 1 }
    mockQueryOne.mockResolvedValueOnce(updatedRow)

    const result = await incrementConsecutiveFailures('tenant-1', 'device-1')
    expect(result.consecutiveFailures).toBe(1)
  })

  it('sets status to error when failures reach 3', async () => {
    const updatedRow = { ...mockDeviceRow, consecutive_failures: 3, status: 'error' }
    mockQueryOne.mockResolvedValueOnce(updatedRow)

    const result = await incrementConsecutiveFailures('tenant-1', 'device-1')
    expect(result.status).toBe('error')
    expect(result.consecutiveFailures).toBe(3)
  })

  it('throws if device not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    await expect(incrementConsecutiveFailures('tenant-1', 'bad-id')).rejects.toThrow('Device not found')
  })
})

// ============================================================================
// resetConsecutiveFailures
// ============================================================================

describe('resetConsecutiveFailures', () => {
  it('resets counter to 0 and sets status to active', async () => {
    const updatedRow = { ...mockDeviceRow, consecutive_failures: 0, status: 'active' }
    mockQueryOne.mockResolvedValueOnce(updatedRow)

    const result = await resetConsecutiveFailures('tenant-1', 'device-1')
    expect(result.consecutiveFailures).toBe(0)
    expect(result.status).toBe('active')
  })

  it('throws if device not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    await expect(resetConsecutiveFailures('tenant-1', 'bad-id')).rejects.toThrow('Device not found')
  })
})
