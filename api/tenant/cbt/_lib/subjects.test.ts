/**
 * Subjects Library - Unit Tests
 * Tests for CRUD operations, duplicate code prevention, dependent-data blocking,
 * null-clearing on update, and cascade updates on rename.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getSubjects,
  getSubjectNames,
  getSubjectById,
  checkSubjectCodeExists,
  createSubject,
  updateSubject,
  deleteSubject,
} from './subjects.js'

// Mock the database module
const mockQuery = vi.fn()
vi.mock('./db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  initializeDatabase: vi.fn(),
  getPool: vi.fn(),
}))

describe('Subjects Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSubjects', () => {
    it('should return subjects scoped to the tenant', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: ['JSS1'] },
        ],
      })

      const result = await getSubjects('t1')

      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('MATH')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        ['t1']
      )
    })

    it('should filter out soft-deleted subjects', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      await getSubjects('t1')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        ['t1']
      )
    })
  })

  describe('getSubjectNames', () => {
    it('should return unique subject names for dropdowns', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ name: 'Mathematics' }, { name: 'English' }],
      })

      const result = await getSubjectNames('t1')

      expect(result).toEqual(['Mathematics', 'English'])
    })
  })

  describe('checkSubjectCodeExists', () => {
    it('should return true when code exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'existing' }] })
      const result = await checkSubjectCodeExists('t1', 'MATH')
      expect(result).toBe(true)
    })

    it('should return false when code does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await checkSubjectCodeExists('t1', 'MATH')
      expect(result).toBe(false)
    })

    it('should exclude a specific id when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      await checkSubjectCodeExists('t1', 'MATH', 'exclude-id')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $3'),
        ['t1', 'MATH', 'exclude-id']
      )
    })
  })

  describe('createSubject', () => {
    it('should create a subject when code is unique', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no duplicate code
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: ['JSS1'] }],
        })

      const result = await createSubject('t1', 'user1', {
        code: 'MATH',
        name: 'Mathematics',
        levels: ['JSS1'],
        type: 'Core',
        department: 'Sciences',
      })

      expect(result.code).toBe('MATH')
    })

    it('should throw when subject code already exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'existing' }] })

      await expect(
        createSubject('t1', 'user1', {
          code: 'MATH',
          name: 'Mathematics',
          levels: ['JSS1'],
          type: 'Core',
          department: 'Sciences',
        })
      ).rejects.toThrow('Subject code already exists')
    })
  })

  describe('updateSubject', () => {
    it('should update subject name and cascade to dependent tables', async () => {
      // updateSubject calls: getSubjectById, checkCodeExists (if code changed - no, only name),
      // then UPDATE subjects, then 3 cascade updates.
      // Note: checkCodeExists is NOT called when only name is provided.
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById (fetch current)
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Further Math', levels: JSON.stringify(['JSS1']) }],
        }) // UPDATE subjects
        .mockResolvedValue({ rows: [] }) // cascade updates (3 calls)

      const result = await updateSubject('t1', 's1', { name: 'Further Math' })

      expect(result.name).toBe('Further Math')
      // Verify cascade updates were called (3 dependent tables)
      // Calls: getSubjectById, UPDATE, cascade slots, cascade scores, cascade questions
      expect(mockQuery).toHaveBeenCalledTimes(5)
    })

    it('should allow clearing code to empty string', async () => {
      // updateSubject with code='' calls: getSubjectById, checkCodeExists (code changed),
      // then UPDATE subjects. No cascade (name not changed).
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById
        .mockResolvedValueOnce({ rows: [] }) // checkCodeExists - no duplicate for ''
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: '', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // UPDATE subjects

      const result = await updateSubject('t1', 's1', { code: '' })

      expect(result.code).toBe('')
    })

    it('should throw when updating to a duplicate code', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById
        .mockResolvedValueOnce({ rows: [{ id: 's2' }] }) // checkCodeExists - duplicate

      await expect(updateSubject('t1', 's1', { code: 'PHYS' })).rejects.toThrow(
        'Subject code already exists'
      )
    })

    it('should not cascade when name is not changed', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS2']) }],
        }) // UPDATE subjects

      await updateSubject('t1', 's1', { levels: ['JSS2'] })

      // Only 2 calls: getSubjectById + UPDATE (no cascade since name didn't change)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })
  })

  describe('deleteSubject', () => {
    it('should block deletion when scores reference the subject', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // score check - has scores

      await expect(deleteSubject('t1', 's1')).rejects.toThrow(
        'Cannot delete subject: scores are still recorded'
      )
    })

    it('should block deletion when teacher allocation slots reference the subject', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // slot check - has slots

      await expect(deleteSubject('t1', 's1')).rejects.toThrow(
        'Cannot delete subject: teacher allocation slots reference this subject'
      )
    })

    it('should block deletion when CBT questions reference the subject', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [] }) // no slots
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // question check - has questions

      await expect(deleteSubject('t1', 's1')).rejects.toThrow(
        'Cannot delete subject: CBT questions are still linked'
      )
    })

    it('should soft-delete when no dependent data exists', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 's1', tenantId: 't1', code: 'MATH', name: 'Mathematics', levels: JSON.stringify(['JSS1']) }],
        }) // getSubjectById
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [] }) // no slots
        .mockResolvedValueOnce({ rows: [] }) // no questions
        .mockResolvedValueOnce({ rowCount: 1 }) // soft delete

      await deleteSubject('t1', 's1')

      // Verify the soft-delete query sets deleted_at
      const deleteCall = mockQuery.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('SET deleted_at')
      )
      expect(deleteCall).toBeDefined()
    })

    it('should throw when subject is not found', async () => {
      // getSubjectById returns empty rows -> null, deleteSubject throws 'Subject not found'
      // But deleteSubject also runs the dependent checks which consume more mocks.
      // Need to provide enough mocks for all the checks that run before the final rowCount check.
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // getSubjectById returns null
      // After getSubjectById returns null, deleteSubject throws immediately

      await expect(deleteSubject('t1', 'nonexistent')).rejects.toThrow('Subject not found')
    })
  })
})
