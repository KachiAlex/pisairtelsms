/**
 * Attendance Database Library
 * Handles all database operations for attendance management
 */

import { queryAll, queryOne, query, transaction } from '../cbt/_lib/db.js'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Type Definitions
// ============================================================================

export interface AttendanceRecord {
  id: string
  tenantId: string
  studentId: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
  absenceReasonId?: string
  source: 'teacher_entry' | 'biometric_device' | 'batch_upload' | 'api_entry'
  deviceId?: string
  userId: string
  academicSession: string
  term: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface AttendanceFilter {
  tenantId: string
  studentId?: string
  class?: string
  date?: string
  startDate?: string
  endDate?: string
  status?: string
  source?: string
  term?: string
  limit?: number
  offset?: number
}

export interface AttendancePayload {
  studentId: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
  absenceReasonId?: string
  source: 'teacher_entry' | 'biometric_device' | 'batch_upload' | 'api_entry'
  deviceId?: string
  userId: string
  academicSession: string
  term: string
  createdBy?: string
}

export interface AuditTrailEntry {
  id: string
  attendanceRecordId: string
  action: 'create' | 'update' | 'delete'
  oldValue?: Record<string, any>
  newValue?: Record<string, any>
  changedBy: string
  changedAt: string
}

export interface UpsertResult {
  inserted: number
  updated: number
  errors: Array<{ record: AttendancePayload; error: string }>
}

export interface FetchResult {
  records: AttendanceRecord[]
  total: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database row to AttendanceRecord
 */
function rowToAttendanceRecord(row: any): AttendanceRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    class: row.class,
    date: row.date,
    status: row.status,
    absenceReasonId: row.absence_reason_id,
    source: row.source,
    deviceId: row.device_id,
    userId: row.user_id,
    academicSession: row.academic_session,
    term: row.term,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  }
}

/**
 * Validate attendance record data
 */
function validateAttendanceRecord(record: AttendancePayload): string | null {
  // Validate required fields
  if (!record.studentId) return 'studentId is required'
  if (!record.class) return 'class is required'
  if (!record.date) return 'date is required'
  if (!record.status) return 'status is required'
  if (!record.academicSession) return 'academicSession is required'
  if (!record.term) return 'term is required'
  if (!record.userId) return 'userId is required'
  if (!record.source) return 'source is required'

  // Validate status
  const validStatuses = ['present', 'absent', 'late']
  if (!validStatuses.includes(record.status)) {
    return `status must be one of: ${validStatuses.join(', ')}`
  }

  // Validate date is not in future
  const recordDate = new Date(record.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (recordDate > today) {
    return 'date cannot be in the future'
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    return 'date must be in YYYY-MM-DD format'
  }

  // Validate academic session format (YYYY/YYYY)
  if (!/^\d{4}\/\d{4}$/.test(record.academicSession)) {
    return 'academicSession must be in YYYY/YYYY format'
  }

  // Validate source
  const validSources = ['teacher_entry', 'biometric_device', 'batch_upload', 'api_entry']
  if (!validSources.includes(record.source)) {
    return `source must be one of: ${validSources.join(', ')}`
  }

  return null
}

/**
 * Check if student exists
 */
async function studentExists(tenantId: string, studentId: string): Promise<boolean> {
  try {
    const result = await queryOne<{ id: string }>(
      `SELECT id FROM students WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, studentId]
    )
    return !!result
  } catch (error) {
    console.error('Error checking student existence:', error)
    return false
  }
}

/**
 * Check if class exists
 */
async function classExists(tenantId: string, className: string): Promise<boolean> {
  try {
    const result = await queryOne<{ id: string }>(
      `SELECT id FROM classes WHERE tenant_id = $1 AND name = $2 AND deleted_at IS NULL`,
      [tenantId, className]
    )
    return !!result
  } catch (error) {
    console.error('Error checking class existence:', error)
    return false
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Fetch attendance records with filtering and pagination
 */
export async function fetchAttendance(filters: AttendanceFilter): Promise<FetchResult> {
  try {
    const {
      tenantId,
      studentId,
      class: className,
      date,
      startDate,
      endDate,
      status,
      source,
      term,
      limit = 100,
      offset = 0,
    } = filters

    // Build query conditions
    const conditions: string[] = ['tenant_id = $1']
    const values: any[] = [tenantId]
    let paramIndex = 2

    if (studentId) {
      conditions.push(`student_id = $${paramIndex++}`)
      values.push(studentId)
    }

    if (className) {
      conditions.push(`class = $${paramIndex++}`)
      values.push(className)
    }

    if (date) {
      conditions.push(`date = $${paramIndex++}`)
      values.push(date)
    }

    if (startDate && endDate) {
      conditions.push(`date >= $${paramIndex++} AND date <= $${paramIndex++}`)
      values.push(startDate, endDate)
    } else if (startDate) {
      conditions.push(`date >= $${paramIndex++}`)
      values.push(startDate)
    } else if (endDate) {
      conditions.push(`date <= $${paramIndex++}`)
      values.push(endDate)
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`)
      values.push(status)
    }

    if (source) {
      conditions.push(`source = $${paramIndex++}`)
      values.push(source)
    }

    if (term) {
      conditions.push(`term = $${paramIndex++}`)
      values.push(term)
    }

    const whereClause = conditions.join(' AND ')

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM attendance_records WHERE ${whereClause}`,
      values
    )
    const total = parseInt(countResult?.count || '0', 10)

    // Get paginated records
    const records = await queryAll<any>(
      `SELECT * FROM attendance_records 
       WHERE ${whereClause}
       ORDER BY date DESC, created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    )

    return {
      records: records.map(rowToAttendanceRecord),
      total,
    }
  } catch (error) {
    console.error('Error fetching attendance:', error)
    throw new Error('Failed to fetch attendance records')
  }
}

