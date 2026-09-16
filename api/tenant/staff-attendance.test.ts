/**
 * Staff Attendance Handler - Unit Tests
 * Tests for tenant isolation, validation, and correct SQL scoping
 * after the security fixes that added tenant_id filters.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Capture the SQL text + values passed to each sql`` call so tests can
// assert that tenant_id is included in WHERE / INSERT clauses.
const sqlCalls: Array<{ text: string; values: any[] }> = []
let sqlResult: { rows: any[]; rowCount: number } = { rows: [], rowCount: 0 }

vi.mock('../_lib/sql.js', () => ({
  sql: (strings: TemplateStringsArray, ...values: any[]) => {
    let text = ''
    for (let i = 0; i < strings.length; i++) {
      text += strings[i]
      if (i < values.length) text += `$${i + 1}`
    }
    sqlCalls.push({ text: text.trim(), values })
    return Promise.resolve(sqlResult)
  },
}))

vi.mock('./_lib/staff.js', () => ({
  ensureStaffTables: vi.fn().mockResolvedValue(undefined),
  validateGeofence: vi.fn().mockReturnValue({ withinFence: true, distance: 50 }),
  isWithinTimeWindow: vi.fn().mockReturnValue(true),
}))

vi.mock('./_lib/tenant-settings.js', () => ({
  fetchTenantSettings: vi.fn().mockResolvedValue({
    enforceGeofence: false,
    enforceTimeWindow: false,
  }),
}))

const mockRequireRole = vi.fn()
vi.mock('../_lib/auth-middleware.js', () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(method: string, opts: { query?: any; body?: any; headers?: any } = {}): ApiRequest {
  return {
    method,
    query: opts.query || {},
    body: opts.body || {},
    headers: opts.headers || {},
  } as unknown as ApiRequest
}

function makeRes(): ApiResponse & { _status: number; _json: any; _sent: any } {
  const r: any = {
    _status: 0,
    _json: null,
    _sent: undefined,
    status(code: number) { this._status = code; return this },
    json(data: any) { this._json = data; return this },
    send(data: any) { this._sent = data; return this },
    setHeader() { return this },
    end() { return this },
  }
  return r
}

// Import after mocks are registered
const handler = (await import('./staff-attendance.js')).default

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Staff Attendance Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlCalls.length = 0
    sqlResult = { rows: [], rowCount: 0 }
  })

  describe('GET — tenant isolation', () => {
    it('should filter staff_attendance by tenant_id', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 'tenant-A', role: 'staff' })
      sqlResult = { rows: [], rowCount: 0 }

      const req = makeReq('GET', { query: { date: '2025-01-15' } })
      const res = makeRes()

      await handler(req, res)

      // Find the staff_attendance SELECT call
      const attendanceCall = sqlCalls.find(c => c.text.includes('FROM staff_attendance'))
      expect(attendanceCall).toBeDefined()
      expect(attendanceCall!.text).toContain('tenant_id = $')
      expect(attendanceCall!.values).toContain('tenant-A')
    })

    it('should filter staff by tenant_id', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 'tenant-B', role: 'staff' })
      sqlResult = { rows: [], rowCount: 0 }

      const req = makeReq('GET', { query: { date: '2025-01-15' } })
      const res = makeRes()

      await handler(req, res)

      const staffCall = sqlCalls.find(c => c.text.includes('FROM staff'))
      expect(staffCall).toBeDefined()
      expect(staffCall!.values).toContain('tenant-B')
    })
  })

  describe('POST — validation', () => {
    it('should reject missing staffId', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 't1', role: 'tenant_admin' })

      const req = makeReq('POST', { body: { date: '2025-01-15', status: 'present' } })
      const res = makeRes()

      await handler(req, res)

      expect(res._status).toBe(400)
      expect(res._json.error).toContain('staffId')
    })

    it('should reject invalid status', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 't1', role: 'tenant_admin' })

      const req = makeReq('POST', { body: { staffId: 's1', date: '2025-01-15', status: 'invalid_status' } })
      const res = makeRes()

      await handler(req, res)

      expect(res._status).toBe(400)
      expect(res._json.error).toContain('status must be one of')
    })

    it('should reject bad date format', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 't1', role: 'tenant_admin' })

      const req = makeReq('POST', { body: { staffId: 's1', date: '15-01-2025', status: 'present' } })
      const res = makeRes()

      await handler(req, res)

      expect(res._status).toBe(400)
      expect(res._json.error).toContain('YYYY-MM-DD')
    })

    it('should reject future dates', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 't1', role: 'tenant_admin' })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      const dateStr = futureDate.toISOString().split('T')[0]

      const req = makeReq('POST', { body: { staffId: 's1', date: dateStr, status: 'present' } })
      const res = makeRes()

      await handler(req, res)

      expect(res._status).toBe(400)
      expect(res._json.error).toContain('future')
    })

    it('should accept valid half_day status', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 't1', role: 'tenant_admin' })
      sqlResult = { rows: [{ id: 'att1' }], rowCount: 1 }

      const today = new Date().toISOString().split('T')[0]
      const req = makeReq('POST', { body: { staffId: 's1', date: today, status: 'half_day' } })
      const res = makeRes()

      await handler(req, res)

      expect(res._status).toBe(200)
    })
  })

  describe('POST — tenant isolation', () => {
    it('should scope staff lookup by tenant_id', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 'tenant-X', role: 'tenant_admin' })
      sqlResult = { rows: [{ name: 'John' }], rowCount: 1 }

      const today = new Date().toISOString().split('T')[0]
      const req = makeReq('POST', { body: { staffId: 's1', date: today, status: 'present' } })
      const res = makeRes()

      await handler(req, res)

      const staffLookup = sqlCalls.find(c => c.text.includes('FROM staff') && c.text.includes('SELECT name'))
      expect(staffLookup).toBeDefined()
      expect(staffLookup!.text).toContain('tenant_id = $')
      expect(staffLookup!.values).toContain('tenant-X')
    })

    it('should include tenant_id in INSERT', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 'tenant-Y', role: 'tenant_admin' })
      sqlResult = { rows: [{ name: 'Jane' }], rowCount: 1 }

      const today = new Date().toISOString().split('T')[0]
      const req = makeReq('POST', { body: { staffId: 's2', date: today, status: 'present' } })
      const res = makeRes()

      await handler(req, res)

      const insertCall = sqlCalls.find(c => c.text.includes('INSERT INTO staff_attendance'))
      expect(insertCall).toBeDefined()
      expect(insertCall!.values).toContain('tenant-Y')
    })
  })

  describe('Method not allowed', () => {
    it('should return 405 for DELETE', async () => {
      mockRequireRole.mockResolvedValue({ tenantId: 't1', role: 'staff' })

      const req = makeReq('DELETE')
      const res = makeRes()

      await handler(req, res)

      expect(res._status).toBe(405)
    })
  })
})
