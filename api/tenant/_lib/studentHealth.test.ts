/**
 * Student Health Library - Unit Tests
 * Tests for tenant-scoped fetch, record creation, and data transformation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchStudentHealthData,
  createHealthRecord,
} from './studentHealth.js'

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

describe('Student Health Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStudentHealthData', () => {
    it('should return health data scoped to the tenant', async () => {
      mockQueryAll.mockResolvedValue([
        { id: 'h1', student_name: 'John', record_type: 'screening', details: 'Vision', status: 'pending', cohort: 'JSS1' },
        { id: 'h2', student_name: 'Jane', record_type: 'counseling', details: 'Stress', status: 'active', cohort: 'JSS2' },
        { id: 'h3', student_name: 'Bob', record_type: 'incident', details: 'Fall', status: 'resolved', severity: 'High', cohort: 'JSS1' },
        { id: 'h4', student_name: 'Alice', record_type: 'wellness_task', details: 'Checkup', status: 'pending', cohort: 'JSS3' },
      ])

      const result = await fetchStudentHealthData('t1')

      expect(result.summaryStats).toHaveLength(4)
      expect(result.screeningQueue).toHaveLength(1)
      expect(result.counselingPipeline).toHaveLength(3) // 3 columns
      expect(result.incidentFeed).toHaveLength(1)
      expect(result.wellnessTasks).toHaveLength(1)
      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        ['t1']
      )
    })

    it('should return empty payload on error', async () => {
      mockQueryAll.mockRejectedValue(new Error('DB error'))

      const result = await fetchStudentHealthData('t1')

      expect(result.summaryStats).toEqual([])
      expect(result.screeningQueue).toEqual([])
      expect(result.counselingPipeline).toEqual([])
      expect(result.incidentFeed).toEqual([])
      expect(result.wellnessTasks).toEqual([])
    })
  })

  describe('createHealthRecord', () => {
    it('should create a health record with tenant_id', async () => {
      mockQueryOne.mockResolvedValue({
        id: 'h1', student_name: 'John', record_type: 'screening',
        details: 'Vision', status: 'pending', tenant_id: 't1',
      })

      const result = await createHealthRecord('t1', {
        studentName: 'John',
        recordType: 'screening',
        details: 'Vision',
      })

      expect(result).not.toBeNull()
      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO student_health_records'),
        expect.arrayContaining(['t1', 'John', 'screening'])
      )
    })

    it('should use default values for optional fields', async () => {
      mockQueryOne.mockResolvedValue({ id: 'h1' })

      await createHealthRecord('t1', {
        studentName: 'John',
        recordType: 'incident',
      })

      const call = mockQueryOne.mock.calls[0]
      // Verify defaults: status='pending', severity='Low', cohort='', details='', owner='', location=''
      expect(call[1]).toContain('pending') // status
      expect(call[1]).toContain('Low') // severity
      expect(call[1]).toContain('') // empty strings for optional fields
    })
  })
})