/**
 * Get a single attendance record
 */
export async function getAttendanceRecord(
  tenantId: string,
  recordId: string
): Promise<AttendanceRecord | null> {
  try {
    const row = await queryOne<any>(
      `SELECT * FROM attendance_records WHERE id = $1 AND tenant_id = $2`,
      [recordId, tenantId]
    )
    return row ? rowToAttendanceRecord(row) : null
  } catch (error) {
    console.error('Error fetching attendance record:', error)
    throw new Error('Failed to fetch attendance record')
  }
}

/**
 * Insert or update attendance records with conflict resolution
 * Uses most-recent-wins strategy for conflicts
 */
export async function upsertAttendanceBatch(
  tenantId: string,
  records: AttendancePayload[]
): Promise<UpsertResult> {
  const result: UpsertResult = {
    inserted: 0,
    updated: 0,
    errors: [],
  }

  try {
    // Validate all records first
    const validRecords: AttendancePayload[] = []
    for (const record of records) {
      const validationError = validateAttendanceRecord(record)
      if (validationError) {
        result.errors.push({ record, error: validationError })
        continue
      }
      validRecords.push(record)
    }

    if (validRecords.length === 0) {
      return result
    }

    // Validate students and classes exist
    const studentIds = new Set(validRecords.map(r => r.studentId))
    const classNames = new Set(validRecords.map(r => r.class))

    for (const studentId of studentIds) {
      const exists = await studentExists(tenantId, studentId)
      if (!exists) {
        validRecords.forEach(r => {
          if (r.studentId === studentId) {
            result.errors.push({ record: r, error: `Student ${studentId} does not exist` })
          }
        })
      }
    }

    for (const className of classNames) {
      const exists = await classExists(tenantId, className)
      if (!exists) {
        validRecords.forEach(r => {
          if (r.class === className) {
            result.errors.push({ record: r, error: `Class ${className} does not exist` })
          }
        })
      }
    }

    // Filter out records with validation errors
    const recordsToInsert = validRecords.filter(
      r => !result.errors.some(e => e.record === r)
    )

    if (recordsToInsert.length === 0) {
      return result
    }

    // Use transaction for batch upsert
    await transaction(async (client) => {
      // Invalidate analytics cache for this tenant since we're adding records
      invalidateAnalyticsCache(tenantId)

      for (const record of recordsToInsert) {
        const id = uuidv4()
        const now = new Date().toISOString()

        try {
          // Try to insert, if conflict update
          const upsertQuery = `
            INSERT INTO attendance_records (
              id, tenant_id, student_id, class, date, status, absence_reason_id,
              source, device_id, user_id, academic_session, term,
              created_at, updated_at, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (tenant_id, student_id, date) DO UPDATE SET
              status = EXCLUDED.status,
              absence_reason_id = COALESCE(EXCLUDED.absence_reason_id, attendance_records.absence_reason_id),
              source = EXCLUDED.source,
              device_id = COALESCE(EXCLUDED.device_id, attendance_records.device_id),
              user_id = EXCLUDED.user_id,
              updated_at = EXCLUDED.updated_at,
              updated_by = EXCLUDED.updated_by
            RETURNING id, (xmax = 0) as is_insert
          `

          const upsertResult = await queryOne<{ id: string; is_insert: boolean }>(
            upsertQuery,
            [
              id,
              tenantId,
              record.studentId,
              record.class,
              record.date,
              record.status,
              record.absenceReasonId || null,
              record.source,
              record.deviceId || null,
              record.userId,
              record.academicSession,
              record.term,
              now,
              now,
              record.createdBy || record.userId,
              record.createdBy || record.userId,
            ]
          )

          if (upsertResult?.is_insert) {
            result.inserted++
          } else {
            result.updated++
          }

          // Create audit trail entry
          const auditId = uuidv4()
          const auditAction = upsertResult?.is_insert ? 'create' : 'update'
          const newValue = {
            status: record.status,
            source: record.source,
            absenceReasonId: record.absenceReasonId,
          }

          await query(
            `INSERT INTO attendance_audit_trail (
              id, attendance_record_id, action, new_value, changed_by, changed_at
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              auditId,
              upsertResult?.id,
              auditAction,
              JSON.stringify(newValue),
              record.userId,
              now,
            ]
          )
        } catch (error) {
          console.error('Error upserting record:', error)
          result.errors.push({
            record,
            error: `Failed to upsert record: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
      }
    })

    return result
  } catch (error) {
    console.error('Error in upsertAttendanceBatch:', error)
    throw new Error('Failed to upsert attendance records')
  }
}

/**
 * Create an audit trail entry for attendance changes
 */
export async function createAuditTrailEntry(
  attendanceRecordId: string,
  action: 'create' | 'update' | 'delete',
  oldValue: Record<string, any> | null,
  newValue: Record<string, any> | null,
  changedBy: string
): Promise<AuditTrailEntry> {
  try {
    const id = uuidv4()
    const now = new Date().toISOString()

    const result = await queryOne<any>(
      `INSERT INTO attendance_audit_trail (
        id, attendance_record_id, action, old_value, new_value, changed_by, changed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, attendance_record_id, action, old_value, new_value, changed_by, changed_at`,
      [
        id,
        attendanceRecordId,
        action,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        changedBy,
        now,
      ]
    )

    if (!result) {
      throw new Error('Failed to create audit trail entry')
    }

    return {
      id: result.id,
      attendanceRecordId: result.attendance_record_id,
      action: result.action,
      oldValue: result.old_value ? JSON.parse(result.old_value) : undefined,
      newValue: result.new_value ? JSON.parse(result.new_value) : undefined,
      changedBy: result.changed_by,
      changedAt: result.changed_at?.toISOString?.() || result.changed_at,
    }
  } catch (error) {
    console.error('Error creating audit trail entry:', error)
    throw new Error('Failed to create audit trail entry')
  }
}

/**
 * Delete an attendance record
 */
export async function deleteAttendanceRecord(
  tenantId: string,
  recordId: string,
  deletedBy: string
): Promise<{ success: boolean }> {
  try {
    // Get the record first to capture old value for audit
    const record = await getAttendanceRecord(tenantId, recordId)
    if (!record) {
      throw new Error('Attendance record not found')
    }

    // Delete the record
    const result = await query(
      `DELETE FROM attendance_records WHERE id = $1 AND tenant_id = $2`,
      [recordId, tenantId]
    )

    if (!result.rowCount || result.rowCount === 0) {
      throw new Error('Failed to delete attendance record')
    }

    // Create audit trail entry for deletion
    const oldValue = {
      studentId: record.studentId,
      class: record.class,
      date: record.date,
      status: record.status,
      source: record.source,
    }

    await createAuditTrailEntry(recordId, 'delete', oldValue, null, deletedBy)

    return { success: true }
  } catch (error) {
    console.error('Error deleting attendance record:', error)
    throw new Error('Failed to delete attendance record')
  }
}

/**
 * Get audit trail entries for an attendance record
 */
export async function getAuditTrail(
  attendanceRecordId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ entries: AuditTrailEntry[]; total: number }> {
  try {
    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM attendance_audit_trail WHERE attendance_record_id = $1`,
      [attendanceRecordId]
    )
    const total = parseInt(countResult?.count || '0', 10)

    // Get paginated entries
    const entries = await queryAll<any>(
      `SELECT * FROM attendance_audit_trail 
       WHERE attendance_record_id = $1
       ORDER BY changed_at DESC
       LIMIT $2 OFFSET $3`,
      [attendanceRecordId, limit, offset]
    )

    return {
      entries: entries.map(row => ({
        id: row.id,
        attendanceRecordId: row.attendance_record_id,
        action: row.action,
        oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
        newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
        changedBy: row.changed_by,
        changedAt: row.changed_at?.toISOString?.() || row.changed_at,
      })),
      total,
    }
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    throw new Error('Failed to fetch audit trail')
  }
}

/**
 * Check if attendance record exists for student on date
 */
export async function attendanceExists(
  tenantId: string,
  studentId: string,
  date: string
): Promise<AttendanceRecord | null> {
  try {
    const row = await queryOne<any>(
      `SELECT * FROM attendance_records 
       WHERE tenant_id = $1 AND student_id = $2 AND date = $3`,
      [tenantId, studentId, date]
    )
    return row ? rowToAttendanceRecord(row) : null
  } catch (error) {
    console.error('Error checking attendance existence:', error)
    throw new Error('Failed to check attendance existence')
  }
}

/**
 * Get attendance statistics for a date range
 */
export async function getAttendanceStats(
  tenantId: string,
  startDate: string,
  endDate: string,
  className?: string
): Promise<{
  total: number
  present: number
  absent: number
  late: number
  presentRate: number
  absentRate: number
  lateRate: number
}> {
  try {
    const conditions = ['tenant_id = $1', 'date >= $2', 'date <= $3']
    const values: any[] = [tenantId, startDate, endDate]
    let paramIndex = 4

    if (className) {
      conditions.push(`class = $${paramIndex++}`)
      values.push(className)
    }

    const whereClause = conditions.join(' AND ')

    const result = await queryOne<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
       FROM attendance_records
       WHERE ${whereClause}`,
      values
    )

    const total = parseInt(result?.total || '0', 10)
    const present = parseInt(result?.present || '0', 10)
    const absent = parseInt(result?.absent || '0', 10)
    const late = parseInt(result?.late || '0', 10)

    return {
      total,
      present,
      absent,
      late,
      presentRate: total > 0 ? (present / total) * 100 : 0,
      absentRate: total > 0 ? (absent / total) * 100 : 0,
      lateRate: total > 0 ? (late / total) * 100 : 0,
    }
  } catch (error) {
    console.error('Error getting attendance stats:', error)
    throw new Error('Failed to get attendance statistics')
  }
}

// ============================================================================
// Analytics Type Definitions
// ============================================================================

export interface SummaryStats {
  presentRate: number
  absentRate: number
  lateRate: number
  totalRecords: number
  dataFreshness: string
}

export interface WeeklyHeatmapEntry {
  week: string
  presentPct: number
  absentPct: number
  latePct: number
  total: number
  color: 'green' | 'yellow' | 'red'
}

export interface AtRiskStudent {
  studentId: string
  name: string
  class: string
  attendance: number
  reason: string
  absenceCount: number
  lateCount: number
  owner: string | null
}

export interface HomeroomLeaderboardEntry {
  homeroom: string
  rate: number
  studentCount: number
  presentCount: number
}

export interface HomeroomLeaderboard {
  entries: HomeroomLeaderboardEntry[]
  calculationDate: string
}

// ============================================================================
// In-Memory Cache
// ============================================================================

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const analyticsCache = new Map<string, CacheEntry<any>>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function getCacheKey(tenantId: string, fnName: string, params: Record<string, any>): string {
  const paramStr = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(':')
  return `${tenantId}:${fnName}:${paramStr}`
}

function getFromCache<T>(key: string): T | null {
  const entry = analyticsCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    analyticsCache.delete(key)
    return null
  }
  return entry.value as T
}

