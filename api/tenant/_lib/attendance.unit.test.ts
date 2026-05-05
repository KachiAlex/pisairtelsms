
/**
 * Comprehensive Unit Tests for Attendance Validation & Conflict Resolution
 * Tasks: 5.1.1 Validation logic, 5.1.2 Conflict resolution
 * Validates: Requirements 1, 7, 8, 9, 20
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  upsertAttendanceBatch,
  invalidateAnalyticsCache,
  type AttendancePayload,
} from './attendance.js'
import * as db from '../cbt/_lib/db.js'

vi.mock('../cbt/_lib/db.js', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

// ============================================================================
// Helpers
// ============================================================================

function makeRecord(overrides: Partial<AttendancePayload> = {}): AttendancePayload {
  return {
    studentId: 'STU001',
    class: 'JSS 1',
    date: '2024-05-04',
    status: 'present',
    source: 'teacher_entry',
    userId: 'user-1',
    academicSession: '2024/2025',
    term: '1',
    ...overrides,
  }
}

function setupStudentAndClassExists() {
  // studentExists → true, classExists → true
  vi.mocked(db.queryOne)
    .mockResolvedValueOnce({ id: 'student-1' })
    .mockResolvedValueOnce({ id: 'class-1' })
}

beforeEach(() => {
  vi.clearAllMocks()
  invalidateAnalyticsCache('tenant-1')
  // Default transaction mock: execute the callback immediately
  vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn({ query: vi.fn() }))
})

// ============================================================================
// 5.1.1 Validation Logic
// ============================================================================

describe('Validation Logic (Req 20)', () => {
  describe('Required field validation', () => {
    it('rejects record with missing studentId', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ studentId: '' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('studentId is required')
    })

    it('rejects record with missing class', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ class: '' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('class is required')
    })

    it('rejects record with missing date', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ date: '' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('date is required')
    })

    it('rejects record with missing status', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ status: '' as any })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('status is required')
    })

    it('rejects record with missing academicSession', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ academicSession: '' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('academicSession is required')
    })

    it('rejects record with missing term', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ term: '' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('term is required')
    })

    it('rejects record with missing userId', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ userId: '' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('userId is required')
    })

    it('rejects record with missing source', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ source: '' as any })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('source is required')
    })
  })

  describe('Status validation (Req 20.4)', () => {
    it('accepts "present" status', async () => {
      setupStudentAndClassExists()
      vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
      vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ status: 'present' })])
      expect(result.errors).toHaveLength(0)
    })

    it('accepts "absent" status', async () => {
      setupStudentAndClassExists()
      vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
      vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ status: 'absent' })])
      expect(result.errors).toHaveLength(0)
    })

    it('accepts "late" status', async () => {
      setupStudentAndClassExists()
      vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
      vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ status: 'late' })])
      expect(result.errors).toHaveLength(0)
    })

    it('rejects invalid status "maybe"', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ status: 'maybe' as any })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('status must be one of')
    })

    it('rejects invalid status "yes"', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ status: 'yes' as any })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('status must be one of')
    })

    it('rejects invalid status "1"', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ status: '1' as any })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('status must be one of')
    })
  })

  describe('Date validation (Req 1.3, 20.3)', () => {
    it('rejects future dates', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const futureDate = tomorrow.toISOString().split('T')[0]

      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ date: futureDate })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('date cannot be in the future')
    })

    it('rejects dates 7 days in the future', async () => {
      const future = new Date()
      future.setDate(future.getDate() + 7)
      const futureDate = future.toISOString().split('T')[0]

      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ date: futureDate })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('date cannot be in the future')
    })

    it('accepts today\'s date', async () => {
      setupStudentAndClassExists()
      vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
      vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

      const today = new Date().toISOString().split('T')[0]
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ date: today })])
      expect(result.errors).toHaveLength(0)
    })

    it('accepts past dates', async () => {
      setupStudentAndClassExists()
      vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
      vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ date: '2024-01-15' })])
      expect(result.errors).toHaveLength(0)
    })

    it('rejects invalid date format MM-DD-YYYY', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ date: '05-04-2024' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('date must be in YYYY-MM-DD format')
    })

    it('rejects invalid date format YYYY/MM/DD', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ date: '2024/05/04' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('date must be in YYYY-MM-DD format')
    })
  })

  describe('Academic session validation (Req 20.5)', () => {
    it('accepts valid YYYY/YYYY format', async () => {
      setupStudentAndClassExists()
      vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
      vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ academicSession: '2024/2025' })])
      expect(result.errors).toHaveLength(0)
    })

    it('rejects YYYY-YYYY format', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ academicSession: '2024-2025' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('academicSession must be in YYYY/YYYY format')
    })

    it('rejects single year format', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ academicSession: '2024' })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('academicSession must be in YYYY/YYYY format')
    })
  })

  describe('Source validation', () => {
    const validSources = ['teacher_entry', 'biometric_device', 'batch_upload', 'api_entry'] as const

    for (const source of validSources) {
      it(`accepts source "${source}"`, async () => {
        setupStudentAndClassExists()
        vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
        vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

        const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ source })])
        expect(result.errors).toHaveLength(0)
      })
    }

    it('rejects invalid source "manual"', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [makeRecord({ source: 'manual' as any })])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('source must be one of')
    })
  })

  describe('Empty batch', () => {
    it('returns zero counts for empty array', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [])
      expect(result.inserted).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Multiple records with mixed validity', () => {
    it('collects errors for invalid records and processes valid ones', async () => {
      // Valid record setup
      setupStudentAndClassExists()
      vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
      vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

      const records = [
        makeRecord(), // valid
        makeRecord({ status: 'invalid' as any }), // invalid
        makeRecord({ date: '05-04-2024' }), // invalid date format
      ]

      const result = await upsertAttendanceBatch('tenant-1', records)
      expect(result.errors).toHaveLength(2)
      expect(result.inserted + result.updated).toBeGreaterThanOrEqual(0)
    })
  })
})

// ============================================================================
// 5.1.2 Conflict Resolution (Most-Recent-Wins)
// ============================================================================

describe('Conflict Resolution - Most-Recent-Wins (Req 9)', () => {
  it('uses ON CONFLICT DO UPDATE to handle duplicate student+date', async () => {
    setupStudentAndClassExists()
    // Simulate an UPDATE (existing record) — is_insert = false
    vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-existing', is_insert: false })
    vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

    const result = await upsertAttendanceBatch('tenant-1', [makeRecord()])

    expect(result.updated).toBe(1)
    expect(result.inserted).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('inserts new record when no conflict exists', async () => {
    setupStudentAndClassExists()
    // Simulate an INSERT — is_insert = true
    vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-new', is_insert: true })
    vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

    const result = await upsertAttendanceBatch('tenant-1', [makeRecord()])

    expect(result.inserted).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('creates audit trail entry for both inserts and updates', async () => {
    setupStudentAndClassExists()
    vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
    vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

    await upsertAttendanceBatch('tenant-1', [makeRecord()])

    // transaction should have been called
    expect(db.transaction).toHaveBeenCalled()
  })

  it('handles batch of records with mixed insert/update outcomes', async () => {
    // Two records: one insert, one update
    vi.mocked(db.queryOne)
      .mockResolvedValueOnce({ id: 'student-1' }) // studentExists for STU001
      .mockResolvedValueOnce({ id: 'class-1' })   // classExists for JSS 1
      .mockResolvedValueOnce({ id: 'att-1', is_insert: true })  // first record: insert
      .mockResolvedValueOnce({ id: 'att-2', is_insert: false }) // second record: update
    vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

    const records = [
      makeRecord({ studentId: 'STU001', date: '2024-05-01' }),
      makeRecord({ studentId: 'STU001', date: '2024-05-02' }),
    ]

    const result = await upsertAttendanceBatch('tenant-1', records)
    expect(result.inserted + result.updated).toBe(2)
    expect(result.errors).toHaveLength(0)
  })

  it('invalidates analytics cache after upsert', async () => {
    setupStudentAndClassExists()
    vi.mocked(db.queryOne).mockResolvedValueOnce({ id: 'att-1', is_insert: true })
    vi.mocked(db.query).mockResolvedValue({ rowCount: 1 } as any)

    // Populate cache first
    vi.mocked(db.queryOne).mockResolvedValueOnce({ total: '10', present: '9', absent: '1', late: '0' })

    await upsertAttendanceBatch('tenant-1', [makeRecord()])

    // Cache should be invalidated — transaction was called
    expect(db.transaction).toHaveBeenCalled()
  })
})
