import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseCsvContent, generateCsvTemplate } from '../_lib/csv-parser.js'

vi.mock('../../_lib/auth-middleware.js', () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));
import { requireRole } from '../../_lib/auth-middleware.js'

const mockRequireRole = vi.mocked(requireRole)
const mockDecoded = {
  tenantId: 'tenant-123',
  userId: 'test-user',
  role: 'tenant_admin',
  staffId: 'test-staff',
  parentId: 'test-parent',
  studentId: 'test-student',
  childrenIds: ['child-123'],
} as any



/**
 * Integration tests for batch upload functionality
 * Tests CSV parsing, validation, and the batch-upload endpoint
 * Validates: Requirements 6 (Manual Batch Upload)
 */

// ============================================================================
// Helpers
// ============================================================================

function createMockResponse(): VercelResponse {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
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

function buildCsvContent(rows: string[]): string {
  const header = 'studentId,class,date,status,academicSession,term,absenceReason'
  return [header, ...rows].join('\n')
}

const VALID_ROW = 'STU001,JSS 1,2024-05-04,present,2024/2025,1,'
const VALID_ROW_2 = 'STU002,JSS 2,2024-05-04,absent,2024/2025,1,Sick'
const VALID_ROW_LATE = 'STU003,JSS 1,2024-05-04,late,2024/2025,1,'

// ============================================================================
// CSV Parser Unit Tests (4.1.1 & 4.1.2)
// ============================================================================

describe('CSV Parser - parseCsvContent()', () => {
  describe('Header validation', () => {
    it('should reject empty CSV', () => {
      const result = parseCsvContent('')
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.valid).toHaveLength(0)
    })

    it('should reject CSV with only a header and no data rows', () => {
      const result = parseCsvContent('studentId,class,date,status,academicSession,term')
      expect(result.totalRows).toBe(0)
      expect(result.valid).toHaveLength(0)
    })

    it('should reject CSV missing required columns', () => {
      const csv = 'studentId,class,date\nSTU001,JSS 1,2024-05-04'
      const result = parseCsvContent(csv)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('header')
      expect(result.errors[0].message).toContain('Missing required columns')
      expect(result.errors[0].message).toContain('status')
    })

    it('should accept CSV with all required columns', () => {
      const csv = buildCsvContent([VALID_ROW])
      const result = parseCsvContent(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.valid).toHaveLength(1)
    })

    it('should accept CSV with extra optional columns', () => {
      const csv = 'studentId,class,date,status,academicSession,term,absenceReason,extraCol\nSTU001,JSS 1,2024-05-04,present,2024/2025,1,,extra'
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
    })
  })

  describe('Row validation', () => {
    it('should parse a valid row correctly', () => {
      const csv = buildCsvContent([VALID_ROW])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
      expect(result.valid[0]).toMatchObject({
        studentId: 'STU001',
        class: 'JSS 1',
        date: '2024-05-04',
        status: 'present',
        academicSession: '2024/2025',
        term: '1',
      })
    })

    it('should parse multiple valid rows', () => {
      const csv = buildCsvContent([VALID_ROW, VALID_ROW_2, VALID_ROW_LATE])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(3)
      expect(result.errors).toHaveLength(0)
      expect(result.totalRows).toBe(3)
    })

    it('should skip empty lines', () => {
      const csv = buildCsvContent([VALID_ROW, '', VALID_ROW_2])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(2)
      expect(result.totalRows).toBe(2)
    })

    it('should handle CRLF line endings', () => {
      const csv = `studentId,class,date,status,academicSession,term\r\n${VALID_ROW}\r\n${VALID_ROW_2}`
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(2)
    })

    it('should handle quoted values with commas', () => {
      const csv = 'studentId,class,date,status,academicSession,term\nSTU001,"JSS 1, A",2024-05-04,present,2024/2025,1'
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].class).toBe('JSS 1, A')
    })
  })

  describe('Status validation', () => {
    it('should accept "present" status', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,present,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
    })

    it('should accept "absent" status', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,absent,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
    })

    it('should accept "late" status', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,late,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
    })

    it('should reject invalid status values', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,maybe,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('status')
      expect(result.errors[0].message).toContain('must be one of')
      expect(result.valid).toHaveLength(0)
    })

    it('should normalize status to lowercase', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,PRESENT,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].status).toBe('present')
    })
  })

  describe('Date validation', () => {
    it('should reject future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const futureDate = tomorrow.toISOString().split('T')[0]
      const csv = buildCsvContent([`STU001,JSS 1,${futureDate},present,2024/2025,1,`])
      const result = parseCsvContent(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('date')
      expect(result.errors[0].message).toContain('cannot be in the future')
    })

    it('should accept today\'s date', () => {
      const today = new Date().toISOString().split('T')[0]
      const csv = buildCsvContent([`STU001,JSS 1,${today},present,2024/2025,1,`])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
    })

    it('should accept past dates', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-01-15,present,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
    })

    it('should reject invalid date format', () => {
      const csv = buildCsvContent(['STU001,JSS 1,05-04-2024,present,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('date')
      expect(result.errors[0].message).toContain('YYYY-MM-DD format')
    })
  })

  describe('Academic session validation', () => {
    it('should accept valid YYYY/YYYY format', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,present,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
    })

    it('should reject invalid academic session format', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,present,2024-2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('academicSession')
      expect(result.errors[0].message).toContain('YYYY/YYYY format')
    })
  })

  describe('Required field validation', () => {
    it('should reject row missing studentId', () => {
      const csv = buildCsvContent([',JSS 1,2024-05-04,present,2024/2025,1,'])
      const result = parseCsvContent(csv)
      const studentIdError = result.errors.find(e => e.field === 'studentId')
      expect(studentIdError).toBeDefined()
      expect(studentIdError?.message).toContain('studentId is required')
    })

    it('should reject row missing class', () => {
      const csv = buildCsvContent(['STU001,,2024-05-04,present,2024/2025,1,'])
      const result = parseCsvContent(csv)
      const classError = result.errors.find(e => e.field === 'class')
      expect(classError).toBeDefined()
    })

    it('should reject row missing date', () => {
      const csv = buildCsvContent(['STU001,JSS 1,,present,2024/2025,1,'])
      const result = parseCsvContent(csv)
      const dateError = result.errors.find(e => e.field === 'date')
      expect(dateError).toBeDefined()
    })

    it('should reject row missing term', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,present,2024/2025,,'])
      const result = parseCsvContent(csv)
      const termError = result.errors.find(e => e.field === 'term')
      expect(termError).toBeDefined()
    })
  })

  describe('Error format', () => {
    it('should return errors with row, field, and message properties', () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,invalid_status,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toHaveProperty('row')
      expect(result.errors[0]).toHaveProperty('field')
      expect(result.errors[0]).toHaveProperty('message')
      expect(typeof result.errors[0].row).toBe('number')
      expect(typeof result.errors[0].field).toBe('string')
      expect(typeof result.errors[0].message).toBe('string')
    })

    it('should report correct row numbers (1-indexed, header is row 1)', () => {
      const csv = buildCsvContent([VALID_ROW, 'STU002,JSS 1,2024-05-04,bad_status,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].row).toBe(3) // header=1, first data=2, second data=3
    })

    it('should collect multiple errors from the same row', () => {
      // Missing studentId AND invalid status
      const csv = buildCsvContent([',JSS 1,2024-05-04,bad_status,2024/2025,1,'])
      const result = parseCsvContent(csv)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Mixed valid and invalid rows', () => {
    it('should separate valid and invalid rows', () => {
      const csv = buildCsvContent([
        VALID_ROW,
        'STU002,JSS 1,2024-05-04,invalid,2024/2025,1,',
        VALID_ROW_2,
      ])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(2)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.totalRows).toBe(3)
    })
  })
})

