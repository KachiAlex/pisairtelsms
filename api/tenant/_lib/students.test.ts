/**
 * Students Library - Unit Tests
 * Tests for CRUD operations, admission number retry on collision,
 * tenant isolation, dependent-data blocking on delete, and audit logging.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchStudents,
  fetchStudentCount,
  getStudent,
  createStudent,
  createStudents,
  updateStudent,
  deleteStudent,
} from './students.js'

// Mock the database module
const mockQuery = vi.fn()
const mockQueryOne = vi.fn()
const mockQueryAll = vi.fn()
vi.mock('../cbt/_lib/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  queryAll: (...args: any[]) => mockQueryAll(...args),
  transaction: vi.fn(),
  initializeDatabase: vi.fn(),
  getPool: vi.fn(),
}))

// Mock tenant-settings fetch (used by generateAdmissionNo)
vi.mock('./tenant-settings.js', () => ({
  fetchTenantSettings: vi.fn().mockResolvedValue({
    admissionNoFormat: '{PREFIX}/{YEAR}/{SEQ}',
    admissionNoDigits: 4,
    schoolName: 'Test School',
  }),
}))

// Mock parent provisioning (called inside createStudent)
vi.mock('./parents.js', () => ({
  createOrLinkParent: vi.fn().mockResolvedValue(undefined),
}))

describe('Students Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStudents', () => {
    it('should return students scoped to the tenant', async () => {
      mockQueryAll.mockResolvedValue([
        { id: 's1', admission_no: 'SCH/2026/0001', name: 'John', class: 'JSS1', arm: 'A', gender: 'Male', status: 'Active', guardian: 'Parent', phone: '123' },
      ])

      const result = await fetchStudents('t1')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John')
      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1 AND deleted_at IS NULL'),
        ['t1']
      )
    })
  })

  describe('fetchStudentCount', () => {
    it('should return count of active students for the tenant', async () => {
      mockQueryOne.mockResolvedValue({ count: '5' })
      const result = await fetchStudentCount('t1')
      expect(result).toBe(5)
    })

    it('should return 0 on error', async () => {
      mockQueryOne.mockRejectedValue(new Error('DB error'))
      const result = await fetchStudentCount('t1')
      expect(result).toBe(0)
    })
  })

  describe('getStudent', () => {
    it('should return null when student is not found', async () => {
      mockQueryOne.mockResolvedValue(null)
      const result = await getStudent('nonexistent', 't1')
      expect(result).toBeNull()
    })

    it('should scope by both tenant and student id', async () => {
      mockQueryOne.mockResolvedValue(null)
      await getStudent('s1', 't1')
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL'),
        ['s1', 't1']
      )
    })
  })

  describe('createStudent', () => {
    it('should create a student with an explicit admission number', async () => {
      mockQueryOne.mockResolvedValue({
        id: 's1', admission_no: 'CUSTOM/001', name: 'John', class: 'JSS1', arm: 'A',
        gender: 'Male', status: 'Active', guardian: 'Parent', phone: '123', guardian_email: null,
      })

      const result = await createStudent('t1', {
        admissionNo: 'CUSTOM/001',
        name: 'John',
        class: 'JSS1',
        arm: 'A',
        gender: 'Male',
        status: 'Active',
        guardian: 'Parent',
        phone: '123',
      })

      expect(result.admissionNo).toBe('CUSTOM/001')
      // Should only call INSERT once (no retry needed for explicit admission number)
      expect(mockQueryOne).toHaveBeenCalledTimes(1)
    })

    it('should retry when admission number collides (unique violation)', async () => {
      // generateAdmissionNo calls queryOne for the count.
      // insertStudent calls queryOne for the INSERT.
      // On collision, the INSERT rejects with code 23505, then we retry:
      //   generateAdmissionNo (count) -> insertStudent (INSERT) -> success
      const uniqueError: any = new Error('duplicate key')
      uniqueError.code = '23505'

      mockQueryOne
        .mockResolvedValueOnce({ count: '0' })   // generateAdmissionNo count (attempt 0)
        .mockRejectedValueOnce(uniqueError)      // insertStudent INSERT (attempt 0) - collision
        .mockResolvedValueOnce({ count: '0' })   // generateAdmissionNo count (attempt 1)
        .mockResolvedValueOnce({                 // insertStudent INSERT (attempt 1) - success
          id: 's1', admission_no: 'SCH/2026/0002', name: 'John', class: 'JSS1', arm: 'A',
          gender: 'Male', status: 'Active', guardian: 'Parent', phone: '123', guardian_email: null,
        })

      const result = await createStudent('t1', {
        name: 'John',
        class: 'JSS1',
        arm: 'A',
        gender: 'Male',
        status: 'Active',
        guardian: 'Parent',
        phone: '123',
      })

      expect(result.admissionNo).toBe('SCH/2026/0002')
    })

    it('should throw after max retries when admission number keeps colliding', async () => {
      const uniqueError: any = new Error('duplicate key')
      uniqueError.code = '23505'

      // Every INSERT fails with unique violation; count queries succeed.
      // Pattern per attempt: generateAdmissionNo (count) -> insertStudent (INSERT reject)
      mockQueryOne.mockReset()
      for (let i = 0; i < 5; i++) {
        mockQueryOne.mockResolvedValueOnce({ count: '0' }) // count
        mockQueryOne.mockRejectedValueOnce(uniqueError)     // INSERT - collision
      }

      await expect(
        createStudent('t1', {
          name: 'John', class: 'JSS1', arm: 'A', gender: 'Male',
          status: 'Active', guardian: 'Parent', phone: '123',
        })
      ).rejects.toThrow('Unable to generate a unique admission number')
    })
  })

  describe('updateStudent', () => {
    it('should update student fields using !== undefined checks', async () => {
      mockQueryOne.mockResolvedValue({
        id: 's1', admission_no: 'SCH/001', name: 'John Updated', class: 'JSS2', arm: 'A',
        gender: 'Male', status: 'Active', guardian: 'Parent', phone: '123', guardian_email: null,
      })

      const result = await updateStudent('s1', 't1', { name: 'John Updated', class: 'JSS2' })

      expect(result!.name).toBe('John Updated')
      // Verify the UPDATE query was called with tenant scoping
      const updateCall = mockQueryOne.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('UPDATE students')
      )
      expect(updateCall).toBeDefined()
      expect(updateCall![0]).toContain('WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL')
    })

    it('should allow clearing fields to empty string', async () => {
      mockQueryOne.mockResolvedValue({
        id: 's1', admission_no: 'SCH/001', name: '', class: 'JSS1', arm: '', gender: 'Male',
        status: 'Active', guardian: 'Parent', phone: '', guardian_email: null,
      })

      await updateStudent('s1', 't1', { name: '', arm: '', phone: '' })

      // Verify the UPDATE included the empty string values (not skipped)
      const updateCall = mockQueryOne.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('UPDATE students')
      )
      expect(updateCall).toBeDefined()
      // The values array should contain empty strings
      expect(updateCall![1]).toContain('')
    })

    it('should return null when student is not found', async () => {
      mockQueryOne.mockResolvedValue(null)
      const result = await updateStudent('nonexistent', 't1', { name: 'New' })
      expect(result).toBeNull()
    })
  })

  describe('deleteStudent', () => {
    it('should block deletion when student scores exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // score check - has scores

      await expect(deleteStudent('s1', 't1')).rejects.toThrow(
        'Cannot delete student: scores are still recorded'
      )
    })

    it('should block deletion when attendance records exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // attendance check - has records

      await expect(deleteStudent('s1', 't1')).rejects.toThrow(
        'Cannot delete student: attendance records exist'
      )
    })

    it('should block deletion when promotion records exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [] }) // no attendance
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // promotion check - has records

      await expect(deleteStudent('s1', 't1')).rejects.toThrow(
        'Cannot delete student: promotion records exist'
      )
    })

    it('should soft-delete when no dependent data exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [] }) // no attendance
        .mockResolvedValueOnce({ rows: [] }) // no promotions
        .mockResolvedValueOnce({ rowCount: 1 }) // soft delete

      const result = await deleteStudent('s1', 't1')
      expect(result).toBe(true)

      // Verify the soft-delete query sets deleted_at
      const deleteCall = mockQuery.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('SET deleted_at')
      )
      expect(deleteCall).toBeDefined()
    })

    it('should return false when student is not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [] }) // no attendance
        .mockResolvedValueOnce({ rows: [] }) // no promotions
        .mockResolvedValueOnce({ rowCount: 0 }) // soft delete - no row affected

      const result = await deleteStudent('nonexistent', 't1')
      expect(result).toBe(false)
    })
  })
})
