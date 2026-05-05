/**
 * Biometric Device Database Library
 * Handles all database operations for biometric device management
 */

import { queryAll, queryOne, query } from '../cbt/_lib/db.js'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Type Definitions
// ============================================================================

export interface BiometricDevice {
  id: string
  tenantId: string
  deviceName: string
  deviceType: 'fingerprint' | 'face' | 'iris' | 'palm'
  manufacturer?: string
  model?: string
  serialNumber?: string
  location?: string
  status: 'active' | 'inactive' | 'maintenance' | 'error'
  syncStatus: 'synced' | 'pending' | 'failed'
  ipAddress?: string
  port?: number
  connectionProtocol?: string
  syncFrequency: 'hourly' | 'every_4_hours' | 'daily' | 'manual'
  lastSync?: string
  lastError?: string
  consecutiveFailures: number
  enrolledStudentsCount: number
  createdAt: string
  updatedAt: string
}

export interface DeviceSyncLog {
  id: string
  deviceId: string
  syncTimestamp: string
  status: 'success' | 'failed' | 'partial'
  recordsSynced: number
  recordsFailed: number
  errorDetails?: string
  syncDurationMs?: number
}

export interface DeviceEnrollment {
  id: string
  deviceId: string
  studentId: string
  biometricId: string
  enrolledAt: string
}

export interface RegisterDevicePayload {
  deviceName: string
  deviceType: 'fingerprint' | 'face' | 'iris' | 'palm'
  manufacturer?: string
  model?: string
  serialNumber?: string
  location?: string
  ipAddress?: string
  port?: number
  connectionProtocol?: string
  syncFrequency?: 'hourly' | 'every_4_hours' | 'daily' | 'manual'
}

export interface ListDevicesFilter {
  status?: string
  limit?: number
  offset?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

function rowToDevice(row: any): BiometricDevice {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    deviceName: row.device_name,
    deviceType: row.device_type,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serial_number,
    location: row.location,
    status: row.status,
    syncStatus: row.sync_status,
    ipAddress: row.ip_address,
    port: row.port,
    connectionProtocol: row.connection_protocol,
    syncFrequency: row.sync_frequency,
    lastSync: row.last_sync?.toISOString?.() || row.last_sync,
    lastError: row.last_error,
    consecutiveFailures: row.consecutive_failures ?? 0,
    enrolledStudentsCount: row.enrolled_students_count ?? 0,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  }
}

function rowToSyncLog(row: any): DeviceSyncLog {
  return {
    id: row.id,
    deviceId: row.device_id,
    syncTimestamp: row.sync_timestamp?.toISOString?.() || row.sync_timestamp,
    status: row.status,
    recordsSynced: row.records_synced ?? 0,
    recordsFailed: row.records_failed ?? 0,
    errorDetails: row.error_details,
    syncDurationMs: row.sync_duration_ms,
  }
}

function rowToEnrollment(row: any): DeviceEnrollment {
  return {
    id: row.id,
    deviceId: row.device_id,
    studentId: row.student_id,
    biometricId: row.biometric_id,
    enrolledAt: row.enrolled_at?.toISOString?.() || row.enrolled_at,
  }
}

// ============================================================================
// Device CRUD Functions
// ============================================================================

/**
 * Register a new biometric device
 */
export async function registerDevice(
  tenantId: string,
  payload: RegisterDevicePayload
): Promise<BiometricDevice> {
  const id = uuidv4()
  const now = new Date().toISOString()

  const row = await queryOne<any>(
    `INSERT INTO biometric_devices (
      id, tenant_id, device_name, device_type, manufacturer, model,
      serial_number, location, ip_address, port, connection_protocol,
      sync_frequency, status, sync_status, consecutive_failures,
      enrolled_students_count, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      'inactive', 'pending', 0, 0, $13, $14)
    RETURNING *`,
    [
      id,
      tenantId,
      payload.deviceName,
      payload.deviceType,
      payload.manufacturer || null,
      payload.model || null,
      payload.serialNumber || null,
      payload.location || null,
      payload.ipAddress || null,
      payload.port || null,
      payload.connectionProtocol || 'HTTPS',
      payload.syncFrequency || 'daily',
      now,
      now,
    ]
  )

  if (!row) throw new Error('Failed to register device')
  return rowToDevice(row)
}

/**
 * Get a single device by ID
 */
export async function getDevice(
  tenantId: string,
  deviceId: string
): Promise<BiometricDevice | null> {
  const row = await queryOne<any>(
    `SELECT * FROM biometric_devices WHERE id = $1 AND tenant_id = $2`,
    [deviceId, tenantId]
  )
  return row ? rowToDevice(row) : null
}

/**
 * Get device status information
 */