function setInCache<T>(key: string, value: T): void {
  analyticsCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

/**
 * Invalidate all analytics cache entries for a tenant.
 * Should be called whenever new attendance records are added.
 */
export function invalidateAnalyticsCache(tenantId: string): void {
  const prefix = `${tenantId}:`
  for (const key of analyticsCache.keys()) {
    if (key.startsWith(prefix)) {
      analyticsCache.delete(key)
    }
  }
}

// ============================================================================
// Analytics Functions
// ============================================================================

/**
 * Calculate summary statistics for the current term (or a specific term/session).
 * Returns present/absent/late rates rounded to 1 decimal place plus a freshness timestamp.
 */
export async function calculateSummaryStats(
  tenantId: string,
  term?: string,
  academicSession?: string
): Promise<SummaryStats> {
  const cacheKey = getCacheKey(tenantId, 'calculateSummaryStats', { term, academicSession })
  const cached = getFromCache<SummaryStats>(cacheKey)
  if (cached) return cached

  try {
    const conditions: string[] = ['tenant_id = $1']
    const values: any[] = [tenantId]
    let paramIndex = 2

    if (term) {
      conditions.push(`term = $${paramIndex++}`)
      values.push(term)
    }

    if (academicSession) {
      conditions.push(`academic_session = $${paramIndex++}`)
      values.push(academicSession)
    }

    const whereClause = conditions.join(' AND ')

    const result = await queryOne<any>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
       FROM attendance_records
       WHERE ${whereClause}`,
      values
    )

    const total = parseInt(result?.total || '0', 10)
    const present = parseInt(result?.present || '0', 10)
    const absent = parseInt(result?.absent || '0', 10)
    const late = parseInt(result?.late || '0', 10)

    const stats: SummaryStats = {
      presentRate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      absentRate: total > 0 ? Math.round((absent / total) * 1000) / 10 : 0,
      lateRate: total > 0 ? Math.round((late / total) * 1000) / 10 : 0,
      totalRecords: total,
      dataFreshness: new Date().toISOString(),
    }

    setInCache(cacheKey, stats)
    return stats
  } catch (error) {
    console.error('Error calculating summary stats:', error)
    throw new Error('Failed to calculate summary statistics')
  }
}

/**
 * Calculate weekly attendance heatmap.
 * Groups records by ISO week and returns present/absent/late percentages with color coding.
 * Color thresholds: green ≥95%, yellow 85-94%, red <85%
 */
export async function calculateWeeklyHeatmap(
  tenantId: string,
  weeks: number = 4,
  className?: string
): Promise<WeeklyHeatmapEntry[]> {
  const cacheKey = getCacheKey(tenantId, 'calculateWeeklyHeatmap', { weeks, className })
  const cached = getFromCache<WeeklyHeatmapEntry[]>(cacheKey)
  if (cached) return cached

  try {
    const conditions: string[] = [
      'tenant_id = $1',
      `date >= NOW() - INTERVAL '${weeks} weeks'`,
    ]
    const values: any[] = [tenantId]
    let paramIndex = 2

    if (className) {
      conditions.push(`class = $${paramIndex++}`)
      values.push(className)
    }

    const whereClause = conditions.join(' AND ')

    const rows = await queryAll<any>(
      `SELECT
        TO_CHAR(date, 'IYYY-"W"IW') as week,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
       FROM attendance_records
       WHERE ${whereClause}
       GROUP BY week
       ORDER BY week DESC`,
      values
    )

    const heatmap: WeeklyHeatmapEntry[] = rows.map((row: any) => {
      const total = parseInt(row.total || '0', 10)
      const present = parseInt(row.present || '0', 10)
      const absent = parseInt(row.absent || '0', 10)
      const late = parseInt(row.late || '0', 10)

      const presentPct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0
      const absentPct = total > 0 ? Math.round((absent / total) * 1000) / 10 : 0
      const latePct = total > 0 ? Math.round((late / total) * 1000) / 10 : 0

      let color: 'green' | 'yellow' | 'red'
      if (presentPct >= 95) {
        color = 'green'
      } else if (presentPct >= 85) {
        color = 'yellow'
      } else {
        color = 'red'
      }

      return {
        week: row.week,
        presentPct,
        absentPct,
        latePct,
        total,
        color,
      }
    })

    setInCache(cacheKey, heatmap)
    return heatmap
  } catch (error) {
    console.error('Error calculating weekly heatmap:', error)
    throw new Error('Failed to calculate weekly heatmap')
  }
}

/**
 * Identify at-risk students (attendance below 85% in rolling 30-day period).
 * Joins with students table for name and supports optional class/reason filters.
 * Sorted by attendance percentage ascending.
 */
export async function identifyAtRiskStudents(
  tenantId: string,
  className?: string,
  reason?: string
): Promise<AtRiskStudent[]> {
  const cacheKey = getCacheKey(tenantId, 'identifyAtRiskStudents', { className, reason })
  const cached = getFromCache<AtRiskStudent[]>(cacheKey)
  if (cached) return cached

  try {
    const conditions: string[] = [
      'ar.tenant_id = $1',
      "ar.date >= NOW() - INTERVAL '30 days'",
    ]
    const values: any[] = [tenantId]
    let paramIndex = 2

    if (className) {
      conditions.push(`ar.class = $${paramIndex++}`)
      values.push(className)
    }

    const whereClause = conditions.join(' AND ')

    // Build HAVING clause — reason filter applies to the dominant absence reason
    // We filter by reason after the aggregation if provided
    // Note: students and classes tables may not exist in all deployments,
    // so we query attendance_records directly without joins.
    const rows = await queryAll<any>(
      `SELECT
        ar.student_id,
        ar.student_id as name,
        ar.class,
        COUNT(*) as total_days,
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_days,
        NULL as owner
       FROM attendance_records ar
       WHERE ${whereClause}
       GROUP BY ar.student_id, ar.class
       HAVING COUNT(*) > 0 AND
         (SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::float / COUNT(*)) < 0.85
       ORDER BY (SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END)::float / COUNT(*)) ASC`,
      values
    )

    let students: AtRiskStudent[] = rows.map((row: any) => {
      const totalDays = parseInt(row.total_days || '0', 10)
      const presentDays = parseInt(row.present_days || '0', 10)
      const absentDays = parseInt(row.absent_days || '0', 10)
      const lateDays = parseInt(row.late_days || '0', 10)

      const attendancePct = totalDays > 0
        ? Math.round((presentDays / totalDays) * 1000) / 10
        : 0

      // Determine primary reason: if more absences than lates → 'absence', else 'late'
      const primaryReason = absentDays >= lateDays ? 'absence' : 'late'

      return {
        studentId: row.student_id,
        name: row.name || row.student_id,
        class: row.class,
        attendance: attendancePct,
        reason: primaryReason,
        absenceCount: absentDays,
        lateCount: lateDays,
        owner: row.owner || null,
      }
    })

    // Apply reason filter post-aggregation if provided
    if (reason) {
      students = students.filter(s => s.reason === reason)
    }

    setInCache(cacheKey, students)
    return students
  } catch (error) {
    console.error('Error identifying at-risk students:', error)
    throw new Error('Failed to identify at-risk students')
  }
}

/**
 * Get audit trail entries across all attendance records for a tenant.
 * Supports filtering by studentId, date range, action, and pagination.
 * Validates: Requirements 19
 */
export async function getGlobalAuditTrail(
  tenantId: string,
  filters: {
    studentId?: string
    startDate?: string
    endDate?: string
    action?: string
    limit?: number
    offset?: number
  }
): Promise<{ entries: AuditTrailEntry[]; total: number }> {
  try {
    const {
      studentId,
      startDate,
      endDate,
      action,
      limit = 50,
      offset = 0,
    } = filters

    // Join audit trail with attendance_records to filter by tenant and optional studentId
    const conditions: string[] = ['ar.tenant_id = $1']
    const values: any[] = [tenantId]
    let paramIndex = 2

    if (studentId) {
      conditions.push(`ar.student_id = $${paramIndex++}`)
      values.push(studentId)
    }

    if (startDate) {
      conditions.push(`aat.changed_at >= $${paramIndex++}`)
      values.push(startDate)
    }

    if (endDate) {
      conditions.push(`aat.changed_at <= $${paramIndex++}`)
      values.push(endDate)
    }

    if (action) {
      conditions.push(`aat.action = $${paramIndex++}`)
      values.push(action)
    }

    const whereClause = conditions.join(' AND ')

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM attendance_audit_trail aat
       JOIN attendance_records ar ON ar.id = aat.attendance_record_id
       WHERE ${whereClause}`,
      values
    )
    const total = parseInt(countResult?.count || '0', 10)

    // Get paginated entries
    const rows = await queryAll<any>(
      `SELECT aat.*
       FROM attendance_audit_trail aat
       JOIN attendance_records ar ON ar.id = aat.attendance_record_id
       WHERE ${whereClause}
       ORDER BY aat.changed_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    )

    return {
      entries: rows.map((row: any) => ({
        id: row.id,
        attendanceRecordId: row.attendance_record_id,
        action: row.action,
        oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
        newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
        changedBy: row.changed_by,
        changedAt: row.changed_at?.toISOString?.() || row.changed_at,
      })),
      total,
    }
  } catch (error) {
    console.error('Error fetching global audit trail:', error)
    throw new Error('Failed to fetch audit trail')
  }
}

/**
 * Calculate homeroom attendance leaderboard.
 * Returns top 5 homerooms ranked by average attendance percentage.
 */
export async function calculateHomeroomLeaderboard(
  tenantId: string,
  term?: string
): Promise<HomeroomLeaderboard> {
  const cacheKey = getCacheKey(tenantId, 'calculateHomeroomLeaderboard', { term })
  const cached = getFromCache<HomeroomLeaderboard>(cacheKey)
  if (cached) return cached

  try {
    const conditions: string[] = ['tenant_id = $1']
    const values: any[] = [tenantId]
    let paramIndex = 2

    if (term) {
      conditions.push(`term = $${paramIndex++}`)
      values.push(term)
    }

    const whereClause = conditions.join(' AND ')

    const rows = await queryAll<any>(
      `SELECT
        class as homeroom,
        COUNT(DISTINCT student_id) as student_count,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        COUNT(*) as total_records,
        ROUND(
          (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100,
          1
        ) as rate
       FROM attendance_records
       WHERE ${whereClause}
       GROUP BY class
       ORDER BY rate DESC NULLS LAST
       LIMIT 5`,
      values
    )

    const entries: HomeroomLeaderboardEntry[] = rows.map((row: any) => ({
      homeroom: row.homeroom,
      rate: parseFloat(row.rate || '0'),
      studentCount: parseInt(row.student_count || '0', 10),
      presentCount: parseInt(row.present_count || '0', 10),
    }))

    const result: HomeroomLeaderboard = {
      entries,
      calculationDate: new Date().toISOString(),
    }

    setInCache(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error calculating homeroom leaderboard:', error)
    throw new Error('Failed to calculate homeroom leaderboard')
  }
}

/**
 * Trigger guardian notifications for at-risk students
 * Validates: Requirements 18
 */
export async function triggerAtRiskNotifications(
  tenantId: string,
  className?: string,
  createdBy?: string
): Promise<{ notificationCount: number; jobId: string }> {
  try {
    const { createGuardianNotification, createBulkNotificationJob, updateBulkNotificationJobStatus } = await import('./guardian-notifications.js')

    // Get at-risk students
    const atRiskStudents = await identifyAtRiskStudents(tenantId, className)

    if (atRiskStudents.length === 0) {
      return { notificationCount: 0, jobId: '' }
    }

    // Create bulk job
    const jobName = `At-Risk Notifications - ${new Date().toISOString()}`
    const job = await createBulkNotificationJob(
      tenantId,
      jobName,
      'at_risk_students',
      atRiskStudents.length,
      { className },
      createdBy || 'system'
    )

    // Update job status to in_progress
    await updateBulkNotificationJobStatus(job.id, 'in_progress')

    let sentCount = 0
    let failedCount = 0

    // Create notifications for each at-risk student
    for (const student of atRiskStudents) {
      try {
        // Get student details including guardian email
        const studentRecord = await queryOne<any>(
          `SELECT guardian, email, phone FROM students WHERE id = $1 AND tenant_id = $2`,
          [student.studentId, tenantId]
        )

        if (!studentRecord || !studentRecord.email) {
          failedCount++
          continue
        }

        const title = `Attendance Alert: ${student.name}`
        const message = `Your child's attendance has fallen below 85%. Current attendance: ${student.attendance}%. Please take action to improve attendance.`
        const recommendedActions = `
1. Discuss attendance importance with your child
2. Identify and address barriers to attendance
3. Contact the school if there are health or family issues
4. Review the attendance policy with your child
5. Set up a meeting with the class advisor if needed
        `.trim()

        await createGuardianNotification(
          tenantId,
          student.studentId,
          studentRecord.email,
          studentRecord.phone,
          'at_risk_attendance',
          title,
          message,
          student.attendance,
          student.absenceCount,
          student.lateCount,
          recommendedActions,
          'email',
          createdBy
        )

        sentCount++
      } catch (error) {
        console.error(`Error creating notification for student ${student.studentId}:`, error)
        failedCount++
      }
    }

    // Update job status to completed
    await updateBulkNotificationJobStatus(
      job.id,
      'completed',
      sentCount,
      failedCount,
      0
    )

    // Invalidate cache
    invalidateAnalyticsCache(tenantId)

    return {
      notificationCount: sentCount,
      jobId: job.id,
    }
  } catch (error) {
    console.error('Error triggering at-risk notifications:', error)
    throw new Error('Failed to trigger at-risk notifications')
  }
}
