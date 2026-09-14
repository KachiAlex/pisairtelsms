/**
 * Applications Library - Unit Tests
 * Tests for tenant-scoped CRUD, public create with tenant derivation,
 * and status updates with tenant isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchApplications,
  createApplication,
  updateApplicationStatus,
} from './applications.js'

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

describe('Applications Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchApplications', () => {
    it('should filter by tenant_id', async () => {
      mockQueryAll.mockResolvedValue([
        { id: 'app1', student_name: 'John', status: 'pending', class_interested: 'JSS1' },
      ])

      const result = await fetchApplications('t1')

      expect(result).toHaveLength(1)
      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('tenant_id = $1'),
        ['t1']
      )
    })

    it('should filter by tenant_id AND status when status is provided', async () => {
      mockQueryAll.mockResolvedValue([])

      await fetchApplications('t1', 'pending')

      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('tenant_id = $1'),
        ['t1', 'pending']
      )
    })

    it('should filter by tenant_id AND academicSession when provided', async () => {
      mockQueryAll.mockResolvedValue([])

      await fetchApplications('t1', undefined, '2026/2027')

      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('academic_session = $'),
        ['t1', '2026/2027']
      )
    })

    it('should return empty array on error', async () => {
      mockQueryAll.mockRejectedValue(new Error('DB error'))
      const result = await fetchApplications('t1')
      expect(result).toEqual([])
    })
  })

  describe('createApplication', () => {
    it('should create an application with the provided tenant ID', async () => {
      mockQueryOne.mockResolvedValue({
        id: 'app1', student_name: 'John', parent_name: 'Parent',
        contact_phone: '123', contact_email: 'a@b.com',
        class_interested: 'JSS1', status: 'pending',
      })

      const result = await createApplication({
        studentName: 'John',
        parentName: 'Parent',
        contactPhone: '123',
        contactEmail: 'a@b.com',
        classApplying: 'JSS1',
        tenantId: 't1',
      })

      expect(result.studentName).toBe('John')
      // Verify the INSERT includes tenant_id
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leads'),
        expect.arrayContaining(['t1'])
      )
    })

    it('should store null tenant_id when not provided', async () => {
      mockQueryOne.mockResolvedValue({
        id: 'app1', student_name: 'John', status: 'pending',
      })

      await createApplication({
        studentName: 'John',
        parentName: '',
        contactPhone: '',
        contactEmail: '',
        classApplying: 'JSS1',
        tenantId: null,
      })

      // The last parameter should be null (tenant_id)
      const insertCall = mockQueryOne.mock.calls[0]
      expect(insertCall[1]).toContain(null)
    })
  })

  describe('updateApplicationStatus', () => {
    it('should update status scoped by tenant_id', async () => {
      mockQueryOne.mockResolvedValue({
        id: 'app1', student_name: 'John', status: 'approved',
      })

      const result = await updateApplicationStatus('app1', 't1', 'approved')

      expect(result).not.toBeNull()
      expect(result!.status).toBe('approved')
      // Verify the UPDATE includes tenant_id in WHERE clause
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $2 AND tenant_id = $3'),
        ['approved', 'app1', 't1']
      )
    })

    it('should return null when application is not found in the tenant', async () => {
      mockQueryOne.mockResolvedValue(null)

      const result = await updateApplicationStatus('nonexistent', 't1', 'approved')
      expect(result).toBeNull()
    })

    it('should not update applications from other tenants', async () => {
      // Simulate a row not found because tenant_id doesn't match
      mockQueryOne.mockResolvedValue(null)

      await updateApplicationStatus('app1', 't2', 'approved')

      // Verify the query includes tenant_id = $3 (not just id = $2)
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $3'),
        ['approved', 'app1', 't2']
      )
    })
  })
})
