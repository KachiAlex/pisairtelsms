/**
 * Classes Library - Unit Tests
 * Tests for CRUD operations, duplicate prevention, dependent-data blocking,
 * null-clearing on update, and cascade updates on rename.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getClasses,
  getClassById,
  checkClassExists,
  createClass,
  updateClass,
  deleteClass,
} from './classes.js'

// Mock the database module
const mockQuery = vi.fn()
vi.mock('./db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  initializeDatabase: vi.fn(),
  getPool: vi.fn(),
}))

describe('Classes Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getClasses', () => {
    it('should return classes scoped to the tenant', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' },
        ],
      })

      const result = await getClasses('t1')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('JSS1')
      // Verify tenant_id is used in the WHERE clause
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.tenant_id = $1'),
        ['t1']
      )
    })

    it('should filter out soft-deleted classes', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      await getClasses('t1')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        ['t1']
      )
    })
  })

  describe('getClassById', () => {
    it('should return null when class is not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await getClassById('t1', 'nonexistent')
      expect(result).toBeNull()
    })

    it('should scope by both tenant and class id', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      await getClassById('t1', 'c1')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('c.tenant_id = $1 AND c.id = $2'),
        ['t1', 'c1']
      )
    })
  })

  describe('checkClassExists', () => {
    it('should return true when a duplicate exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'existing' }] })
      const result = await checkClassExists('t1', 'JSS1', 'A')
      expect(result).toBe(true)
    })

    it('should return false when no duplicate exists', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await checkClassExists('t1', 'JSS1', 'A')
      expect(result).toBe(false)
    })

    it('should exclude a specific id when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      await checkClassExists('t1', 'JSS1', 'A', 'exclude-id')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $4'),
        ['t1', 'JSS1', 'A', 'exclude-id']
      )
    })
  })

  describe('createClass', () => {
    it('should create a class when no duplicate exists', async () => {
      // First call: checkClassExists returns false
      // Second call: INSERT returns the new class
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no duplicate
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        })

      const result = await createClass('t1', 'JSS1', 'A', 'Junior')

      expect(result.name).toBe('JSS1')
      expect(result.arm).toBe('A')
    })

    it('should throw when a duplicate name+arm already exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'existing' }] })

      await expect(createClass('t1', 'JSS1', 'A', 'Junior')).rejects.toThrow(
        'A class with this name and arm already exists'
      )
    })
  })

  describe('updateClass', () => {
    it('should update class name and cascade to dependent tables', async () => {
      // First call: getClassById (fetch current)
      // Second call: checkClassExists (no duplicate)
      // Third call: UPDATE classes
      // Fourth, fifth, sixth calls: cascade updates
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById
        .mockResolvedValueOnce({ rows: [] }) // checkClassExists - no duplicate
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS2', arm: 'A', level: 'Junior' }],
        }) // UPDATE classes
        .mockResolvedValue({ rows: [] }) // cascade updates

      const result = await updateClass('t1', 'c1', { name: 'JSS2' })

      expect(result.name).toBe('JSS2')
      // Verify cascade updates were called (3 dependent tables)
      // mockQuery calls: getClassById, checkClassExists, UPDATE classes, cascade slots, cascade students, cascade scores
      expect(mockQuery).toHaveBeenCalledTimes(6)
    })

    it('should allow clearing level to empty string', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById (no name/arm change, so no checkClassExists)
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: '' }],
        }) // UPDATE classes

      const result = await updateClass('t1', 'c1', { level: '' })

      expect(result.level).toBe('')
      // Verify the UPDATE included level = $1
      const updateCall = mockQuery.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('UPDATE classes')
      )
      expect(updateCall).toBeDefined()
      expect(updateCall![0]).toContain('level = $')
    })

    it('should throw when updating to a duplicate name+arm', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById
        .mockResolvedValueOnce({ rows: [{ id: 'c2' }] }) // checkClassExists - duplicate found

      await expect(updateClass('t1', 'c1', { name: 'JSS2', arm: 'B' })).rejects.toThrow(
        'A class with this name and arm already exists'
      )
    })

    it('should not cascade when name is not changed', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Senior' }],
        }) // UPDATE classes

      await updateClass('t1', 'c1', { level: 'Senior' })

      // Only 2 calls: getClassById + UPDATE (no cascade since name didn't change)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })
  })

  describe('deleteClass', () => {
    it('should block deletion when students are assigned to the class', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // student check - has students

      await expect(deleteClass('t1', 'c1')).rejects.toThrow(
        'Cannot delete class: students are still assigned'
      )
    })

    it('should block deletion when scores reference the class', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById
        .mockResolvedValueOnce({ rows: [] }) // no students
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // score check - has scores

      await expect(deleteClass('t1', 'c1')).rejects.toThrow(
        'Cannot delete class: scores are still recorded'
      )
    })

    it('should block deletion when teacher allocation slots reference the class', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById
        .mockResolvedValueOnce({ rows: [] }) // no students
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // slot check - has slots

      await expect(deleteClass('t1', 'c1')).rejects.toThrow(
        'Cannot delete class: teacher allocation slots reference this class'
      )
    })

    it('should soft-delete when no dependent data exists', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'c1', tenantId: 't1', name: 'JSS1', arm: 'A', level: 'Junior' }],
        }) // getClassById
        .mockResolvedValueOnce({ rows: [] }) // no students
        .mockResolvedValueOnce({ rows: [] }) // no scores
        .mockResolvedValueOnce({ rows: [] }) // no slots
        .mockResolvedValueOnce({ rowCount: 1 }) // soft delete

      await deleteClass('t1', 'c1')

      // Verify the soft-delete query sets deleted_at
      const deleteCall = mockQuery.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('SET deleted_at')
      )
      expect(deleteCall).toBeDefined()
    })

    it('should throw when class is not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] }) // getClassById returns null

      await expect(deleteClass('t1', 'nonexistent')).rejects.toThrow('Class not found')
    })
  })
})
