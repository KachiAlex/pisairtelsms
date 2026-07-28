import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Integration tests for attendance analytics API endpoints
 * Tests:
 *   GET /api/tenant/attendance/analytics/dashboard
 *   GET /api/tenant/attendance/analytics/heatmap
 *   GET /api/tenant/attendance/analytics/at-risk-students
 *   GET /api/tenant/attendance/analytics/homeroom-leaderboard
 *   GET /api/tenant/attendance/audit-trail
 * Validates: Requirements 14, 15, 16, 19, 22
 */

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

function createMockResponse(): VercelResponse {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  }
  return res
}

function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  const req: any = {
    method: 'GET',
    headers: { 'x-tenant-id': 'tenant-123' },
    query: {},
    body: null,
    ...overrides,
  }
  return req
}

// ---------------------------------------------------------------------------
// Mock the attendance library so tests don't hit the database
// ---------------------------------------------------------------------------

vi.mock('../_lib/attendance.js', () => ({
  calculateSummaryStats: vi.fn().mockResolvedValue({
    presentRate: 92.5,
    absentRate: 5.2,
    lateRate: 2.3,
    totalRecords: 1250,
    dataFreshness: '2024-05-04T10:30:00.000Z',
  }),
  calculateWeeklyHeatmap: vi.fn().mockResolvedValue([
    {
      week: '2024-W18',
      presentPct: 92,
      absentPct: 5,
      latePct: 3,
      total: 450,
      color: 'yellow',
    },
  ]),
  identifyAtRiskStudents: vi.fn().mockResolvedValue([
    {
      studentId: 'STU001',
      name: 'Alice Johnson',
      class: 'JSS 1',
      attendance: 72.5,
      reason: 'absence',
      absenceCount: 8,
      lateCount: 2,
      owner: 'Mr. Smith',
    },
    {
      studentId: 'STU002',
      name: 'Bob Williams',
      class: 'JSS 2',
      attendance: 80.0,
      reason: 'late',
      absenceCount: 3,
      lateCount: 6,
      owner: null,
    },
  ]),
  calculateHomeroomLeaderboard: vi.fn().mockResolvedValue({
    entries: [
      { homeroom: 'JSS 3A', rate: 97.5, studentCount: 30, presentCount: 29 },
      { homeroom: 'JSS 1B', rate: 95.0, studentCount: 28, presentCount: 27 },
    ],
    calculationDate: '2024-05-04T10:30:00.000Z',
  }),
  getGlobalAuditTrail: vi.fn().mockResolvedValue({
    entries: [
      {
        id: 'audit-1',
        attendanceRecordId: 'rec-1',
        action: 'create',
        oldValue: undefined,
        newValue: { status: 'present', source: 'teacher_entry' },
        changedBy: 'user-456',
        changedAt: '2024-05-04T10:30:00.000Z',
      },
    ],
    total: 1,
  }),
}))

// ---------------------------------------------------------------------------
// Import handlers AFTER mocks are set up
// ---------------------------------------------------------------------------

import dashboardHandler from './analytics/dashboard.js'
import heatmapHandler from './analytics/heatmap.js'
import atRiskHandler from './analytics/at-risk-students.js'
import leaderboardHandler from './analytics/homeroom-leaderboard.js'
import auditTrailHandler from './audit-trail.js'

// ---------------------------------------------------------------------------
// Dashboard endpoint tests
// ---------------------------------------------------------------------------

describe('GET /api/tenant/attendance/analytics/dashboard', () => {
  it('should return 401 when tenant context is missing', async () => {
    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()

    await dashboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toContain('Tenant context required')
  })

  it('should return 405 for non-GET methods', async () => {
    const req = createMockRequest({ method: 'POST' })
    const res = createMockResponse()

    await dashboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET')
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toContain('Method not allowed')
  })

  it('should accept tenant ID from x-tenant-id header', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await dashboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(true)
  })

  it('should accept tenant ID from tenantId query param', async () => {
    const req = createMockRequest({ headers: {}, query: { tenantId: 'tenant-123' } })
    const res = createMockResponse()

    await dashboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(true)
  })

  it('should return summary stats with correct shape', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await dashboardHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      presentRate: expect.any(Number),
      absentRate: expect.any(Number),
      lateRate: expect.any(Number),
      totalRecords: expect.any(Number),
      dataFreshness: expect.any(String),
    })
  })

  it('should pass term and academicSession query params to the library', async () => {
    const { calculateSummaryStats } = await import('../_lib/attendance.js')
    const req = createMockRequest({ query: { term: '1', academicSession: '2024/2025' } })
    const res = createMockResponse()

    await dashboardHandler(req, res)

    expect(calculateSummaryStats).toHaveBeenCalledWith('tenant-123', '1', '2024/2025')
  })

  it('should return 500 when the library throws', async () => {
    const { calculateSummaryStats } = await import('../_lib/attendance.js')
    vi.mocked(calculateSummaryStats).mockRejectedValueOnce(new Error('DB error'))

    const req = createMockRequest()
    const res = createMockResponse()

    await dashboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toContain('Failed to fetch dashboard analytics')
  })
})

