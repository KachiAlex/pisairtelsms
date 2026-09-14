/**
 * Student Documents Library - Unit Tests
 * Tests for tenant-scoped CRUD, delete with tenant isolation,
 * and error handling (re-throw instead of swallowing).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchStudentDocuments,
  createStudentDocument,
  updateStudentDocumentStatus,
  deleteStudentDocument,
} from './studentDocuments.js'

// Mock the database module
const mockQueryAll = vi.fn()
const mockQueryOne = vi.fn()
vi.mock('../cbt/_lib/db.js', () => ({
  queryAll: (...args: any[]) => mockQueryAll(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  query: vi.fn(),
  initializeDatabase: vi.fn(),
  getPool: vi.fn(),
}))

describe('Student Documents Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStudentDocuments', () => {
    it('should return documents scoped to the tenant', async () => {
      mockQueryAll.mockResolvedValue([
        { id: 'd1', student_name: 'John', cohort: 'JSS1', category: 'Academic', doc_name: 'Report', status: 'Pending review' },
      ])

      const result = await fetchStudentDocuments('t1')

      expect(result).toHaveLength(1)
      expect(result[0].student).toBe('John')
      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        ['t1']
      )
    })

    it('should re-throw errors instead of swallowing them', async () => {
      mockQueryAll.mockRejectedValue(new Error('DB connection failed'))

      await expect(fetchStudentDocuments('t1')).rejects.toThrow(
        'Failed to fetch student documents'
      )
    })
  })

  describe('createStudentDocument', () => {
    it('should create a document with tenant_id', async () => {
      mockQueryOne.mockResolvedValue({
        id: 'd1', student_name: 'John', cohort: 'JSS1', category: 'Academic',
        doc_name: 'Report', owner: 'Admin', status: 'Awaiting upload',
      })

      const result = await createStudentDocument('t1', {
        studentName: 'John',
        docName: 'Report',
      })

      expect(result.student).toBe('John')
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO student_documents'),
        expect.arrayContaining(['t1', 'John', 'Report'])
      )
    })

    it('should throw when insert fails', async () => {
      mockQueryOne.mockResolvedValue(null)

      await expect(
        createStudentDocument('t1', { studentName: 'John', docName: 'Report' })
      ).rejects.toThrow('Failed to create student document')
    })
  })

  describe('updateStudentDocumentStatus', () => {
    it('should update status scoped by tenant_id', async () => {
      mockQueryOne.mockResolvedValue({
        id: 'd1', student_name: 'John', status: 'Pending review',
      })

      const result = await updateStudentDocumentStatus('d1', 't1', 'Pending review')

      expect(result).not.toBeNull()
      expect(result!.status).toBe('Pending review')
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $2 AND tenant_id = $3'),
        ['Pending review', 'd1', 't1']
      )
    })

    it('should return null when document is not found in the tenant', async () => {
      mockQueryOne.mockResolvedValue(null)

      const result = await updateStudentDocumentStatus('nonexistent', 't1', 'approved')
      expect(result).toBeNull()
    })
  })

  describe('deleteStudentDocument', () => {
    it('should delete a document scoped by tenant_id', async () => {
      mockQueryOne.mockResolvedValue({ id: 'd1' })

      const result = await deleteStudentDocument('d1', 't1')

      expect(result).toBe(true)
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM student_documents WHERE id = $1 AND tenant_id = $2'),
        ['d1', 't1']
      )
    })

    it('should return false when document is not found in the tenant', async () => {
      mockQueryOne.mockResolvedValue(null)

      const result = await deleteStudentDocument('nonexistent', 't1')
      expect(result).toBe(false)
    })

    it('should not delete documents from other tenants', async () => {
      // Simulate a row not found because tenant_id doesn't match
      mockQueryOne.mockResolvedValue(null)

      const result = await deleteStudentDocument('d1', 'other-tenant')
      expect(result).toBe(false)

      // Verify the query includes tenant_id = $2 (not just id = $1)
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        ['d1', 'other-tenant']
      )
    })
  })
})
