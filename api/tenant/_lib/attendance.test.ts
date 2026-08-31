/**
 * Unit Tests for Attendance Data Access Layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fetchAttendance,
  getAttendanceRecord,
  upsertAttendanceBatch,
  createAuditTrailEntry,
  deleteAttendanceRecord,
  getAuditTrail,
  attendanceExists,
  getAttendanceStats,
  AttendancePayload,
  AttendanceRecord,
} from './attendance'
import * as db from '../cbt/_lib/db'

// Mock the database module
vi.mock('../cbt/_lib/db', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

describe('Attendance Data Access Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // fetchAttendance Tests
  // ============================================================================

  describe('fetchAttendance', () => {
    it('should fetch all attendance records for a tenant', async () => {
      const mockRecords = [
        {
          id: 'att-1',
          tenant_id: 'tenant-1',
          student_id: 'STU001',
          class: 'JSS 1',
          date: '2024-05-04',
          status: 'present',
          absence_reason_id: null,
          source: 'teacher_entry',
          device_id: null,
          user_id: 'user-1',
          academic_session: '2024/2025',
          term: '1',
          created_at: new Date('2024-05-04T10:00:00Z'),
          updated_at: new Date('2024-05-04T10:00:00Z'),
          created_by: 'user-1',
          updated_by: 'user-1',
        },
      ]

      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '1' })
      vi.mocked(db.queryAll).mockResolvedValueOnce(mockRecords)

      const result = await fetchAttendance({ tenantId: 'tenant-1' })

      expect(result.total).toBe(1)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].studentId).toBe('STU001')
    })

    it('should filter by student ID', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '1' })
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await fetchAttendance({
        tenantId: 'tenant-1',
        studentId: 'STU001',
      })

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('student_id = $2'),
        expect.arrayContaining(['tenant-1', 'STU001'])
      )
    })

    it('should filter by class', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '1' })
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await fetchAttendance({
        tenantId: 'tenant-1',
        class: 'JSS 1',
      })

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('class = $2'),
        expect.arrayContaining(['tenant-1', 'JSS 1'])
      )
    })

    it('should filter by date range', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '5' })
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await fetchAttendance({
        tenantId: 'tenant-1',
        startDate: '2024-05-01',
        endDate: '2024-05-05',
      })

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('date >= $2 AND date <= $3'),
        expect.arrayContaining(['tenant-1', '2024-05-01', '2024-05-05'])
      )
    })

    it('should filter by status', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '1' })
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await fetchAttendance({
        tenantId: 'tenant-1',
        status: 'absent',
      })

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        expect.arrayContaining(['tenant-1', 'absent'])
      )
    })

    it('should support pagination', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '100' })
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await fetchAttendance({
        tenantId: 'tenant-1',
        limit: 50,
        offset: 50,
      })

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining(['tenant-1', 50, 50])
      )
    })

    it('should handle multiple filters', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '1' })
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await fetchAttendance({
        tenantId: 'tenant-1',
        studentId: 'STU001',
        class: 'JSS 1',
        status: 'present',
        term: '1',
      })

      const callArgs = vi.mocked(db.queryAll).mock.calls[0]
      expect(callArgs[0]).toContain('student_id')
      expect(callArgs[0]).toContain('class')
      expect(callArgs[0]).toContain('status')
      expect(callArgs[0]).toContain('term')
    })
  })

  // ============================================================================
  // getAttendanceRecord Tests
  // ============================================================================

  describe('getAttendanceRecord', () => {
    it('should fetch a single attendance record', async () => {
      const mockRecord = {
        id: 'att-1',
        tenant_id: 'tenant-1',
        student_id: 'STU001',
        class: 'JSS 1',
        date: '2024-05-04',
        status: 'present',
        absence_reason_id: null,
        source: 'teacher_entry',
        device_id: null,
        user_id: 'user-1',
        academic_session: '2024/2025',
        term: '1',
        created_at: new Date('2024-05-04T10:00:00Z'),
        updated_at: new Date('2024-05-04T10:00:00Z'),
        created_by: 'user-1',
        updated_by: 'user-1',
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockRecord)

      const result = await getAttendanceRecord('tenant-1', 'att-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('att-1')
      expect(result?.studentId).toBe('STU001')
    })

    it('should return null if record not found', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const result = await getAttendanceRecord('tenant-1', 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // upsertAttendanceBatch Tests
  // ============================================================================

  describe('upsertAttendanceBatch', () => {
    it('should validate required fields', async () => {
      const invalidRecords: AttendancePayload[] = [
        {
          studentId: '',
          class: 'JSS 1',
          date: '2024-05-04',
          status: 'present',
          source: 'teacher_entry',
          userId: 'user-1',
          academicSession: '2024/2025',
          term: '1',
        },
      ]

      const result = await upsertAttendanceBatch('tenant-1', invalidRecords)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('studentId is required')
    })

    it('should validate status values', async () => {
      const invalidRecords: AttendancePayload[] = [
        {
          studentId: 'STU001',
          class: 'JSS 1',
          date: '2024-05-04',
          status: 'maybe' as any,
          source: 'teacher_entry',
          userId: 'user-1',
          academicSession: '2024/2025',
          term: '1',
        },
      ]

      const result = await upsertAttendanceBatch('tenant-1', invalidRecords)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('status must be one of')
    })

    it('should reject future dates', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const futureDate = tomorrow.toISOString().split('T')[0]

      const invalidRecords: AttendancePayload[] = [
        {
          studentId: 'STU001',
          class: 'JSS 1',
          date: futureDate,
          status: 'present',
          source: 'teacher_entry',
          userId: 'user-1',
          academicSession: '2024/2025',
          term: '1',
        },
      ]

      const result = await upsertAttendanceBatch('tenant-1', invalidRecords)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('date cannot be in the future')
    })

    it('should validate date format', async () => {
      const invalidRecords: AttendancePayload[] = [
        {
          studentId: 'STU001',
          class: 'JSS 1',
          date: '05-04-2024',
          status: 'present',
          source: 'teacher_entry',
          userId: 'user-1',
          academicSession: '2024/2025',
          term: '1',
        },
      ]

      const result = await upsertAttendanceBatch('tenant-1', invalidRecords)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('date must be in YYYY-MM-DD format')
    })

    it('should validate academic session format', async () => {
      const invalidRecords: AttendancePayload[] = [
        {
          studentId: 'STU001',
          class: 'JSS 1',
          date: '2024-05-04',
          status: 'present',
          source: 'teacher_entry',
          userId: 'user-1',
          academicSession: '2024-2025',
          term: '1',
        },
      ]

      const result = await upsertAttendanceBatch('tenant-1', invalidRecords)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('academicSession must be in YYYY/YYYY format')
    })

    it('should validate source values', async () => {
      const invalidRecords: AttendancePayload[] = [
        {
          studentId: 'STU001',
          class: 'JSS 1',
          date: '2024-05-04',
          status: 'present',
          source: 'invalid_source' as any,
          userId: 'user-1',
          academicSession: '2024/2025',
          term: '1',
        },
      ]

      const result = await upsertAttendanceBatch('tenant-1', invalidRecords)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('source must be one of')
    })

    it('should handle empty records array', async () => {
      const result = await upsertAttendanceBatch('tenant-1', [])

      expect(result.inserted).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  // ============================================================================
  // createAuditTrailEntry Tests
  // ============================================================================

  describe('createAuditTrailEntry', () => {
    it('should create an audit trail entry for create action', async () => {
      const mockAuditEntry = {
        id: 'audit-1',
        attendance_record_id: 'att-1',
        action: 'create',
        old_value: null,
        new_value: JSON.stringify({ status: 'present' }),
        changed_by: 'user-1',
        changed_at: new Date('2024-05-04T10:00:00Z'),
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockAuditEntry)

      const result = await createAuditTrailEntry(
        'att-1',
        'create',
        null,
        { status: 'present' },
        'user-1'
      )

      expect(result.id).toBe('audit-1')
      expect(result.action).toBe('create')
      expect(result.newValue).toEqual({ status: 'present' })
    })

    it('should create an audit trail entry for update action', async () => {
      const mockAuditEntry = {
        id: 'audit-2',
        attendance_record_id: 'att-1',
        action: 'update',
        old_value: JSON.stringify({ status: 'absent' }),
        new_value: JSON.stringify({ status: 'present' }),
        changed_by: 'user-1',
        changed_at: new Date('2024-05-04T10:00:00Z'),
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockAuditEntry)

      const result = await createAuditTrailEntry(
        'att-1',
        'update',
        { status: 'absent' },
        { status: 'present' },
        'user-1'
      )

      expect(result.action).toBe('update')
      expect(result.oldValue).toEqual({ status: 'absent' })
      expect(result.newValue).toEqual({ status: 'present' })
    })

    it('should create an audit trail entry for delete action', async () => {
      const mockAuditEntry = {
        id: 'audit-3',
        attendance_record_id: 'att-1',
        action: 'delete',
        old_value: JSON.stringify({ status: 'present' }),
        new_value: null,
        changed_by: 'user-1',
        changed_at: new Date('2024-05-04T10:00:00Z'),
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockAuditEntry)

      const result = await createAuditTrailEntry(
        'att-1',
        'delete',
        { status: 'present' },
        null,
        'user-1'
      )

      expect(result.action).toBe('delete')
      expect(result.oldValue).toEqual({ status: 'present' })
      expect(result.newValue).toBeUndefined()
    })
  })

  // ============================================================================
  // attendanceExists Tests
  // ============================================================================

  describe('attendanceExists', () => {
    it('should return attendance record if exists', async () => {
      const mockRecord = {
        id: 'att-1',
        tenant_id: 'tenant-1',
        student_id: 'STU001',
        class: 'JSS 1',
        date: '2024-05-04',
        status: 'present',
        absence_reason_id: null,
        source: 'teacher_entry',
        device_id: null,
        user_id: 'user-1',
        academic_session: '2024/2025',
        term: '1',
        created_at: new Date('2024-05-04T10:00:00Z'),
        updated_at: new Date('2024-05-04T10:00:00Z'),
        created_by: 'user-1',
        updated_by: 'user-1',
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockRecord)

      const result = await attendanceExists('tenant-1', 'STU001', '2024-05-04')

      expect(result).not.toBeNull()
      expect(result?.studentId).toBe('STU001')
    })

    it('should return null if attendance does not exist', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce(null)

      const result = await attendanceExists('tenant-1', 'STU001', '2024-05-04')

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // getAttendanceStats Tests
  // ============================================================================

  describe('getAttendanceStats', () => {
    it('should calculate attendance statistics', async () => {
      const mockStats = {
        total: '100',
        present: '85',
        absent: '10',
        late: '5',
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockStats)

      const result = await getAttendanceStats('tenant-1', '2024-05-01', '2024-05-31')

      expect(result.total).toBe(100)
      expect(result.present).toBe(85)
      expect(result.absent).toBe(10)
      expect(result.late).toBe(5)
      expect(result.presentRate).toBe(85)
      expect(result.absentRate).toBe(10)
      expect(result.lateRate).toBe(5)
    })

    it('should handle zero records', async () => {
      const mockStats = {
        total: '0',
        present: '0',
        absent: '0',
        late: '0',
      }

      vi.mocked(db.queryOne).mockResolvedValueOnce(mockStats)

      const result = await getAttendanceStats('tenant-1', '2024-05-01', '2024-05-31')

      expect(result.total).toBe(0)
      expect(result.presentRate).toBe(0)
      expect(result.absentRate).toBe(0)
      expect(result.lateRate).toBe(0)
    })

    it('should filter by class', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '50',
        present: '45',
        absent: '3',
        late: '2',
      })

      await getAttendanceStats('tenant-1', '2024-05-01', '2024-05-31', 'JSS 1')

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('class = $4'),
        expect.arrayContaining(['tenant-1', '2024-05-01', '2024-05-31', 'JSS 1'])
      )
    })
  })

  // ============================================================================
  // getAuditTrail Tests
  // ============================================================================

  describe('getAuditTrail', () => {
    it('should fetch audit trail entries', async () => {
      const mockEntries = [
        {
          id: 'audit-1',
          attendance_record_id: 'att-1',
          action: 'create',
          old_value: null,
          new_value: JSON.stringify({ status: 'present' }),
          changed_by: 'user-1',
          changed_at: new Date('2024-05-04T10:00:00Z'),
        },
      ]

      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '1' })
      vi.mocked(db.queryAll).mockResolvedValueOnce(mockEntries)

      const result = await getAuditTrail('att-1')

      expect(result.total).toBe(1)
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].action).toBe('create')
    })

    it('should support pagination', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({ count: '10' })
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await getAuditTrail('att-1', 5, 5)

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining(['att-1', 5, 5])
      )
    })
  })
})
