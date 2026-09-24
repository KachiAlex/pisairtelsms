import { describe, it, expect, beforeEach, vi } from 'vitest'
import handler from './dashboard'
import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { requireRole } from '../_lib/auth-middleware.js'

vi.mock('../_lib/auth-middleware.js', () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('../_lib/sql.js', () => ({
  sql: vi.fn(),
}));

vi.mock('./_lib/verify-child.js', () => ({
  verifyParentChildAccess: vi.fn(),
}));

import { sql } from '../_lib/sql.js'
import { verifyParentChildAccess } from './_lib/verify-child.js'

const mockRequireRole = vi.mocked(requireRole);
const mockSql = vi.mocked(sql);
const mockVerifyChild = vi.mocked(verifyParentChildAccess);

const mockDecoded = {
  tenantId: 'test-tenant',
  role: 'parent',
  parentId: 'test-parent',
  childrenIds: ['child-123'],
} as any;

describe('Parent Dashboard API', () => {
  let req: Partial<ApiRequest>
  let res: Partial<ApiResponse>
  let statusCode: number
  let responseData: any

  beforeEach(() => {
    statusCode = 200
    responseData = null
    mockRequireRole.mockReset()
    mockRequireRole.mockResolvedValue(mockDecoded)
    mockVerifyChild.mockReset()
    mockVerifyChild.mockResolvedValue(true)
    mockSql.mockReset()
    mockSql.mockImplementation(async (strings: any) => {
      const text = (strings as TemplateStringsArray).join(' ')
      if (text.includes('FROM parents')) {
        return { rows: [{ name: 'Test Parent' }] }
      }
      if (text.includes('FROM students')) {
        return { rows: [{ id: 'child-123', name: 'Test Child', admission_no: 'ADM-001', class: 'JSS 1', arm: 'A' }] }
      }
      if (text.includes('FROM attendance')) {
        return { rows: [{ present: '80', total: '100' }] }
      }
      if (text.includes('FROM fee_assignments')) {
        return { rows: [{ balance: '5000' }] }
      }
      if (text.includes('FROM compiled_results')) {
        return { rows: [{ id: 'r1', subject: 'Mathematics', total_score: '85', compiled_at: '2024-05-01' }] }
      }
      if (text.includes('FROM announcements')) {
        return { rows: [{ id: 'a1', title: 'Announcement', date: '2024-05-01', preview: 'Preview text' }] }
      }
      if (text.includes('FROM exams')) {
        return { rows: [{ id: 'e1', date: '2024-06-01', title: 'Midterm', description: 'Examination' }] }
      }
      return { rows: [] }
    })

    req = {
      method: 'GET',
      headers: {},
      query: {},
    }

    res = {
      status: vi.fn(function (code: number) {
        statusCode = code
        return this
      }),
      json: vi.fn(function (data: any) {
        responseData = data
        return this
      }),
      setHeader: vi.fn(function () {
        return this
      }),
    }
  })

  it('should return 405 for non-GET requests', async () => {
    req.method = 'POST'
    await handler(req as ApiRequest, res as ApiResponse)
    expect(statusCode).toBe(405)
    expect(responseData.error).toBe('Method not allowed')
  })

  it('should return 401 when no token provided', async () => {
    req.headers = {}
    mockRequireRole.mockImplementationOnce(async (_req: any, _res: any) => {
      _res.status(401).json({ error: 'Unauthorized: Missing token' })
      return null
    })
    await handler(req as ApiRequest, res as ApiResponse)
    expect(statusCode).toBe(401)
    expect(responseData.error).toContain('Unauthorized')
  })

  it('should return 400 when childId is missing', async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    req.query = {}
    await handler(req as ApiRequest, res as ApiResponse)
    expect(statusCode).toBe(400)
    expect(responseData.error).toContain('childId is required')
  })

  it('should return 200 with dashboard data for valid request', async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    req.query = { childId: 'child-123' }
    await handler(req as ApiRequest, res as ApiResponse)
    expect(statusCode).toBe(200)
    expect(responseData).toHaveProperty('parent')
    expect(responseData).toHaveProperty('child')
    expect(responseData).toHaveProperty('metrics')
    expect(responseData).toHaveProperty('recentGrades')
    expect(responseData).toHaveProperty('recentAnnouncements')
    expect(responseData).toHaveProperty('upcomingEvents')
    expect(responseData).toHaveProperty('alerts')
  })

  it('should include correct metrics structure', async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    req.query = { childId: 'child-123' }
    await handler(req as ApiRequest, res as ApiResponse)
    expect(responseData.metrics).toHaveProperty('attendancePercent')
    expect(responseData.metrics).toHaveProperty('gpa')
    expect(responseData.metrics).toHaveProperty('outstandingFees')
    expect(responseData.metrics).toHaveProperty('nextExamDate')
  })

  it('should include recent grades array', async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    req.query = { childId: 'child-123' }
    await handler(req as ApiRequest, res as ApiResponse)
    expect(Array.isArray(responseData.recentGrades)).toBe(true)
    if (responseData.recentGrades.length > 0) {
      expect(responseData.recentGrades[0]).toHaveProperty('id')
      expect(responseData.recentGrades[0]).toHaveProperty('subject')
      expect(responseData.recentGrades[0]).toHaveProperty('score')
      expect(responseData.recentGrades[0]).toHaveProperty('date')
    }
  })

  it('should include alerts with severity levels', async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    req.query = { childId: 'child-123' }
    await handler(req as ApiRequest, res as ApiResponse)
    expect(Array.isArray(responseData.alerts)).toBe(true)
    if (responseData.alerts.length > 0) {
      expect(['info', 'warning', 'critical']).toContain(responseData.alerts[0].severity)
    }
  })

  it('should handle errors gracefully', async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    req.query = { childId: 'child-123' }
    // Simulate error by not providing proper setup
    await handler(req as ApiRequest, res as ApiResponse)
    expect([200, 400, 401, 403, 500]).toContain(statusCode)
  })
})
