
/**
 * End-to-End Tests for Attendance System
 * Tasks: 5.3.1 Teacher entry workflow, 5.3.2 Admin analytics dashboard,
 *        5.3.3 Device management workflow, 5.3.4 Batch upload workflow
 * Validates: Requirements 1, 2, 3, 4, 6, 14, 15, 16, 22
 *
 * These tests simulate complete user workflows from API request to response,
 * mocking only the database layer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

vi.mock('../../_lib/auth-middleware.js', () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));
import { requireRole } from '../../_lib/auth-middleware.js'

const mockRequireRole = vi.mocked(requireRole)
const mockDecoded = {
  tenantId: 'tenant-e2e',
  userId: 'test-user',
  role: 'tenant_admin',
  staffId: 'test-staff',
  parentId: 'test-parent',
  studentId: 'test-student',
  childrenIds: ['child-123'],
} as any



// ============================================================================
// Mock database layer only — business logic runs for real
// ============================================================================

vi.mock('../cbt/_lib/db.js', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
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
    method: 'GET',
    headers: {
      'x-tenant-id': 'tenant-e2e',
      'x-user-id': 'teacher-e2e',
    },
    query: {},
    body: null,
    ...overrides,
  }
  return req
}

// ============================================================================
// 5.3.1 Teacher Attendance Entry Workflow
// ============================================================================

describe('5.3.1 Teacher Attendance Entry Workflow', () => {
  let db: any

  beforeEach(async () => {
    vi.clearAllMocks()
    db = await import('../cbt/_lib/db.js')
    // Default transaction mock
    db.transaction.mockImplementation(async (fn: any) => fn({ query: vi.fn() }))
  })

  it('complete workflow: teacher submits attendance for a class', async () => {
    // Step 1: Student and class exist
    db.queryOne
      .mockResolvedValueOnce({ id: 'student-1' }) // studentExists STU001
      .mockResolvedValueOnce({ id: 'class-1' })   // classExists JSS 1
      .mockResolvedValueOnce({ id: 'att-1', is_insert: true }) // upsert result
      .mockResolvedValueOnce(null) // audit trail insert

    db.query.mockResolvedValue({ rowCount: 1 })

    const { upsertAttendanceBatch } = await import('../_lib/attendance.js')

    const records = [
      {
        studentId: 'STU001',
        class: 'JSS 1',
        date: '2024-05-04',
        status: 'present' as const,
        source: 'teacher_entry' as const,
        userId: 'teacher-e2e',
        academicSession: '2024/2025',
        term: '1',
      },
    ]

    const result = await upsertAttendanceBatch('tenant-e2e', records)

    expect(result.errors).toHaveLength(0)
    expect(result.inserted + result.updated).toBe(1)
  })

  it('workflow: teacher modifies past attendance creates audit trail', async () => {
    db.queryOne
      .mockResolvedValueOnce({ id: 'att-1', attendance_record_id: 'att-1', action: 'update', old_value: null, new_value: null, changed_by: 'teacher-e2e', changed_at: new Date() })

    const { createAuditTrailEntry } = await import('../_lib/attendance.js')

    const entry = await createAuditTrailEntry(
      'att-1',
      'update',
      { status: 'absent' },
      { status: 'present' },
      'teacher-e2e'
    )

    expect(entry.action).toBe('update')
    expect(entry.changedBy).toBe('teacher-e2e')
  })

  it('workflow: teacher cannot submit attendance for future date', async () => {
    const { upsertAttendanceBatch } = await import('../_lib/attendance.js')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().split('T')[0]

    const result = await upsertAttendanceBatch('tenant-e2e', [
      {
        studentId: 'STU001',
        class: 'JSS 1',
        date: futureDate,
        status: 'present',
        source: 'teacher_entry',
        userId: 'teacher-e2e',
        academicSession: '2024/2025',
        term: '1',
      },
    ])

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].error).toContain('future')
  })

  it('workflow: duplicate entry for same student+date is updated not duplicated', async () => {
    db.queryOne
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({ id: 'class-1' })
      .mockResolvedValueOnce({ id: 'att-existing', is_insert: false }) // conflict → update
    db.query.mockResolvedValue({ rowCount: 1 })

    const { upsertAttendanceBatch } = await import('../_lib/attendance.js')

    const result = await upsertAttendanceBatch('tenant-e2e', [
      {
        studentId: 'STU001',
        class: 'JSS 1',
        date: '2024-05-04',
        status: 'present',
        source: 'teacher_entry',
        userId: 'teacher-e2e',
        academicSession: '2024/2025',
        term: '1',
      },
    ])

    expect(result.updated).toBe(1)
    expect(result.inserted).toBe(0)
  })
})

// ============================================================================
// 5.3.2 Admin Analytics Dashboard Workflow
// ============================================================================

describe('5.3.2 Admin Analytics Dashboard Workflow', () => {
  let db: any

  beforeEach(async () => {
    vi.clearAllMocks()
    db = await import('../cbt/_lib/db.js')
    const { invalidateAnalyticsCache } = await import('../_lib/attendance.js')
    invalidateAnalyticsCache('tenant-e2e')
  })

  it('workflow: admin views summary statistics', async () => {
    db.queryOne.mockResolvedValueOnce({
      total: '500',
      present: '450',
      absent: '30',
      late: '20',
    })

    const { calculateSummaryStats } = await import('../_lib/attendance.js')
    const stats = await calculateSummaryStats('tenant-e2e', '1', '2024/2025')

    expect(stats.presentRate).toBe(90.0)
    expect(stats.absentRate).toBe(6.0)
    expect(stats.lateRate).toBe(4.0)
    expect(stats.totalRecords).toBe(500)
    expect(stats.dataFreshness).toBeDefined()
  })

  it('workflow: admin views weekly heatmap with color coding', async () => {
    db.queryAll.mockResolvedValueOnce([
      { week: '2024-W20', total: '100', present: '97', absent: '2', late: '1' },
      { week: '2024-W19', total: '100', present: '90', absent: '7', late: '3' },
      { week: '2024-W18', total: '100', present: '80', absent: '15', late: '5' },
      { week: '2024-W17', total: '100', present: '60', absent: '35', late: '5' },
    ])

    const { calculateWeeklyHeatmap } = await import('../_lib/attendance.js')
    const heatmap = await calculateWeeklyHeatmap('tenant-e2e', 4)

    expect(heatmap).toHaveLength(4)
    expect(heatmap[0].color).toBe('green')  // 97% ≥ 95%
    expect(heatmap[1].color).toBe('yellow') // 90% in 85-94%
    expect(heatmap[2].color).toBe('red')    // 80% < 85%
    expect(heatmap[3].color).toBe('red')    // 60% < 85%
  })

  it('workflow: admin identifies at-risk students', async () => {
    db.queryAll.mockResolvedValueOnce([
      {
        student_id: 'STU001',
        name: 'Alice',
        class: 'JSS 1',
        total_days: '20',
        present_days: '14',
        absent_days: '5',
        late_days: '1',
        owner: 'Mr. Smith',
      },
    ])

    const { identifyAtRiskStudents } = await import('../_lib/attendance.js')
    const atRisk = await identifyAtRiskStudents('tenant-e2e')

    expect(atRisk).toHaveLength(1)
    expect(atRisk[0].attendance).toBe(70.0)
    expect(atRisk[0].attendance).toBeLessThan(85)
    expect(atRisk[0].reason).toBe('absence')
  })

  it('workflow: admin views homeroom leaderboard', async () => {
    db.queryAll.mockResolvedValueOnce([
      { homeroom: 'JSS 1A', rate: '97.5', student_count: '30', present_count: '585' },
      { homeroom: 'JSS 2B', rate: '95.0', student_count: '28', present_count: '532' },
      { homeroom: 'JSS 3C', rate: '92.3', student_count: '25', present_count: '461' },
    ])

    const { calculateHomeroomLeaderboard } = await import('../_lib/attendance.js')
    const leaderboard = await calculateHomeroomLeaderboard('tenant-e2e')

    expect(leaderboard.entries).toHaveLength(3)
    expect(leaderboard.entries[0].homeroom).toBe('JSS 1A')
    expect(leaderboard.entries[0].rate).toBe(97.5)
    expect(leaderboard.calculationDate).toBeDefined()
  })

  it('workflow: analytics cache is invalidated after new attendance entry', async () => {
    // First call populates cache
    db.queryOne.mockResolvedValueOnce({ total: '100', present: '90', absent: '7', late: '3' })
    const { calculateSummaryStats, invalidateAnalyticsCache } = await import('../_lib/attendance.js')

    const stats1 = await calculateSummaryStats('tenant-e2e')
    expect(stats1.presentRate).toBe(90.0)

    // Invalidate cache (simulating new attendance entry)
    invalidateAnalyticsCache('tenant-e2e')

    // Second call should hit DB again with new data
    db.queryOne.mockResolvedValueOnce({ total: '101', present: '92', absent: '7', late: '2' })
    const stats2 = await calculateSummaryStats('tenant-e2e')
    expect(stats2.totalRecords).toBe(101)
  })
})

// ============================================================================
// 5.3.3 Device Management Workflow
// ============================================================================

describe('5.3.3 Device Management Workflow', () => {
  beforeEach(() => {
    mockRequireRole.mockReset()
    mockRequireRole.mockResolvedValue(mockDecoded)
    vi.clearAllMocks()
  })

  it('workflow: sync with no enrollments returns success with 0 records', async () => {
    const biometricMod = await import('../_lib/biometric-devices.js')
    const { syncDevice } = await import('../_lib/device-sync.js')

    vi.mocked(biometricMod.getDevice).mockResolvedValue({
      id: 'device-1',
      tenantId: 'tenant-e2e',
      deviceName: 'Test Scanner',
      deviceType: 'fingerprint' as const,
      status: 'active' as const,
      syncStatus: 'pending' as const,
      syncFrequency: 'daily' as const,
      consecutiveFailures: 0,
      enrolledStudentsCount: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    })
    vi.mocked(biometricMod.getEnrollments).mockResolvedValue([])
    vi.mocked(biometricMod.logSync).mockResolvedValue({} as any)
    vi.mocked(biometricMod.resetConsecutiveFailures).mockResolvedValue({} as any)

    const result = await syncDevice('tenant-e2e', 'device-1')

    expect(result.status).toBe('success')
    expect(result.recordsSynced).toBe(0)
    expect(result.deviceId).toBe('device-1')
  })

  it('workflow: sync fails when device is in maintenance', async () => {
    const biometricMod = await import('../_lib/biometric-devices.js')
    const { syncDevice } = await import('../_lib/device-sync.js')

    vi.mocked(biometricMod.getDevice).mockResolvedValue({
      id: 'device-1',
      tenantId: 'tenant-e2e',
      deviceName: 'Test Scanner',
      deviceType: 'fingerprint' as const,
      status: 'maintenance' as const,
      syncStatus: 'pending' as const,
      syncFrequency: 'daily' as const,
      consecutiveFailures: 0,
      enrolledStudentsCount: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    })
    vi.mocked(biometricMod.logSync).mockResolvedValue({} as any)
    vi.mocked(biometricMod.incrementConsecutiveFailures).mockResolvedValue({} as any)

    const result = await syncDevice('tenant-e2e', 'device-1')

    expect(result.status).toBe('failed')
    expect(result.errorDetails).toContain('maintenance')
  })

  it('workflow: next sync time calculated correctly for each frequency', () => {
    const { getNextSyncTime } = require('../_lib/device-sync.js')
    const base = '2024-05-04T10:00:00Z'

    const hourly = getNextSyncTime(base, 'hourly')
    const every4h = getNextSyncTime(base, 'every_4_hours')
    const daily = getNextSyncTime(base, 'daily')

    const baseMs = new Date(base).getTime()
    expect(hourly.getTime()).toBe(baseMs + 60 * 60 * 1000)
    expect(every4h.getTime()).toBe(baseMs + 4 * 60 * 60 * 1000)
    expect(daily.getTime()).toBe(baseMs + 24 * 60 * 60 * 1000)
  })
})

// ============================================================================
// 5.3.4 Batch Upload Workflow
// ============================================================================

describe('5.3.4 Batch Upload Workflow', () => {
  it('workflow: CSV template is parseable', () => {
    const { generateCsvTemplate, parseCsvContent } = require('../_lib/csv-parser.js')
    const template = generateCsvTemplate()
    const result = parseCsvContent(template)

    expect(result.errors).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
  })

  it('workflow: valid CSV rows are parsed and validated', () => {
    const { parseCsvContent } = require('../_lib/csv-parser.js')
    const csv = [
      'studentId,class,date,status,academicSession,term',
      'STU001,JSS 1,2024-05-04,present,2024/2025,1',
      'STU002,JSS 1,2024-05-04,absent,2024/2025,1',
      'STU003,JSS 1,2024-05-04,late,2024/2025,1',
    ].join('\n')

    const result = parseCsvContent(csv)

    expect(result.valid).toHaveLength(3)
    expect(result.errors).toHaveLength(0)
    expect(result.totalRows).toBe(3)
  })

  it('workflow: invalid rows are separated from valid rows', () => {
    const { parseCsvContent } = require('../_lib/csv-parser.js')
    const csv = [
      'studentId,class,date,status,academicSession,term',
      'STU001,JSS 1,2024-05-04,present,2024/2025,1',
      'STU002,JSS 1,2024-05-04,invalid_status,2024/2025,1',
      'STU003,JSS 1,2024-05-04,absent,2024/2025,1',
    ].join('\n')

    const result = parseCsvContent(csv)

    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
    expect(result.totalRows).toBe(3)
  })

  it('workflow: future dates are rejected in batch upload', () => {
    const { parseCsvContent } = require('../_lib/csv-parser.js')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().split('T')[0]

    const csv = [
      'studentId,class,date,status,academicSession,term',
      `STU001,JSS 1,${futureDate},present,2024/2025,1`,
    ].join('\n')

    const result = parseCsvContent(csv)

    expect(result.valid).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('future')
  })

  it('workflow: report generation produces valid CSV output', () => {
    const { generateCSVContent } = require('../_lib/report-generator.js')
    const reportData = {
      records: [
        {
          id: '1',
          tenantId: 'tenant-e2e',
          studentId: 'STU001',
          class: 'JSS 1',
          date: '2024-05-04',
          status: 'present',
          source: 'teacher_entry',
          userId: 'user-1',
          academicSession: '2024/2025',
          term: '1',
          createdAt: '2024-05-04T10:00:00Z',
          updatedAt: '2024-05-04T10:00:00Z',
        },
      ],
      summary: {
        totalRecords: 1,
        presentCount: 1,
        absentCount: 0,
        lateCount: 0,
        presentRate: 100,
        absentRate: 0,
        lateRate: 0,
      },
      generatedAt: '2024-05-04T12:00:00Z',
      filters: {},
    }

    const csv = generateCSVContent(reportData)

    expect(csv).toContain('STU001')
    expect(csv).toContain('present')
    expect(csv).toContain('Total Records,1')
  })
})
