/**
 * Unit Tests for Attendance Analytics Functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  calculateSummaryStats,
  calculateWeeklyHeatmap,
  identifyAtRiskStudents,
  calculateHomeroomLeaderboard,
  invalidateAnalyticsCache,
  SummaryStats,
  WeeklyHeatmapEntry,
  AtRiskStudent,
  HomeroomLeaderboard,
} from './attendance'
import * as db from '../cbt/_lib/db'

// Mock the database module
vi.mock('../cbt/_lib/db', () => ({
  queryAll: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

describe('Attendance Analytics Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear cache between tests by invalidating a broad set of tenants
    invalidateAnalyticsCache('tenant-1')
    invalidateAnalyticsCache('tenant-2')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // calculateSummaryStats Tests
  // ============================================================================

  describe('calculateSummaryStats', () => {
    it('should calculate present/absent/late rates rounded to 1 decimal place', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '200',
        present: '170',
        absent: '20',
        late: '10',
      })

      const result = await calculateSummaryStats('tenant-1')

      expect(result.totalRecords).toBe(200)
      expect(result.presentRate).toBe(85.0)
      expect(result.absentRate).toBe(10.0)
      expect(result.lateRate).toBe(5.0)
    })

    it('should return 0 rates when there are no records', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '0',
        present: '0',
        absent: '0',
        late: '0',
      })

      const result = await calculateSummaryStats('tenant-1')

      expect(result.totalRecords).toBe(0)
      expect(result.presentRate).toBe(0)
      expect(result.absentRate).toBe(0)
      expect(result.lateRate).toBe(0)
    })

    it('should include a dataFreshness ISO timestamp', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '10',
        present: '8',
        absent: '1',
        late: '1',
      })

      const before = new Date().toISOString()
      const result = await calculateSummaryStats('tenant-1')
      const after = new Date().toISOString()

      expect(result.dataFreshness).toBeDefined()
      expect(result.dataFreshness >= before).toBe(true)
      expect(result.dataFreshness <= after).toBe(true)
    })

    it('should filter by term when provided', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '50',
        present: '45',
        absent: '3',
        late: '2',
      })

      await calculateSummaryStats('tenant-1', 'Term 1')

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('term = $2'),
        expect.arrayContaining(['tenant-1', 'Term 1'])
      )
    })

    it('should filter by academicSession when provided', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '50',
        present: '45',
        absent: '3',
        late: '2',
      })

      await calculateSummaryStats('tenant-1', undefined, '2024/2025')

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('academic_session = $2'),
        expect.arrayContaining(['tenant-1', '2024/2025'])
      )
    })

    it('should filter by both term and academicSession when both provided', async () => {
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '50',
        present: '45',
        absent: '3',
        late: '2',
      })

      await calculateSummaryStats('tenant-1', 'Term 2', '2024/2025')

      const callArgs = vi.mocked(db.queryOne).mock.calls[0]
      expect(callArgs[0]).toContain('term = $2')
      expect(callArgs[0]).toContain('academic_session = $3')
      expect(callArgs[1]).toEqual(['tenant-1', 'Term 2', '2024/2025'])
    })

    it('should round rates to 1 decimal place', async () => {
      // 1 out of 3 = 33.333...%
      vi.mocked(db.queryOne).mockResolvedValueOnce({
        total: '3',
        present: '1',
        absent: '1',
        late: '1',
      })

      const result = await calculateSummaryStats('tenant-1')

      expect(result.presentRate).toBe(33.3)
      expect(result.absentRate).toBe(33.3)
      expect(result.lateRate).toBe(33.3)
    })

    it('should return cached result on second call', async () => {
      vi.mocked(db.queryOne).mockResolvedValue({
        total: '100',
        present: '90',
        absent: '7',
        late: '3',
      })

      const result1 = await calculateSummaryStats('tenant-1', 'Term 1')
      const result2 = await calculateSummaryStats('tenant-1', 'Term 1')

      // DB should only be called once due to caching
      expect(db.queryOne).toHaveBeenCalledTimes(1)
      expect(result1.presentRate).toBe(result2.presentRate)
    })

    it('should use separate cache entries for different params', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ total: '100', present: '90', absent: '7', late: '3' })
        .mockResolvedValueOnce({ total: '50', present: '40', absent: '5', late: '5' })

      await calculateSummaryStats('tenant-1', 'Term 1')
      await calculateSummaryStats('tenant-1', 'Term 2')

      expect(db.queryOne).toHaveBeenCalledTimes(2)
    })
  })

  // ============================================================================
  // calculateWeeklyHeatmap Tests
  // ============================================================================

  describe('calculateWeeklyHeatmap', () => {
    it('should return weekly heatmap entries with color coding', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { week: '2024-W20', total: '100', present: '97', absent: '2', late: '1' },
        { week: '2024-W19', total: '100', present: '90', absent: '7', late: '3' },
        { week: '2024-W18', total: '100', present: '80', absent: '15', late: '5' },
      ])

      const result = await calculateWeeklyHeatmap('tenant-1')

      expect(result).toHaveLength(3)
      expect(result[0].week).toBe('2024-W20')
      expect(result[0].presentPct).toBe(97.0)
      expect(result[0].color).toBe('green')   // ≥95%
      expect(result[1].color).toBe('yellow')  // 85-94%
      expect(result[2].color).toBe('red')     // <85%
    })

    it('should default to last 4 weeks', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await calculateWeeklyHeatmap('tenant-1')

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '4 weeks'"),
        expect.arrayContaining(['tenant-1'])
      )
    })

    it('should use custom weeks parameter', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await calculateWeeklyHeatmap('tenant-1', 8)

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '8 weeks'"),
        expect.arrayContaining(['tenant-1'])
      )
    })

    it('should filter by class when provided', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await calculateWeeklyHeatmap('tenant-1', 4, 'JSS 1')

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('class = $2'),
        expect.arrayContaining(['tenant-1', 'JSS 1'])
      )
    })

    it('should return empty array when no data', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      const result = await calculateWeeklyHeatmap('tenant-1')

      expect(result).toEqual([])
    })

    it('should assign green color for presentPct exactly 95', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { week: '2024-W20', total: '20', present: '19', absent: '1', late: '0' },
      ])

      const result = await calculateWeeklyHeatmap('tenant-1')

      // 19/20 = 95%
      expect(result[0].presentPct).toBe(95.0)
      expect(result[0].color).toBe('green')
    })

    it('should assign yellow color for presentPct exactly 85', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { week: '2024-W20', total: '20', present: '17', absent: '3', late: '0' },
      ])

      const result = await calculateWeeklyHeatmap('tenant-1')

      // 17/20 = 85%
      expect(result[0].presentPct).toBe(85.0)
      expect(result[0].color).toBe('yellow')
    })

    it('should assign red color for presentPct below 85', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { week: '2024-W20', total: '100', present: '84', absent: '16', late: '0' },
      ])

      const result = await calculateWeeklyHeatmap('tenant-1')

      expect(result[0].presentPct).toBe(84.0)
      expect(result[0].color).toBe('red')
    })

    it('should include all required fields in each entry', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { week: '2024-W20', total: '100', present: '90', absent: '7', late: '3' },
      ])

      const result = await calculateWeeklyHeatmap('tenant-1')

      expect(result[0]).toHaveProperty('week')
      expect(result[0]).toHaveProperty('presentPct')
      expect(result[0]).toHaveProperty('absentPct')
      expect(result[0]).toHaveProperty('latePct')
      expect(result[0]).toHaveProperty('total')
      expect(result[0]).toHaveProperty('color')
    })

    it('should return cached result on second call with same params', async () => {
      vi.mocked(db.queryAll).mockResolvedValue([
        { week: '2024-W20', total: '100', present: '90', absent: '7', late: '3' },
      ])

      await calculateWeeklyHeatmap('tenant-1', 4)
      await calculateWeeklyHeatmap('tenant-1', 4)

      expect(db.queryAll).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // identifyAtRiskStudents Tests
  // ============================================================================

  describe('identifyAtRiskStudents', () => {
    it('should return students with attendance below 85%', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        {
          student_id: 'STU001',
          name: 'Alice Johnson',
          class: 'JSS 1',
          total_days: '20',
          present_days: '14',
          absent_days: '5',
          late_days: '1',
          owner: 'Mr. Smith',
        },
        {
          student_id: 'STU002',
          name: 'Bob Williams',
          class: 'JSS 2',
          total_days: '20',
          present_days: '10',
          absent_days: '8',
          late_days: '2',
          owner: null,
        },
      ])

      const result = await identifyAtRiskStudents('tenant-1')

      expect(result).toHaveLength(2)
      expect(result[0].studentId).toBe('STU001')
      expect(result[0].name).toBe('Alice Johnson')
      expect(result[0].attendance).toBe(70.0)
      expect(result[0].absenceCount).toBe(5)
      expect(result[0].lateCount).toBe(1)
      expect(result[0].owner).toBe('Mr. Smith')
    })

    it('should return empty array when no at-risk students', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      const result = await identifyAtRiskStudents('tenant-1')

      expect(result).toEqual([])
    })

    it('should filter by class when provided', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await identifyAtRiskStudents('tenant-1', 'JSS 1')

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('ar.class = $2'),
        expect.arrayContaining(['tenant-1', 'JSS 1'])
      )
    })

    it('should filter by reason post-aggregation', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        {
          student_id: 'STU001',
          name: 'Alice',
          class: 'JSS 1',
          total_days: '20',
          present_days: '14',
          absent_days: '5',
          late_days: '1',
          owner: null,
        },
        {
          student_id: 'STU002',
          name: 'Bob',
          class: 'JSS 1',
          total_days: '20',
          present_days: '14',
          absent_days: '1',
          late_days: '5',
          owner: null,
        },
      ])

      const result = await identifyAtRiskStudents('tenant-1', undefined, 'absence')

      // Only STU001 has more absences than lates
      expect(result).toHaveLength(1)
      expect(result[0].studentId).toBe('STU001')
      expect(result[0].reason).toBe('absence')
    })

    it('should set reason to "late" when late count exceeds absence count', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        {
          student_id: 'STU003',
          name: 'Carol',
          class: 'JSS 3',
          total_days: '20',
          present_days: '14',
          absent_days: '2',
          late_days: '4',
          owner: null,
        },
      ])

      const result = await identifyAtRiskStudents('tenant-1')

      expect(result[0].reason).toBe('late')
    })

    it('should use studentId as name fallback when name is null', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        {
          student_id: 'STU999',
          name: null,
          class: 'JSS 1',
          total_days: '20',
          present_days: '10',
          absent_days: '10',
          late_days: '0',
          owner: null,
        },
      ])

      const result = await identifyAtRiskStudents('tenant-1')

      expect(result[0].name).toBe('STU999')
    })

    it('should include all required fields', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        {
          student_id: 'STU001',
          name: 'Alice',
          class: 'JSS 1',
          total_days: '20',
          present_days: '14',
          absent_days: '5',
          late_days: '1',
          owner: 'Mr. Smith',
        },
      ])

      const result = await identifyAtRiskStudents('tenant-1')

      expect(result[0]).toHaveProperty('studentId')
      expect(result[0]).toHaveProperty('name')
      expect(result[0]).toHaveProperty('class')
      expect(result[0]).toHaveProperty('attendance')
      expect(result[0]).toHaveProperty('reason')
      expect(result[0]).toHaveProperty('absenceCount')
      expect(result[0]).toHaveProperty('lateCount')
      expect(result[0]).toHaveProperty('owner')
    })

    it('should return cached result on second call with same params', async () => {
      vi.mocked(db.queryAll).mockResolvedValue([])

      await identifyAtRiskStudents('tenant-1')
      await identifyAtRiskStudents('tenant-1')

      expect(db.queryAll).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // calculateHomeroomLeaderboard Tests
  // ============================================================================

  describe('calculateHomeroomLeaderboard', () => {
    it('should return top 5 homerooms ranked by attendance rate', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { homeroom: 'JSS 1A', rate: '97.5', student_count: '30', present_count: '585' },
        { homeroom: 'JSS 2B', rate: '95.0', student_count: '28', present_count: '532' },
        { homeroom: 'JSS 3C', rate: '92.3', student_count: '25', present_count: '461' },
        { homeroom: 'SS 1A', rate: '88.0', student_count: '32', present_count: '563' },
        { homeroom: 'SS 2B', rate: '85.5', student_count: '29', present_count: '495' },
      ])

      const result = await calculateHomeroomLeaderboard('tenant-1')

      expect(result.entries).toHaveLength(5)
      expect(result.entries[0].homeroom).toBe('JSS 1A')
      expect(result.entries[0].rate).toBe(97.5)
      expect(result.entries[0].studentCount).toBe(30)
      expect(result.entries[0].presentCount).toBe(585)
    })

    it('should return empty entries when no data', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      const result = await calculateHomeroomLeaderboard('tenant-1')

      expect(result.entries).toEqual([])
    })

    it('should include calculationDate timestamp', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      const before = new Date().toISOString()
      const result = await calculateHomeroomLeaderboard('tenant-1')
      const after = new Date().toISOString()

      expect(result.calculationDate).toBeDefined()
      expect(result.calculationDate >= before).toBe(true)
      expect(result.calculationDate <= after).toBe(true)
    })

    it('should filter by term when provided', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await calculateHomeroomLeaderboard('tenant-1', 'Term 1')

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('term = $2'),
        expect.arrayContaining(['tenant-1', 'Term 1'])
      )
    })

    it('should limit results to 5 homerooms', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      await calculateHomeroomLeaderboard('tenant-1')

      expect(db.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5'),
        expect.any(Array)
      )
    })

    it('should include all required fields in each entry', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([
        { homeroom: 'JSS 1A', rate: '97.5', student_count: '30', present_count: '585' },
      ])

      const result = await calculateHomeroomLeaderboard('tenant-1')

      expect(result.entries[0]).toHaveProperty('homeroom')
      expect(result.entries[0]).toHaveProperty('rate')
      expect(result.entries[0]).toHaveProperty('studentCount')
      expect(result.entries[0]).toHaveProperty('presentCount')
    })

    it('should return cached result on second call with same params', async () => {
      vi.mocked(db.queryAll).mockResolvedValue([
        { homeroom: 'JSS 1A', rate: '97.5', student_count: '30', present_count: '585' },
      ])

      await calculateHomeroomLeaderboard('tenant-1')
      await calculateHomeroomLeaderboard('tenant-1')

      expect(db.queryAll).toHaveBeenCalledTimes(1)
    })

    it('should use separate cache entries for different terms', async () => {
      vi.mocked(db.queryAll)
        .mockResolvedValueOnce([{ homeroom: 'JSS 1A', rate: '97.5', student_count: '30', present_count: '585' }])
        .mockResolvedValueOnce([{ homeroom: 'JSS 2B', rate: '95.0', student_count: '28', present_count: '532' }])

      await calculateHomeroomLeaderboard('tenant-1', 'Term 1')
      await calculateHomeroomLeaderboard('tenant-1', 'Term 2')

      expect(db.queryAll).toHaveBeenCalledTimes(2)
    })
  })

  // ============================================================================
  // invalidateAnalyticsCache Tests
  // ============================================================================

  describe('invalidateAnalyticsCache', () => {
    it('should invalidate cache for a specific tenant', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ total: '100', present: '90', absent: '7', late: '3' })
        .mockResolvedValueOnce({ total: '100', present: '85', absent: '10', late: '5' })

      // First call — populates cache
      const result1 = await calculateSummaryStats('tenant-1')
      expect(result1.presentRate).toBe(90.0)

      // Invalidate cache
      invalidateAnalyticsCache('tenant-1')

      // Second call — should hit DB again
      const result2 = await calculateSummaryStats('tenant-1')
      expect(result2.presentRate).toBe(85.0)

      expect(db.queryOne).toHaveBeenCalledTimes(2)
    })

    it('should not invalidate cache for other tenants', async () => {
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({ total: '100', present: '90', absent: '7', late: '3' })
        .mockResolvedValueOnce({ total: '50', present: '45', absent: '3', late: '2' })

      // Populate cache for both tenants
      await calculateSummaryStats('tenant-1')
      await calculateSummaryStats('tenant-2')

      vi.clearAllMocks()

      // Invalidate only tenant-1
      invalidateAnalyticsCache('tenant-1')

      // tenant-2 should still be cached (no DB call)
      vi.mocked(db.queryOne).mockResolvedValueOnce({ total: '100', present: '90', absent: '7', late: '3' })
      await calculateSummaryStats('tenant-1') // re-fetches
      await calculateSummaryStats('tenant-2') // from cache

      expect(db.queryOne).toHaveBeenCalledTimes(1)
    })
  })
})
