/**
 * Device Sync Service
 * Handles syncing attendance data from biometric devices
 * Implements retry logic with exponential backoff
 */

import { v4 as uuidv4 } from 'uuid'
import {
  getDevice,
  logSync,
  incrementConsecutiveFailures,
  resetConsecutiveFailures,
  getEnrollments,
  findStudentByBiometricId,
} from './biometric-devices.js'
import { upsertAttendanceBatch } from './attendance.js'

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  syncId: string
  deviceId: string
  status: 'success' | 'failed' | 'partial'
  recordsSynced: number
  recordsFailed: number
  errorDetails?: string
  durationMs: number
}

export interface MockDeviceRecord {
  biometricId: string
  timestamp: string
  deviceId: string
}

// Retry delays in milliseconds (exponential backoff)
const RETRY_DELAYS = [
  0,          // Attempt 1: immediate
  60_000,     // Attempt 2: 1 minute
  300_000,    // Attempt 3: 5 minutes
  900_000,    // Attempt 4: 15 minutes
  3_600_000,  // Attempt 5: 1 hour
]

// ============================================================================
// Core Sync Logic
// ============================================================================

/**
 * Simulate fetching records from a biometric device.
 * In production this would make an HTTP request to the device's API.
 * Returns mock records based on enrolled students.
 */
async function fetchDeviceRecords(
  deviceId: string,
  tenantId: string
): Promise<MockDeviceRecord[]> {
  // Get enrolled students to generate realistic mock data
  const enrollments = await getEnrollments(deviceId)

  if (enrollments.length === 0) {
    return []
  }

  // Generate mock attendance records for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Simulate ~80% attendance rate
  const records: MockDeviceRecord[] = []
  for (const enrollment of enrollments) {
    if (Math.random() > 0.2) {
      // Present
      const checkInTime = new Date(today)
      checkInTime.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60))
      records.push({
        biometricId: enrollment.biometricId,
        timestamp: checkInTime.toISOString(),
        deviceId,
      })
    }
  }

  return records
}

/**
 * Process records from a device: map biometric IDs to student IDs,
 * validate, and upsert into attendance_records.
 */
async function processDeviceRecords(
  tenantId: string,
  deviceId: string,
  records: MockDeviceRecord[],
  academicSession: string,
  term: string
): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0
  let failed = 0
  const errors: string[] = []

  const attendancePayloads = []

  for (const record of records) {
    try {
      // Map biometric ID to student ID
      const studentId = await findStudentByBiometricId(deviceId, record.biometricId)

      if (!studentId) {
        errors.push(`Unmatched biometric ID: ${record.biometricId}`)
        failed++
        continue
      }

      // Extract date from timestamp
      const recordDate = new Date(record.timestamp)
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      if (recordDate > today) {
        errors.push(`Future date rejected for biometric ID: ${record.biometricId}`)
        failed++
        continue
      }

      const dateStr = recordDate.toISOString().split('T')[0]

      // Determine status based on check-in time (before 8am = present, after = late)
      const hour = recordDate.getHours()
      const status: 'present' | 'late' = hour < 8 ? 'present' : 'late'

      attendancePayloads.push({
        studentId,
        class: 'Unknown', // Device doesn't know class; will be resolved by admin
        date: dateStr,
        status,
        source: 'biometric_device' as const,
        deviceId,
        userId: 'system',
        academicSession,
        term,
      })
    } catch (err) {
      errors.push(`Error processing record: ${err instanceof Error ? err.message : 'Unknown error'}`)
      failed++
    }
  }

  if (attendancePayloads.length > 0) {
    try {
      const result = await upsertAttendanceBatch(tenantId, attendancePayloads)
      synced += result.inserted + result.updated
      failed += result.errors.length
      errors.push(...result.errors.map(e => e.error))
    } catch (err) {
      failed += attendancePayloads.length
      errors.push(`Batch upsert failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { synced, failed, errors }
}

/**
 * Perform a single sync attempt for a device
 */
export async function syncDevice(
  tenantId: string,
  deviceId: string,
  academicSession?: string,
  term?: string
): Promise<SyncResult> {
  const syncId = uuidv4()
  const startTime = Date.now()

  // Default academic session and term
  const currentYear = new Date().getFullYear()
  const session = academicSession || `${currentYear}/${currentYear + 1}`
  const currentTerm = term || '1'

  try {
    // Get device and check it's not in maintenance
    const device = await getDevice(tenantId, deviceId)
    if (!device) {
      throw new Error(`Device ${deviceId} not found`)
    }

    if (device.status === 'maintenance') {
      throw new Error('Device is in maintenance mode — sync blocked')
    }

    // Fetch records from device
    const deviceRecords = await fetchDeviceRecords(deviceId, tenantId)

    // Process records
    const { synced, failed, errors } = await processDeviceRecords(
      tenantId,
      deviceId,
      deviceRecords,
      session,
      currentTerm
    )

    const durationMs = Date.now() - startTime
    const status = failed === 0 ? 'success' : synced > 0 ? 'partial' : 'failed'
    const errorDetails = errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined

    // Log the sync
    await logSync(deviceId, status, synced, failed, errorDetails, durationMs)

    // Update device status
    if (status === 'failed') {
      await incrementConsecutiveFailures(tenantId, deviceId, errorDetails)
    } else {
      await resetConsecutiveFailures(tenantId, deviceId)
    }

    return {
      syncId,
      deviceId,
      status,
      recordsSynced: synced,
      recordsFailed: failed,
      errorDetails,
      durationMs,
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : 'Unknown sync error'

    // Log the failed sync
    await logSync(deviceId, 'failed', 0, 0, errorMessage, durationMs).catch(() => {})

    // Increment failure counter
    await incrementConsecutiveFailures(tenantId, deviceId, errorMessage).catch(() => {})

    return {
      syncId,
      deviceId,
      status: 'failed',
      recordsSynced: 0,
      recordsFailed: 0,
      errorDetails: errorMessage,
      durationMs,
    }
  }
}

/**
 * Sync with exponential backoff retry logic
 */
export async function syncWithRetry(
  tenantId: string,
  deviceId: string,
  maxAttempts = 5,
  academicSession?: string,
  term?: string
): Promise<SyncResult> {
  let lastResult: SyncResult | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Wait before retry (skip delay on first attempt)
    if (attempt > 0) {
      const delayMs = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    lastResult = await syncDevice(tenantId, deviceId, academicSession, term)

    if (lastResult.status === 'success' || lastResult.status === 'partial') {
      return lastResult
    }

    // Check if device was set to error status (3 consecutive failures)
    const device = await getDevice(tenantId, deviceId).catch(() => null)
    if (device?.status === 'error') {
      // Device is in error state, stop retrying
      break
    }
  }

  return lastResult!
}

/**
 * Calculate next sync time based on frequency
 */
export function getNextSyncTime(
  lastSync: string | undefined,
  frequency: string
): Date {
  const base = lastSync ? new Date(lastSync) : new Date()

  switch (frequency) {
    case 'hourly':
      return new Date(base.getTime() + 60 * 60 * 1000)
    case 'every_4_hours':
      return new Date(base.getTime() + 4 * 60 * 60 * 1000)
    case 'daily':
      return new Date(base.getTime() + 24 * 60 * 60 * 1000)
    case 'manual':
    default:
      return new Date(base.getTime() + 365 * 24 * 60 * 60 * 1000) // Far future
  }
}
