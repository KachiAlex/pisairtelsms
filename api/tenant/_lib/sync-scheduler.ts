/**
 * Device Sync Scheduler
 * Manages automatic syncing of biometric devices at configured intervals
 * 
 * In a Vercel environment, this can be triggered by:
 * 1. External cron service (e.g., EasyCron, AWS EventBridge)
 * 2. Scheduled function calls from a separate service
 * 3. Manual triggers via API endpoint
 * 
 * For local development, use setInterval or a background job queue
 */

import { getDevicesByTenant, getDevice } from './biometric-devices.js'
import { syncWithRetry } from './device-sync.js'

// ============================================================================
// Types
// ============================================================================

export interface ScheduleConfig {
  tenantId: string
  frequency: 'hourly' | 'every_4_hours' | 'daily' | 'manual'
  lastRun?: Date
  nextRun?: Date
}

export interface SyncScheduleResult {
  tenantId: string
  devicesProcessed: number
  successCount: number
  failureCount: number
  partialCount: number
  totalDuration: number
  errors: string[]
}

// ============================================================================
// Scheduler Logic
// ============================================================================

/**
 * Calculate next sync time based on frequency and last sync time
 */
export function calculateNextSyncTime(
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

/**
 * Check if a device is due for sync based on its frequency and last sync time
 */
export function isDeviceDueForSync(
  lastSync: string | undefined,
  frequency: string
): boolean {
  if (frequency === 'manual') {
    return false // Manual devices never auto-sync
  }

  if (!lastSync) {
    return true // Never synced, due now
  }

  const lastSyncTime = new Date(lastSync).getTime()
  const now = Date.now()

  switch (frequency) {
    case 'hourly':
      return now - lastSyncTime >= 60 * 60 * 1000
    case 'every_4_hours':
      return now - lastSyncTime >= 4 * 60 * 60 * 1000
    case 'daily':
      return now - lastSyncTime >= 24 * 60 * 60 * 1000
    default:
      return false
  }
}

/**
 * Sync all devices for a tenant that are due for sync
 * This is the main entry point for scheduled sync operations
 */
export async function syncTenantDevices(
  tenantId: string,
  academicSession?: string,
  term?: string
): Promise<SyncScheduleResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let successCount = 0
  let failureCount = 0
  let partialCount = 0

  try {
    // Get all devices for tenant
    const devices = await getDevicesByTenant(tenantId)

    if (devices.length === 0) {
      return {
        tenantId,
        devicesProcessed: 0,
        successCount: 0,
        failureCount: 0,
        partialCount: 0,
        totalDuration: Date.now() - startTime,
        errors: [],
      }
    }

    // Process each device that's due for sync
    for (const device of devices) {
      try {
        // Skip if not due for sync
        if (!isDeviceDueForSync(device.lastSync, device.syncFrequency)) {
          continue
        }

        // Skip if in maintenance
        if (device.status === 'maintenance') {
          continue
        }

        // Perform sync with retry logic
        const result = await syncWithRetry(
          tenantId,
          device.id,
          5, // max attempts
          academicSession,
          term
        )

        if (result.status === 'success') {
          successCount++
        } else if (result.status === 'partial') {
          partialCount++
        } else {
          failureCount++
        }
      } catch (err) {
        failureCount++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Device ${device.id}: ${errorMsg}`)
      }
    }

    return {
      tenantId,
      devicesProcessed: devices.length,
      successCount,
      failureCount,
      partialCount,
      totalDuration: Date.now() - startTime,
      errors,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    errors.push(`Failed to sync tenant devices: ${errorMsg}`)

    return {
      tenantId,
      devicesProcessed: 0,
      successCount: 0,
      failureCount: 0,
      partialCount: 0,
      totalDuration: Date.now() - startTime,
      errors,
    }
  }
}

/**
 * Sync a specific device (used for manual triggers or scheduled individual syncs)
 */
export async function syncSpecificDevice(
  tenantId: string,
  deviceId: string,
  academicSession?: string,
  term?: string
): Promise<SyncScheduleResult> {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    const device = await getDevice(tenantId, deviceId)

    if (!device) {
      return {
        tenantId,
        devicesProcessed: 1,
        successCount: 0,
        failureCount: 1,
        partialCount: 0,
        totalDuration: Date.now() - startTime,
        errors: ['Device not found'],
      }
    }

    if (device.status === 'maintenance') {
      return {
        tenantId,
        devicesProcessed: 1,
        successCount: 0,
        failureCount: 1,
        partialCount: 0,
        totalDuration: Date.now() - startTime,
        errors: ['Device is in maintenance mode'],
      }
    }

    const result = await syncWithRetry(
      tenantId,
      deviceId,
      5,
      academicSession,
      term
    )

    return {
      tenantId,
      devicesProcessed: 1,
      successCount: result.status === 'success' ? 1 : 0,
      failureCount: result.status === 'failed' ? 1 : 0,
      partialCount: result.status === 'partial' ? 1 : 0,
      totalDuration: Date.now() - startTime,
      errors: result.errorDetails ? [result.errorDetails] : [],
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    return {
      tenantId,
      devicesProcessed: 1,
      successCount: 0,
      failureCount: 1,
      partialCount: 0,
      totalDuration: Date.now() - startTime,
      errors: [errorMsg],
    }
  }
}

/**
 * Get all devices that are due for sync across all tenants
 * Useful for batch scheduling operations
 */
export async function getDevicesDueForSync(
  tenantIds: string[]
): Promise<Array<{ tenantId: string; deviceId: string; frequency: string }>> {
  const devicesDue: Array<{ tenantId: string; deviceId: string; frequency: string }> = []

  for (const tenantId of tenantIds) {
    try {
      const devices = await getDevicesByTenant(tenantId)

      for (const device of devices) {
        if (
          isDeviceDueForSync(device.lastSync, device.syncFrequency) &&
          device.status !== 'maintenance'
        ) {
          devicesDue.push({
            tenantId,
            deviceId: device.id,
            frequency: device.syncFrequency,
          })
        }
      }
    } catch (err) {
      console.error(`Error checking devices for tenant ${tenantId}:`, err)
    }
  }

  return devicesDue
}

/**
 * Format sync result for logging
 */
export function formatSyncResult(result: SyncScheduleResult): string {
  const { tenantId, devicesProcessed, successCount, failureCount, partialCount, totalDuration, errors } = result

  let message = `Sync completed for tenant ${tenantId}: `
  message += `${devicesProcessed} devices processed, `
  message += `${successCount} successful, `
  message += `${partialCount} partial, `
  message += `${failureCount} failed, `
  message += `${totalDuration}ms`

  if (errors.length > 0) {
    message += ` | Errors: ${errors.slice(0, 3).join('; ')}`
    if (errors.length > 3) {
      message += ` (+${errors.length - 3} more)`
    }
  }

  return message
}