export async function getDeviceStatus(
  tenantId: string,
  deviceId: string
): Promise<{
  status: string
  syncStatus: string
  lastSync?: string
  lastError?: string
  consecutiveFailures: number
} | null> {
  const row = await queryOne<any>(
    `SELECT status, sync_status, last_sync, last_error, consecutive_failures 
     FROM biometric_devices WHERE id = $1 AND tenant_id = $2`,
    [deviceId, tenantId]
  )
  
  if (!row) return null
  
  return {
    status: row.status,
    syncStatus: row.sync_status,
    lastSync: row.last_sync?.toISOString?.() || row.last_sync,
    lastError: row.last_error,
    consecutiveFailures: row.consecutive_failures ?? 0,
  }
}

/**
 * List devices for a tenant with optional filtering
 */
export async function listDevices(
  tenantId: string,
  filters: ListDevicesFilter = {}
): Promise<{ devices: BiometricDevice[]; total: number }> {
  const { status, limit = 50, offset = 0 } = filters

  const conditions = ['tenant_id = $1']
  const values: any[] = [tenantId]
  let paramIndex = 2

  if (status) {
    conditions.push(`status = $${paramIndex++}`)
    values.push(status)
  }

  const whereClause = conditions.join(' AND ')

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM biometric_devices WHERE ${whereClause}`,
    values
  )
  const total = parseInt(countResult?.count || '0', 10)

  const rows = await queryAll<any>(
    `SELECT * FROM biometric_devices WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  )

  return {
    devices: rows.map(rowToDevice),
    total,
  }
}

/**
 * Update device configuration
 */
export async function updateDeviceConfig(
  tenantId: string,
  deviceId: string,
  updates: Partial<RegisterDevicePayload>
): Promise<BiometricDevice> {
  const now = new Date().toISOString()

  const setClauses: string[] = ['updated_at = $3']
  const values: any[] = [deviceId, tenantId, now]
  let paramIndex = 4

  if (updates.deviceName !== undefined) {
    setClauses.push(`device_name = $${paramIndex++}`)
    values.push(updates.deviceName)
  }
  if (updates.manufacturer !== undefined) {
    setClauses.push(`manufacturer = $${paramIndex++}`)
    values.push(updates.manufacturer)
  }
  if (updates.model !== undefined) {
    setClauses.push(`model = $${paramIndex++}`)
    values.push(updates.model)
  }
  if (updates.location !== undefined) {
    setClauses.push(`location = $${paramIndex++}`)
    values.push(updates.location)
  }
  if (updates.ipAddress !== undefined) {
    setClauses.push(`ip_address = $${paramIndex++}`)
    values.push(updates.ipAddress)
  }
  if (updates.port !== undefined) {
    setClauses.push(`port = $${paramIndex++}`)
    values.push(updates.port)
  }
  if (updates.connectionProtocol !== undefined) {
    setClauses.push(`connection_protocol = $${paramIndex++}`)
    values.push(updates.connectionProtocol)
  }
  if (updates.syncFrequency !== undefined) {
    setClauses.push(`sync_frequency = $${paramIndex++}`)
    values.push(updates.syncFrequency)
  }

  const row = await queryOne<any>(
    `UPDATE biometric_devices SET ${setClauses.join(', ')}
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    values
  )

  if (!row) throw new Error('Device not found')
  return rowToDevice(row)
}

/**
 * Update device status
 */
export async function updateDeviceStatus(
  tenantId: string,
  deviceId: string,
  status: 'active' | 'inactive' | 'maintenance' | 'error',
  lastError?: string
): Promise<BiometricDevice> {
  const now = new Date().toISOString()

  const row = await queryOne<any>(
    `UPDATE biometric_devices
     SET status = $3, last_error = $4, updated_at = $5
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [deviceId, tenantId, status, lastError || null, now]
  )

  if (!row) throw new Error('Device not found')
  return rowToDevice(row)
}

/**
 * Increment consecutive failures counter; auto-set to error if >= 3
 */
export async function incrementConsecutiveFailures(
  tenantId: string,
  deviceId: string,
  errorMessage?: string
): Promise<BiometricDevice> {
  const now = new Date().toISOString()

  const row = await queryOne<any>(
    `UPDATE biometric_devices
     SET consecutive_failures = consecutive_failures + 1,
         last_error = COALESCE($3, last_error),
         status = CASE WHEN consecutive_failures + 1 >= 3 THEN 'error' ELSE status END,
         sync_status = 'failed',
         updated_at = $4
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [deviceId, tenantId, errorMessage || null, now]
  )

  if (!row) throw new Error('Device not found')
  return rowToDevice(row)
}

/**
 * Reset consecutive failures counter and set status to active
 */
export async function resetConsecutiveFailures(
  tenantId: string,
  deviceId: string
): Promise<BiometricDevice> {
  const now = new Date().toISOString()

  const row = await queryOne<any>(
    `UPDATE biometric_devices
     SET consecutive_failures = 0,
         status = 'active',
         sync_status = 'synced',
         last_sync = $3,
         last_error = NULL,
         updated_at = $3
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [deviceId, tenantId, now]
  )

  if (!row) throw new Error('Device not found')
  return rowToDevice(row)
}

