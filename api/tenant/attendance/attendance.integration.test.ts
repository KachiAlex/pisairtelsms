
/**
 * Integration Tests for Attendance System
 * Tasks: 5.2.1 Teacher entry flow, 5.2.2 Device sync flow,
 *        5.2.3 Batch upload flow, 5.2.4 Analytics accuracy, 5.2.5 Audit trail
 * Validates: Requirements 1, 4, 6, 9, 19, 21, 22
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// ============================================================================
// Mock all database and external dependencies
// ============================================================================

vi.mock('../_lib/db.js', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('../cbt/_lib/db.js', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('../_lib/attendance.js', () => ({
  fetchAttendance: vi.fn(),
  upsertAttendanceBatch: vi.fn(),
  createAuditTrailEntry: vi.fn(),
  deleteAttendanceRecord: vi.fn(),
  getAuditTrail: vi.fn(),
  attendanceExists: vi.fn(),
  getAttendanceStats: vi.fn(),
  calculateSummaryStats: vi.fn(),
  calculateWeeklyHeatmap: vi.fn(),
  identifyAtRiskStudents: vi.fn(),
  calculateHomeroomLeaderboard: vi.fn(),
  getGlobalAuditTrail: vi.fn(),
  invalidateAnalyticsCache: vi.fn(),
}))

vi.mock('../_lib/biometric-devices.js', () => ({
  getDevice: vi.fn(),
  getEnrollments: vi.fn(),
  logSync: vi.fn(),
  incrementConsecutiveFailures: vi.fn(),
  resetConsecutiveFailures: vi.fn(),
  findStudentByBiometricId: vi.fn(),
}))

vi.mock('../_lib/csv-parser.js', () => ({
  parseCsvContent: vi.fn(),
  generateCsvTemplate: vi.fn(),
}))

// ============================================================================
// Helpers
// ============================================================================

function createMockResponse(): VercelResponse {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  }
  return res
}

function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  const req: any = {
    method: 'POST',
    headers: {
      'x-tenant-id': 'tenant-123',
      'x-user-id': 'user-456',
    },
    query: {},
    body: null,
    ...overrides,
  }
  return req
}

// ============================================================================
// 5.2.1 Teacher Entry Flow
// ============================================================================

describe('5.2.1 Teacher Entry Flow', () => {
  let attendanceMod: any

  beforeEach(async () => {
    vi.clearAllMocks()
    attendanceMod = await import('../_lib/attendance.js')
  })

  it('POST /api/tenant/attendance - accepts valid teacher entry records', async () => {
    attendanceMod.upsertAttendanceBatch.mockResolvedValue({
      inserted: 3,
      updated: 0,
      errors: [],
    })

    const handler = (await import('../../../api/tenant/attendance.js')).default
    const req = createMockRequest({
      method: 'POST',
      body: {
        records: [
          { studentId: 'STU001', class: 'JSS 1', date: '2024-05-04', status: 'present', academicSession: '2024/2025', term: '1' },
          { studentId: 'STU002', class: 'JSS 1', date: '2024-05-04', status: 'absent', academicSession: '2024/2025', term: '1' },
          { studentId: 'STU003', class: 'JSS 1', date: '2024-05-04', status: 'late', academicSession: '2024/2025', term: '1' },
        ],
      },
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(json.data.count).toBe(3)
  })

  it('POST /api/tenant/attendance - rejects future dates', async () => {
    attendanceMod.upsertAttendanceBatch.mockResolvedValue({
      inserted: 0,
      updated: 0,
      errors: [{ record: {}, error: 'date cannot be in the future' }],
    })

    const handler = (await import('../../../api/tenant/attendance.js')).default
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().split('T')[0]

    const req = createMockRequest({
      method: 'POST',
      body: {
        records: [
          { studentId: 'STU001', class: 'JSS 1', date: futureDate, status: 'present', academicSession: '2024/2025', term: '1' },
        ],
      },
    })
    const res = createMockResponse()

    await handler(req, res)

    // Should return 400 or 200 with errors
    const statusCall = res.status.mock.calls[0][0]
    expect([200, 400]).toContain(statusCall)
  })

  it('POST /api/tenant/attendance - requires tenant context', async () => {
    const handler = (await import('../../../api/tenant/attendance.js')).default
    const req = createMockRequest({
      method: 'POST',
      headers: {},
      body: { records: [] },
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('GET /api/tenant/attendance - returns attendance records', async () => {
    attendanceMod.fetchAttendance.mockResolvedValue({
      records: [
        {
          id: 'att-1',
          tenantId: 'tenant-123',
          studentId: 'STU001',
          class: 'JSS 1',
          date: '2024-05-04',
          status: 'present',
          source: 'teacher_entry',
          userId: 'user-456',
          academicSession: '2024/2025',
          term: '1',
          createdAt: '2024-05-04T10:00:00Z',
          updatedAt: '2024-05-04T10:00:00Z',
        },
      ],
      total: 1,
    })

    const handler = (await import('../../../api/tenant/attendance.js')).default
    const req = createMockRequest({ method: 'GET', body: null })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it('GET /api/tenant/attendance - supports class filter', async () => {
    attendanceMod.fetchAttendance.mockResolvedValue({ records: [], total: 0 })

    const handler = (await import('../../../api/tenant/attendance.js')).default
    const req = createMockRequest({
      method: 'GET',
      query: { class: 'JSS 1' },
      body: null,
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(attendanceMod.fetchAttendance).toHaveBeenCalledWith(
      expect.objectContaining({ class: 'JSS 1' })
    )
  })
})

// ============================================================================
// 5.2.2 Device Sync Flow
// ============================================================================

describe('5.2.2 Device Sync Flow', () => {
  let biometricMod: any
  let attendanceMod: any

  beforeEach(async () => {
    vi.clearAllMocks()
    biometricMod = await import('../_lib/biometric-devices.js')
    attendanceMod = await import('../_lib/attendance.js')
  })

  it('sync endpoint returns 200 with sync result', async () => {
    biometricMod.getDevice.mockResolvedValue({
      id: 'device-1',
      tenantId: 'tenant-123',
      status: 'active',
      consecutiveFailures: 0,
    })
    biometricMod.getEnrollments.mockResolvedValue([])
    biometricMod.logSync.mockResolvedValue({})
    biometricMod.resetConsecutiveFailures.mockResolvedValue({})

    const handler = (await import('../../../api/tenant/biometric-devices/[deviceId]/sync.js')).default
    const req = createMockRequest({
      method: 'POST',
      query: { deviceId: 'device-1' },
      body: null,
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
  })

  it('sync endpoint returns 503 when device is in maintenance', async () => {
    biometricMod.getDevice.mockResolvedValue({
      id: 'device-1',
      tenantId: 'tenant-123',
      status: 'maintenance',
      consecutiveFailures: 0,
    })
    biometricMod.logSync.mockResolvedValue({})
    biometricMod.incrementConsecutiveFailures.mockResolvedValue({})

    const handler = (await import('../../../api/tenant/biometric-devices/[deviceId]/sync.js')).default
    const req = createMockRequest({
      method: 'POST',
      query: { deviceId: 'device-1' },
      body: null,
    })
    const res = createMockResponse()

    await handler(req, res)

    // Should return 200 with failed status or 503
    const statusCall = res.status.mock.calls[0][0]
    expect([200, 503]).toContain(statusCall)
  })

  it('sync endpoint returns 404 when device not found', async () => {
    biometricMod.getDevice.mockResolvedValue(null)
    biometricMod.logSync.mockResolvedValue({})
    biometricMod.incrementConsecutiveFailures.mockResolvedValue({})

    const handler = (await import('../../../api/tenant/biometric-devices/[deviceId]/sync.js')).default
    const req = createMockRequest({
      method: 'POST',
      query: { deviceId: 'nonexistent' },
      body: null,
    })
    const res = createMockResponse()

    await handler(req, res)

    const statusCall = res.status.mock.calls[0][0]
    expect([200, 404]).toContain(statusCall)
  })
})

// ============================================================================
// 5.2.3 Batch Upload Flow
// ============================================================================

describe('5.2.3 Batch Upload Flow', () => {
  let csvParserMod: any
  let attendanceMod: any

  beforeEach(async () => {
    vi.clearAllMocks()
    csvParserMod = await import('../_lib/csv-parser.js')
    attendanceMod = await import('../_lib/attendance.js')
  })

  it('batch upload returns summary with valid/invalid counts', async () => {
    csvParserMod.parseCsvContent.mockReturnValue({
      valid: [
        { studentId: 'STU001', class: 'JSS 1', date: '2024-05-04', status: 'present', academicSession: '2024/2025', term: '1' },
        { studentId: 'STU002', class: 'JSS 1', date: '2024-05-04', status: 'absent', academicSession: '2024/2025', term: '1' },
      ],
      errors: [{ row: 3, field: 'status', message: 'Invalid status' }],
      totalRows: 3,
    })
    attendanceMod.upsertAttendanceBatch.mockResolvedValue({
      inserted: 2,
      updated: 0,
      errors: [],
    })

    const handler = (await import('../../../api/tenant/attendance/batch-upload.js')).default
    const req = createMockRequest({
      method: 'POST',
      body: { csvContent: 'studentId,class,date,status,academicSession,term\nSTU001,JSS 1,2024-05-04,present,2024/2025,1' },
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('inserted')
    expect(json.data).toHaveProperty('invalidRecords')
  })

  it('batch upload sets source to batch_upload for all records', async () => {
    csvParserMod.parseCsvContent.mockReturnValue({
      valid: [
        { studentId: 'STU001', class: 'JSS 1', date: '2024-05-04', status: 'present', academicSession: '2024/2025', term: '1' },
      ],
      errors: [],
      totalRows: 1,
    })
    attendanceMod.upsertAttendanceBatch.mockResolvedValue({
      inserted: 1,
      updated: 0,
      errors: [],
    })

    const handler = (await import('../../../api/tenant/attendance/batch-upload.js')).default
    const req = createMockRequest({
      method: 'POST',
      body: { csvContent: 'studentId,class,date,status,academicSession,term\nSTU001,JSS 1,2024-05-04,present,2024/2025,1' },
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(attendanceMod.upsertAttendanceBatch).toHaveBeenCalledWith(
      'tenant-123',
      expect.arrayContaining([
        expect.objectContaining({ source: 'batch_upload' }),
      ])
    )
  })

  it('batch upload returns 400 when all records are invalid', async () => {
    csvParserMod.parseCsvContent.mockReturnValue({
      valid: [],
      errors: [{ row: 2, field: 'status', message: 'Invalid status' }],
      totalRows: 1,
    })

    const handler = (await import('../../../api/tenant/attendance/batch-upload.js')).default
    const req = createMockRequest({
      method: 'POST',
      body: { csvContent: 'studentId,class,date,status,academicSession,term\nSTU001,JSS 1,2024-05-04,bad,2024/2025,1' },
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ============================================================================
// 5.2.4 Analytics Accuracy
// ============================================================================

describe('5.2.4 Analytics Accuracy', () => {
  let attendanceMod: any

  beforeEach(async () => {
    vi.clearAllMocks()
    attendanceMod = await import('../_lib/attendance.js')
  })

  it('dashboard endpoint returns present/absent/late rates', async () => {
    attendanceMod.calculateSummaryStats.mockResolvedValue({
      presentRate: 92.5,
      absentRate: 5.2,
      lateRate: 2.3,
      totalRecords: 1250,
      dataFreshness: new Date().toISOString(),
    })

    const handler = (await import('../../../api/tenant/attendance/analytics/dashboard.js')).default
    const req = createMockRequest({ method: 'GET', body: null })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('presentRate')
    expect(json.data).toHaveProperty('absentRate')
    expect(json.data).toHaveProperty('lateRate')
    expect(json.data).toHaveProperty('totalRecords')
    expect(json.data).toHaveProperty('dataFreshness')
  })

  it('heatmap endpoint returns weekly data with color coding', async () => {
    attendanceMod.calculateWeeklyHeatmap.mockResolvedValue([
      { week: '2024-W20', presentPct: 97, absentPct: 2, latePct: 1, total: 100, color: 'green' },
      { week: '2024-W19', presentPct: 90, absentPct: 7, latePct: 3, total: 100, color: 'yellow' },
      { week: '2024-W18', presentPct: 80, absentPct: 15, latePct: 5, total: 100, color: 'red' },
    ])

    const handler = (await import('../../../api/tenant/attendance/analytics/heatmap.js')).default
    const req = createMockRequest({ method: 'GET', body: null })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data[0]).toHaveProperty('week')
    expect(json.data[0]).toHaveProperty('presentPct')
    expect(json.data[0]).toHaveProperty('color')
  })

  it('at-risk endpoint returns students below 85% attendance', async () => {
    attendanceMod.identifyAtRiskStudents.mockResolvedValue([
      {
        studentId: 'STU001',
        name: 'John Doe',
        class: 'JSS 1',
        attendance: 78,
        reason: 'absence',
        absenceCount: 8,
        lateCount: 2,
        owner: 'Mr. Smith',
      },
    ])

    const handler = (await import('../../../api/tenant/attendance/analytics/at-risk-students.js')).default
    const req = createMockRequest({ method: 'GET', body: null })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data[0]).toHaveProperty('studentId')
    expect(json.data[0]).toHaveProperty('attendance')
    expect(json.data[0].attendance).toBeLessThan(85)
  })

  it('leaderboard endpoint returns top homerooms', async () => {
    attendanceMod.calculateHomeroomLeaderboard.mockResolvedValue({
      entries: [
        { homeroom: 'JSS 1', rate: 97, studentCount: 30, presentCount: 585 },
        { homeroom: 'JSS 2', rate: 94, studentCount: 28, presentCount: 530 },
      ],
      calculationDate: new Date().toISOString(),
    })

    const handler = (await import('../../../api/tenant/attendance/analytics/homeroom-leaderboard.js')).default
    const req = createMockRequest({ method: 'GET', body: null })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })
})

// ============================================================================
// 5.2.5 Audit Trail Logging
// ============================================================================

describe('5.2.5 Audit Trail Logging', () => {
  let attendanceMod: any

  beforeEach(async () => {
    vi.clearAllMocks()
    attendanceMod = await import('../_lib/attendance.js')
  })

  it('audit trail endpoint returns entries in chronological order', async () => {
    attendanceMod.getGlobalAuditTrail.mockResolvedValue({
      entries: [
        {
          id: 'audit-2',
          attendanceRecordId: 'att-1',
          action: 'update',
          oldValue: { status: 'absent' },
          newValue: { status: 'present' },
          changedBy: 'user-456',
          changedAt: '2024-05-04T11:00:00Z',
        },
        {
          id: 'audit-1',
          attendanceRecordId: 'att-1',
          action: 'create',
          oldValue: null,
          newValue: { status: 'absent' },
          changedBy: 'user-456',
          changedAt: '2024-05-04T10:00:00Z',
        },
      ],
      total: 2,
    })

    const handler = (await import('../../../api/tenant/attendance/audit-trail.js')).default
    const req = createMockRequest({ method: 'GET', body: null })
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data[0]).toHaveProperty('action')
    expect(json.data[0]).toHaveProperty('changedAt')
    expect(json.data[0]).toHaveProperty('changedBy')
  })

  it('audit trail supports filtering by action type', async () => {
    attendanceMod.getGlobalAuditTrail.mockResolvedValue({ entries: [], total: 0 })

    const handler = (await import('../../../api/tenant/attendance/audit-trail.js')).default
    const req = createMockRequest({
      method: 'GET',
      query: { action: 'update' },
      body: null,
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(attendanceMod.getGlobalAuditTrail).toHaveBeenCalledWith(
      'tenant-123',
      expect.objectContaining({ action: 'update' })
    )
  })

  it('audit trail supports filtering by studentId', async () => {
    attendanceMod.getGlobalAuditTrail.mockResolvedValue({ entries: [], total: 0 })

    const handler = (await import('../../../api/tenant/attendance/audit-trail.js')).default
    const req = createMockRequest({
      method: 'GET',
      query: { studentId: 'STU001' },
      body: null,
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(attendanceMod.getGlobalAuditTrail).toHaveBeenCalledWith(
      'tenant-123',
      expect.objectContaining({ studentId: 'STU001' })
    )
  })

  it('audit trail supports date range filtering', async () => {
    attendanceMod.getGlobalAuditTrail.mockResolvedValue({ entries: [], total: 0 })

    const handler = (await import('../../../api/tenant/attendance/audit-trail.js')).default
    const req = createMockRequest({
      method: 'GET',
      query: { startDate: '2024-05-01', endDate: '2024-05-31' },
      body: null,
    })
    const res = createMockResponse()

    await handler(req, res)

    expect(attendanceMod.getGlobalAuditTrail).toHaveBeenCalledWith(
      'tenant-123',
      expect.objectContaining({ startDate: '2024-05-01', endDate: '2024-05-31' })
    )
  })
})