// ============================================================================
// CSV Template Tests (4.1.1)
// ============================================================================

describe('CSV Template - generateCsvTemplate()', () => {
  it('should return a string', () => {
    const template = generateCsvTemplate()
    expect(typeof template).toBe('string')
  })

  it('should include all required column headers', () => {
    const template = generateCsvTemplate()
    const headerLine = template.split('\n')[0]
    expect(headerLine).toContain('studentId')
    expect(headerLine).toContain('class')
    expect(headerLine).toContain('date')
    expect(headerLine).toContain('status')
    expect(headerLine).toContain('academicSession')
    expect(headerLine).toContain('term')
  })

  it('should include a sample data row', () => {
    const template = generateCsvTemplate()
    const lines = template.split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })

  it('should produce a parseable CSV', () => {
    const template = generateCsvTemplate()
    const result = parseCsvContent(template)
    // Template sample row uses today's date so it should be valid
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
  })
})

// ============================================================================
// Batch Upload Endpoint Integration Tests (4.1.3 - 4.1.5)
// ============================================================================

// Mock the attendance library at module level so it's hoisted properly
vi.mock('../_lib/attendance.js', () => ({
  upsertAttendanceBatch: vi.fn(),
}))

describe('Batch Upload Endpoint - handler()', () => {
  let handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
  let mockUpsert: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Import the mocked module and reset the mock
    const attendanceMod = await import('../_lib/attendance.js')
    mockUpsert = vi.mocked(attendanceMod.upsertAttendanceBatch)
    mockUpsert.mockReset()
    mockUpsert.mockResolvedValue({ inserted: 2, updated: 0, errors: [] })

    // Import the handler fresh each time
    const mod = await import('./batch-upload.js')
    handler = mod.default
  })

  describe('Authentication & Authorization', () => {
    it('should reject POST without tenant context', async () => {
      const req = createMockRequest({ headers: {}, body: { csvContent: buildCsvContent([VALID_ROW]) } })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
      const json = res.json.mock.calls[0][0]
      expect(json.success).toBe(false)
      expect(json.error).toContain('Tenant context required')
    })

    it('should reject POST without user context', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': 'tenant-123' },
        body: { csvContent: buildCsvContent([VALID_ROW]) },
      })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
      const json = res.json.mock.calls[0][0]
      expect(json.error).toContain('User context required')
    })

    it('should accept tenant ID from query parameter', async () => {
      const req = createMockRequest({
        headers: { 'x-user-id': 'user-456' },
        query: { tenantId: 'tenant-123' },
        body: { csvContent: buildCsvContent([VALID_ROW]) },
      })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).not.toHaveBeenCalledWith(401)
    })
  })

  describe('GET - CSV template download', () => {
    it('should return CSV template on GET', async () => {
      const req = createMockRequest({ method: 'GET', body: null })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv')
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="attendance-template.csv"'
      )
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('POST - CSV upload', () => {
    it('should reject empty body', async () => {
      const req = createMockRequest({ body: null })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should reject empty CSV content', async () => {
      const req = createMockRequest({ body: { csvContent: '' } })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      const json = res.json.mock.calls[0][0]
      expect(json.error).toContain('empty')
    })

    it('should accept CSV as raw string body', async () => {
      const req = createMockRequest({ body: buildCsvContent([VALID_ROW]) })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should accept CSV in JSON body as csvContent field', async () => {
      const req = createMockRequest({ body: { csvContent: buildCsvContent([VALID_ROW]) } })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('should return 400 when all rows are invalid', async () => {
      const csv = buildCsvContent(['STU001,JSS 1,2024-05-04,bad_status,2024/2025,1,'])
      const req = createMockRequest({ body: { csvContent: csv } })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      const json = res.json.mock.calls[0][0]
      expect(json.success).toBe(false)
      expect(json.error).toContain('No valid records')
    })

    it('should return summary with inserted count on success', async () => {
      const csv = buildCsvContent([VALID_ROW, VALID_ROW_2])
      const req = createMockRequest({ body: { csvContent: csv } })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const json = res.json.mock.calls[0][0]
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('inserted')
      expect(json.data).toHaveProperty('skipped')
      expect(json.data).toHaveProperty('errors')
      expect(json.data).toHaveProperty('totalRecords')
      expect(json.data).toHaveProperty('validRecords')
      expect(json.data).toHaveProperty('invalidRecords')
    })

    it('should include error details for invalid rows', async () => {
      const csv = buildCsvContent([
        VALID_ROW,
        'STU002,JSS 1,2024-05-04,bad_status,2024/2025,1,',
      ])
      const req = createMockRequest({ body: { csvContent: csv } })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const json = res.json.mock.calls[0][0]
      expect(json.data.errors.length).toBeGreaterThan(0)
      expect(json.data.invalidRecords).toBe(1)
    })

    it('should set source to batch_upload for all records', async () => {
      const csv = buildCsvContent([VALID_ROW])
      const req = createMockRequest({ body: { csvContent: csv } })
      const res = createMockResponse()
      await handler(req, res)

      expect(mockUpsert).toHaveBeenCalled()
      const calledPayloads = mockUpsert.mock.calls[0][1]
      expect(calledPayloads.every((p: any) => p.source === 'batch_upload')).toBe(true)
    })
  })

  describe('Preview mode (?preview=true)', () => {
    it('should return preview summary without inserting when preview=true', async () => {
      const csv = buildCsvContent([VALID_ROW, VALID_ROW_2])
      const req = createMockRequest({
        query: { preview: 'true' },
        body: { csvContent: csv },
      })
      const res = createMockResponse()
      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      const json = res.json.mock.calls[0][0]
      expect(json.success).toBe(true)
      expect(json.data.preview).toBe(true)
      expect(json.data.inserted).toBe(0)
      // upsertAttendanceBatch should NOT be called in preview mode
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('should include validation errors in preview response', async () => {
      const csv = buildCsvContent([
        VALID_ROW,
        'STU002,JSS 1,2024-05-04,bad_status,2024/2025,1,',
      ])
      const req = createMockRequest({
        query: { preview: 'true' },
        body: { csvContent: csv },
      })
      const res = createMockResponse()
      await handler(req, res)

      const json = res.json.mock.calls[0][0]
      expect(json.data.validRecords).toBe(1)
      expect(json.data.invalidRecords).toBe(1)
      expect(json.data.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Method handling', () => {
    it('should return 405 for unsupported methods', async () => {
      const req = createMockRequest({ method: 'DELETE' })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(405)
      const json = res.json.mock.calls[0][0]
      expect(json.error).toContain('Method not allowed')
    })

    it('should set Allow header for 405 responses', async () => {
      const req = createMockRequest({ method: 'PUT' })
      const res = createMockResponse()
      await handler(req, res)
      expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET,POST')
    })
  })

  describe('Error handling', () => {
    it('should return 500 when upsert throws an error', async () => {
      mockUpsert.mockRejectedValueOnce(new Error('DB connection failed'))

      const csv = buildCsvContent([VALID_ROW])
      const req = createMockRequest({ body: { csvContent: csv } })
      const res = createMockResponse()
      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      const json = res.json.mock.calls[0][0]
      expect(json.success).toBe(false)
      expect(json.error).toContain('Failed to process batch upload')
    })
  })
})

// ============================================================================
// Requirement 6 Acceptance Criteria Tests
// ============================================================================

describe('Requirement 6: Manual Batch Upload - Acceptance Criteria', () => {
  describe('6.1 Accept CSV with required columns', () => {
    it('should accept CSV with all required columns: studentId, class, date, status, academicSession, term', () => {
      const csv = buildCsvContent([VALID_ROW])
      const result = parseCsvContent(csv)
      expect(result.valid).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('6.2 Validate file structure and required columns', () => {
    it('should reject CSV missing required columns', () => {
      const csv = 'studentId,class,date\nSTU001,JSS 1,2024-05-04'
      const result = parseCsvContent(csv)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].field).toBe('header')
    })
  })

  describe('6.3 Reject records with invalid status values', () => {
    it('should reject status values other than present, absent, or late', () => {
      const invalidStatuses = ['maybe', 'yes', 'no', 'excused', '1', 'true']
      for (const status of invalidStatuses) {
        const csv = buildCsvContent([`STU001,JSS 1,2024-05-04,${status},2024/2025,1,`])
        const result = parseCsvContent(csv)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors.some(e => e.field === 'status')).toBe(true)
      }
    })
  })

  describe('6.4 Reject records with future dates', () => {
    it('should reject any date after today', () => {
      const futureDates = [1, 7, 30, 365].map(days => {
        const d = new Date()
        d.setDate(d.getDate() + days)
        return d.toISOString().split('T')[0]
      })
      for (const date of futureDates) {
        const csv = buildCsvContent([`STU001,JSS 1,${date},present,2024/2025,1,`])
        const result = parseCsvContent(csv)
        expect(result.errors.some(e => e.field === 'date' && e.message.includes('future'))).toBe(true)
      }
    })
  })

  describe('6.5 Display summary of valid and invalid records', () => {
    it('should return totalRows, validRecords, and invalidRecords counts', () => {
      const csv = buildCsvContent([
        VALID_ROW,
        VALID_ROW_2,
        'STU003,JSS 1,2024-05-04,bad,2024/2025,1,',
      ])
      const result = parseCsvContent(csv)
      expect(result.totalRows).toBe(3)
      expect(result.valid).toHaveLength(2)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('6.6 Source set to batch_upload', () => {
    it('should set source to batch_upload for all records', async () => {
      const attendanceMod = await import('../_lib/attendance.js')
      const mockUpsertFn = vi.mocked(attendanceMod.upsertAttendanceBatch)
      mockUpsertFn.mockReset()
      mockUpsertFn.mockResolvedValue({ inserted: 2, updated: 0, errors: [] })

      const mod = await import('./batch-upload.js')
      const handlerFn = mod.default

      const csv = buildCsvContent([VALID_ROW, VALID_ROW_2])
      const req = createMockRequest({ body: { csvContent: csv } })
      const res = createMockResponse()
      await handlerFn(req, res)

      expect(mockUpsertFn).toHaveBeenCalled()
      const calledPayloads = mockUpsertFn.mock.calls[0][1]
      expect(calledPayloads.every((p: any) => p.source === 'batch_upload')).toBe(true)
    })
  })
})