/**
 * Delete a device (hard delete)
 */
export async function deleteDevice(
  tenantId: string,
  deviceId: string
): Promise<{ success: boolean }> {
  const result = await query(
    `DELETE FROM biometric_devices WHERE id = $1 AND tenant_id = $2`,
    [deviceId, tenantId]
  )
  if ((result.rowCount ?? 0) === 0) throw new Error('Device not found')
  return { success: true }
}

// ============================================================================
// Sync Log Functions
// ============================================================================

/**
 * Log a sync attempt
 */
export async function logSync(
  deviceId: string,
  status: 'success' | 'failed' | 'partial',
  recordsSynced: number,
  recordsFailed: number,
  errorDetails?: string,
  durationMs?: number
): Promise<DeviceSyncLog> {
  const id = uuidv4()
  const now = new Date().toISOString()

  const row = await queryOne<any>(
    `INSERT INTO device_sync_logs (
      id, device_id, sync_timestamp, status, records_synced,
      records_failed, error_details, sync_duration_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [id, deviceId, now, status, recordsSynced, recordsFailed, errorDetails || null, durationMs || null]
  )

  if (!row) throw new Error('Failed to log sync')
  return rowToSyncLog(row)
}

/**
 * Get sync logs for a device
 */
export async function getSyncLogs(
  deviceId: string,
  limit = 20,
  offset = 0
): Promise<{ logs: DeviceSyncLog[]; total: number }> {
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM device_sync_logs WHERE device_id = $1`,
    [deviceId]
  )
  const total = parseInt(countResult?.count || '0', 10)

  const rows = await queryAll<any>(
    `SELECT * FROM device_sync_logs WHERE device_id = $1
     ORDER BY sync_timestamp DESC
     LIMIT $2 OFFSET $3`,
    [deviceId, limit, offset]
  )

  return {
    logs: rows.map(rowToSyncLog),
    total,
  }
}

// ============================================================================
// Enrollment Functions
// ============================================================================

/**
 * Enroll a student in a biometric device
 */
export async function enrollStudent(
  deviceId: string,
  studentId: string,
  biometricId: string
): Promise<DeviceEnrollment> {
  const id = uuidv4()
  const now = new Date().toISOString()

  const row = await queryOne<any>(
    `INSERT INTO device_enrollment (id, device_id, student_id, biometric_id, enrolled_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (device_id, student_id) DO UPDATE
       SET biometric_id = EXCLUDED.biometric_id
     RETURNING *`,
    [id, deviceId, studentId, biometricId, now]
  )

  if (!row) throw new Error('Failed to enroll student')

  // Update enrolled_students_count
  await query(
    `UPDATE biometric_devices
     SET enrolled_students_count = (
       SELECT COUNT(*) FROM device_enrollment WHERE device_id = $1
     ), updated_at = $2
     WHERE id = $1`,
    [deviceId, now]
  )

  return rowToEnrollment(row)
}

/**
 * Unenroll a student from a device
 */
export async function unenrollStudent(
  deviceId: string,
  studentId: string
): Promise<{ success: boolean }> {
  const result = await query(
    `DELETE FROM device_enrollment WHERE device_id = $1 AND student_id = $2`,
    [deviceId, studentId]
  )

  if ((result.rowCount ?? 0) === 0) throw new Error('Enrollment not found')

  const now = new Date().toISOString()
  await query(
    `UPDATE biometric_devices
     SET enrolled_students_count = (
       SELECT COUNT(*) FROM device_enrollment WHERE device_id = $1
     ), updated_at = $2
     WHERE id = $1`,
    [deviceId, now]
  )

  return { success: true }
}

/**
 * Get all enrollments for a device
 */
export async function getEnrollments(
  deviceId: string
): Promise<DeviceEnrollment[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM device_enrollment WHERE device_id = $1 ORDER BY enrolled_at DESC`,
    [deviceId]
  )
  return rows.map(rowToEnrollment)
}

/**
 * Find student by biometric ID for a device
 */
export async function findStudentByBiometricId(
  deviceId: string,
  biometricId: string
): Promise<string | null> {
  const row = await queryOne<{ student_id: string }>(
    `SELECT student_id FROM device_enrollment WHERE device_id = $1 AND biometric_id = $2`,
    [deviceId, biometricId]
  )
  return row?.student_id || null
}

/**
 * Get all devices for a tenant (used by scheduler)
 */
export async function getDevicesByTenant(tenantId: string): Promise<BiometricDevice[]> {
  const result = await listDevices(tenantId, { limit: 1000 })
  return result.devices
}