// ---------------------------------------------------------------------------
// Heatmap endpoint tests
// ---------------------------------------------------------------------------

describe('GET /api/tenant/attendance/analytics/heatmap', () => {
  it('should return 401 when tenant context is missing', async () => {
    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()

    await heatmapHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
  })

  it('should return 405 for non-GET methods', async () => {
    const req = createMockRequest({ method: 'DELETE' })
    const res = createMockResponse()

    await heatmapHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return heatmap array with correct shape', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await heatmapHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0]).toMatchObject({
      week: expect.any(String),
      presentPct: expect.any(Number),
      absentPct: expect.any(Number),
      latePct: expect.any(Number),
      total: expect.any(Number),
      color: expect.stringMatching(/^(green|yellow|red)$/),
    })
  })

  it('should default to 4 weeks when weeks param is absent', async () => {
    const { calculateWeeklyHeatmap } = await import('../_lib/attendance.js')
    const req = createMockRequest()
    const res = createMockResponse()

    await heatmapHandler(req, res)

    expect(calculateWeeklyHeatmap).toHaveBeenCalledWith('tenant-123', 4, undefined)
  })

  it('should pass weeks and class params to the library', async () => {
    const { calculateWeeklyHeatmap } = await import('../_lib/attendance.js')
    const req = createMockRequest({ query: { weeks: '8', class: 'JSS 1' } })
    const res = createMockResponse()

    await heatmapHandler(req, res)

    expect(calculateWeeklyHeatmap).toHaveBeenCalledWith('tenant-123', 8, 'JSS 1')
  })

  it('should cap weeks at 52', async () => {
    const { calculateWeeklyHeatmap } = await import('../_lib/attendance.js')
    const req = createMockRequest({ query: { weeks: '100' } })
    const res = createMockResponse()

    await heatmapHandler(req, res)

    expect(calculateWeeklyHeatmap).toHaveBeenCalledWith('tenant-123', 52, undefined)
  })

  it('should return 500 when the library throws', async () => {
    const { calculateWeeklyHeatmap } = await import('../_lib/attendance.js')
    vi.mocked(calculateWeeklyHeatmap).mockRejectedValueOnce(new Error('DB error'))

    const req = createMockRequest()
    const res = createMockResponse()

    await heatmapHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// At-risk students endpoint tests
// ---------------------------------------------------------------------------

describe('GET /api/tenant/attendance/analytics/at-risk-students', () => {
  it('should return 401 when tenant context is missing', async () => {
    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()

    await atRiskHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should return 405 for non-GET methods', async () => {
    const req = createMockRequest({ method: 'PUT' })
    const res = createMockResponse()

    await atRiskHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return at-risk students with pagination metadata', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await atRiskHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: expect.any(Number),
    })
  })

  it('should apply pagination correctly', async () => {
    const req = createMockRequest({ query: { limit: '1', offset: '0' } })
    const res = createMockResponse()

    await atRiskHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.data).toHaveLength(1)
    expect(body.pagination.limit).toBe(1)
    expect(body.pagination.offset).toBe(0)
    expect(body.pagination.total).toBe(2) // mock returns 2 students
  })

  it('should return 400 for invalid reason filter', async () => {
    const req = createMockRequest({ query: { reason: 'invalid_reason' } })
    const res = createMockResponse()

    await atRiskHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toContain('reason must be one of')
  })

  it('should pass class and reason filters to the library', async () => {
    const { identifyAtRiskStudents } = await import('../_lib/attendance.js')
    const req = createMockRequest({ query: { class: 'JSS 1', reason: 'absence' } })
    const res = createMockResponse()

    await atRiskHandler(req, res)

    expect(identifyAtRiskStudents).toHaveBeenCalledWith('tenant-123', 'JSS 1', 'absence')
  })

  it('should cap limit at 500', async () => {
    const req = createMockRequest({ query: { limit: '9999' } })
    const res = createMockResponse()

    await atRiskHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.pagination.limit).toBe(500)
  })

  it('should return 500 when the library throws', async () => {
    const { identifyAtRiskStudents } = await import('../_lib/attendance.js')
    vi.mocked(identifyAtRiskStudents).mockRejectedValueOnce(new Error('DB error'))

    const req = createMockRequest()
    const res = createMockResponse()

    await atRiskHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Homeroom leaderboard endpoint tests
// ---------------------------------------------------------------------------

describe('GET /api/tenant/attendance/analytics/homeroom-leaderboard', () => {
  it('should return 401 when tenant context is missing', async () => {
    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()

    await leaderboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should return 405 for non-GET methods', async () => {
    const req = createMockRequest({ method: 'PATCH' })
    const res = createMockResponse()

    await leaderboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('should return leaderboard with entries and calculationDate', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await leaderboardHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      entries: expect.any(Array),
      calculationDate: expect.any(String),
    })
  })

  it('should return entries with correct shape', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await leaderboardHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.data.entries[0]).toMatchObject({
      homeroom: expect.any(String),
      rate: expect.any(Number),
      studentCount: expect.any(Number),
      presentCount: expect.any(Number),
    })
  })

  it('should pass term filter to the library', async () => {
    const { calculateHomeroomLeaderboard } = await import('../_lib/attendance.js')
    const req = createMockRequest({ query: { term: '2' } })
    const res = createMockResponse()

    await leaderboardHandler(req, res)

    expect(calculateHomeroomLeaderboard).toHaveBeenCalledWith('tenant-123', '2')
  })

  it('should return 500 when the library throws', async () => {
    const { calculateHomeroomLeaderboard } = await import('../_lib/attendance.js')
    vi.mocked(calculateHomeroomLeaderboard).mockRejectedValueOnce(new Error('DB error'))

    const req = createMockRequest()
    const res = createMockResponse()

    await leaderboardHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Audit trail endpoint tests
// ---------------------------------------------------------------------------

describe('GET /api/tenant/attendance/audit-trail', () => {
  it('should return 401 when tenant context is missing', async () => {
    const req = createMockRequest({ headers: {} })
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toContain('Tenant context required')
  })

  it('should return 405 for non-GET methods', async () => {
    const req = createMockRequest({ method: 'POST' })
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET')
  })

  it('should return audit entries with pagination metadata', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: expect.any(Number),
    })
  })

  it('should return entries with correct shape', async () => {
    const req = createMockRequest()
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.data[0]).toMatchObject({
      id: expect.any(String),
      attendanceRecordId: expect.any(String),
      action: expect.stringMatching(/^(create|update|delete)$/),
      changedBy: expect.any(String),
      changedAt: expect.any(String),
    })
  })

  it('should return 400 for invalid action filter', async () => {
    const req = createMockRequest({ query: { action: 'invalid_action' } })
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toContain('action must be one of')
  })

  it('should pass all filters to the library', async () => {
    const { getGlobalAuditTrail } = await import('../_lib/attendance.js')
    const req = createMockRequest({
      query: {
        studentId: 'STU001',
        startDate: '2024-05-01',
        endDate: '2024-05-31',
        action: 'update',
        limit: '25',
        offset: '10',
      },
    })
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    expect(getGlobalAuditTrail).toHaveBeenCalledWith('tenant-123', {
      studentId: 'STU001',
      startDate: '2024-05-01',
      endDate: '2024-05-31',
      action: 'update',
      limit: 25,
      offset: 10,
    })
  })

  it('should default limit to 50 and offset to 0', async () => {
    const { getGlobalAuditTrail } = await import('../_lib/attendance.js')
    const req = createMockRequest()
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    expect(getGlobalAuditTrail).toHaveBeenCalledWith(
      'tenant-123',
      expect.objectContaining({ limit: 50, offset: 0 })
    )
  })

  it('should cap limit at 500', async () => {
    const req = createMockRequest({ query: { limit: '9999' } })
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    const body = res.json.mock.calls[0][0]
    expect(body.pagination.limit).toBe(500)
  })

  it('should return 500 when the library throws', async () => {
    const { getGlobalAuditTrail } = await import('../_lib/attendance.js')
    vi.mocked(getGlobalAuditTrail).mockRejectedValueOnce(new Error('DB error'))

    const req = createMockRequest()
    const res = createMockResponse()

    await auditTrailHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toContain('Failed to fetch audit trail')
  })
})
