/**
 * Grade Bands Library - Unit Tests
 * Tests for the shared getGradeBands, assignGradeFromBands, and getLevelForClass
 * utilities extracted from duplicated code across results/transcript handlers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPoolQuery = vi.fn()
vi.mock('../../_lib/pg-pool.js', () => ({
  poolQuery: (...args: any[]) => mockPoolQuery(...args),
  getPool: vi.fn(),
}))

// Import after mocks are registered
const {
  getGradeBands,
  assignGradeFromBands,
  getLevelForClass,
  DEFAULT_BANDS,
} = await import('./grade-bands.js')

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Grade Bands Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLevelForClass', () => {
    it('should return "sss" for SS class names', () => {
      expect(getLevelForClass('SS 1')).toBe('sss')
      expect(getLevelForClass('SSS 2')).toBe('sss')
      expect(getLevelForClass('Senior 3')).toBe('sss')
    })

    it('should return "jss" for JSS class names', () => {
      expect(getLevelForClass('JSS 1')).toBe('jss')
      expect(getLevelForClass('JSS 2A')).toBe('jss')
      expect(getLevelForClass('Junior 3')).toBe('jss')
      expect(getLevelForClass('JS 1')).toBe('jss')
    })

    it('should return "primary" for primary class names', () => {
      expect(getLevelForClass('Primary 1')).toBe('primary')
      expect(getLevelForClass('Grade 5')).toBe('primary')
      expect(getLevelForClass('Nursery 2')).toBe('primary')
    })

    it('should be case-insensitive', () => {
      expect(getLevelForClass('ss 1')).toBe('sss')
      expect(getLevelForClass('jss 2')).toBe('jss')
      expect(getLevelForClass('PRIMARY 3')).toBe('primary')
    })
  })

  describe('assignGradeFromBands', () => {
    it('should assign A1 for scores 80-100', () => {
      const result = assignGradeFromBands(85, DEFAULT_BANDS)
      expect(result.grade).toBe('A1')
      expect(result.remark).toBe('Distinction')
      expect(result.gpaWeight).toBe(4.0)
    })

    it('should assign F9 for scores below 40', () => {
      const result = assignGradeFromBands(25, DEFAULT_BANDS)
      expect(result.grade).toBe('F9')
      expect(result.remark).toBe('Fail')
      expect(result.gpaWeight).toBe(0.0)
    })

    it('should handle boundary scores correctly', () => {
      expect(assignGradeFromBands(80, DEFAULT_BANDS).grade).toBe('A1')
      expect(assignGradeFromBands(79, DEFAULT_BANDS).grade).toBe('B2')
      expect(assignGradeFromBands(40, DEFAULT_BANDS).grade).toBe('E8')
      expect(assignGradeFromBands(39, DEFAULT_BANDS).grade).toBe('F9')
    })

    it('should handle score 0', () => {
      const result = assignGradeFromBands(0, DEFAULT_BANDS)
      expect(result.grade).toBe('F9')
    })

    it('should handle score 100', () => {
      const result = assignGradeFromBands(100, DEFAULT_BANDS)
      expect(result.grade).toBe('A1')
    })

    it('should fall back to F9 for empty bands', () => {
      const result = assignGradeFromBands(75, [])
      expect(result.grade).toBe('F9')
      expect(result.remark).toBe('Fail')
    })
  })

  describe('getGradeBands', () => {
    it('should return DEFAULT_BANDS when no live scale exists', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] })

      const result = await getGradeBands('t1')

      expect(result).toBe(DEFAULT_BANDS)
      expect(result).toHaveLength(9)
    })

    it('should return DEFAULT_BANDS on database error', async () => {
      mockPoolQuery.mockRejectedValue(new Error('DB error'))

      const result = await getGradeBands('t1')

      expect(result).toBe(DEFAULT_BANDS)
    })

    it('should query with tenant_id filter', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] })

      await getGradeBands('tenant-X')

      const call = mockPoolQuery.mock.calls[0]
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[1][0]).toBe('tenant-X')
    })

    it('should filter by type when classLevel is provided', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] })

      await getGradeBands('t1', 'primary')

      const call = mockPoolQuery.mock.calls[0]
      expect(call[0]).toContain('type = $2')
      expect(call[1]).toContain('primary')
    })

    it('should fall back to any live scale when type-specific not found', async () => {
      // First call (type-specific) returns empty, second call (any) returns a scale
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'scale-1' }] })
        .mockResolvedValueOnce({ rows: [{ grade: 'A1', min_score: 80, max_score: 100, remark: 'Distinction', gpa_weight: 4.0 }] })

      const result = await getGradeBands('t1', 'primary')

      expect(result).toHaveLength(1)
      expect(result[0].grade).toBe('A1')
    })

    it('should return bands from a live scale when found', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ id: 'scale-1' }] })
        .mockResolvedValueOnce({ rows: [
          { grade: 'A', min_score: 70, max_score: 100, remark: 'Excellent', gpa_weight: 4.0 },
          { grade: 'B', min_score: 60, max_score: 69, remark: 'Good', gpa_weight: 3.0 },
        ] })

      const result = await getGradeBands('t1', 'jss')

      expect(result).toHaveLength(2)
      expect(result[0].grade).toBe('A')
      expect(result[0].gpaWeight).toBe(4.0)
      expect(result[1].grade).toBe('B')
    })

    it('should return DEFAULT_BANDS when scale has no bands', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ id: 'scale-1' }] })
        .mockResolvedValueOnce({ rows: [] })

      const result = await getGradeBands('t1')

      expect(result).toBe(DEFAULT_BANDS)
    })
  })
})
