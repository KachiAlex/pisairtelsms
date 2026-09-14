/**
 * Results Library - Unit Tests
 * Tests for tenant isolation, score CRUD, compilation, approval, publishing,
 * and broadsheet generation against mocked PostgreSQL pool.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPoolQuery = vi.fn()
vi.mock('../../_lib/pg-pool.js', () => ({
  poolQuery: (...args: any[]) => mockPoolQuery(...args),
  getPool: vi.fn(),
}))

vi.mock('./ca-config.js', () => ({
  getTenantCAConfig: vi.fn().mockResolvedValue({
    published: {
      primary: { tests: 20, assignments: 15, projects: 15, exams: 50 },
      jss: { tests: 20, assignments: 15, projects: 15, exams: 50 },
      sss: { tests: 20, assignments: 15, projects: 15, exams: 50 },
    },
  }),
}))

// Import after mocks are registered
const {
  fetchScores,
  fetchScoresByClassAndSubject,
  fetchTeacherSubmissions,
  createScore,
  recomputeAllScores,
  compileResults,
  fetchCompiledResults,
  approveCompiledResults,
  fetchBroadsheet,
  publishCompiledResults,
  computeAttendanceBatch,
} = await import('./results.js')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Default mock implementation: setup calls (ALTER/CREATE/DO) succeed,
 * data calls return empty rows by default.
 */
function setupDefaultMock() {
  mockPoolQuery.mockImplementation((query: string) => {
    // Setup calls always succeed
    if (query.includes('ALTER TABLE') || query.includes('CREATE TABLE') || query.includes('DO $$') || query.includes('DROP INDEX')) {
      return Promise.resolve({ rows: [] })
    }
    // Data calls return empty by default
    return Promise.resolve({ rows: [] })
  })
}

function makeScoreRow(overrides: Partial<any> = {}): any {
  return {
    id: 'score_1',
    tenant_id: 't1',
    student_id: 's1',
    subject: 'Mathematics',
    academic_session: '2024/2025',
    term: 'First',
    ca_score: '40',
    exam_score: '50',
    total_score: '90',
    attendance_percentage: '95',
    class: 'JSS 1',
    tests_score: '15',
    assignments_score: '10',
    projects_score: '15',
    exams_score: '50',
    submitted_by: 'teacher1',
    submitted_by_name: 'Teacher One',
    submission_status: 'submitted',
    is_absent: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides,
  }
}

/** Find the first mock call whose query string contains a substring. */
function findCall(querySubstring: string): [string, any[]] {
  const call = mockPoolQuery.mock.calls.find(
    c => typeof c[0] === 'string' && c[0].includes(querySubstring)
  )
  if (!call) throw new Error(`No mock call found containing "${querySubstring}"`)
  return call as [string, any[]]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Results Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMock()
  })

  describe('fetchScores — tenant isolation', () => {
    it('should query with tenant_id filter', async () => {
      await fetchScores('tenant-A')

      const call = findCall('FROM student_scores')
      expect(call[0]).toContain('WHERE tenant_id = $1')
      expect(call[1]).toContain('tenant-A')
    })

    it('should not return records from another tenant', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE')) return Promise.resolve({ rows: [] })
        return Promise.resolve({ rows: [makeScoreRow({ tenant_id: 'tenant-A' })] })
      })

      const result = await fetchScores('tenant-A')

      expect(result).toHaveLength(1)
      const call = findCall('FROM student_scores')
      expect(call[1][0]).toBe('tenant-A')
    })

    it('should filter by studentId when provided', async () => {
      await fetchScores('t1', 'student-123', '2024/2025', 'First')

      const call = findCall('FROM student_scores')
      expect(call[0]).toContain('student_id = $2')
      expect(call[1]).toContain('student-123')
    })

    it('should throw on database error (not swallow)', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE')) return Promise.resolve({ rows: [] })
        return Promise.reject(new Error('DB connection failed'))
      })

      await expect(fetchScores('t1')).rejects.toThrow('Failed to fetch scores')
    })
  })

  describe('fetchScoresByClassAndSubject — tenant isolation', () => {
    it('should query with tenant_id, class, and subject filters', async () => {
      await fetchScoresByClassAndSubject('t1', 'JSS 1', 'Math', '2024/2025', 'First')

      const call = findCall('FROM student_scores')
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[0]).toContain('class = $2')
      expect(call[0]).toContain('subject = $3')
      expect(call[1]).toEqual(['t1', 'JSS 1', 'Math', '2024/2025', 'First'])
    })

    it('should throw on database error', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE')) return Promise.resolve({ rows: [] })
        return Promise.reject(new Error('DB error'))
      })

      await expect(
        fetchScoresByClassAndSubject('t1', 'JSS 1', 'Math', '2024/2025', 'First')
      ).rejects.toThrow('Failed to fetch scores by class/subject')
    })
  })

  describe('fetchTeacherSubmissions — tenant isolation', () => {
    it('should query with tenant_id filter', async () => {
      await fetchTeacherSubmissions('t1', '2024/2025', 'First')

      const call = findCall('FROM student_scores')
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[1][0]).toBe('t1')
    })

    it('should throw on database error', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE')) return Promise.resolve({ rows: [] })
        return Promise.reject(new Error('DB error'))
      })

      await expect(
        fetchTeacherSubmissions('t1', '2024/2025', 'First')
      ).rejects.toThrow('Failed to fetch teacher submissions')
    })
  })

  describe('computeAttendanceBatch — tenant isolation', () => {
    it('should query attendance_records with tenant_id filter', async () => {
      await computeAttendanceBatch('t1', 'JSS 1', '2024/2025', 'First')

      const call = findCall('FROM attendance_records')
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[0]).toContain('class = $2')
      expect(call[1][0]).toBe('t1')
    })

    it('should throw on database error', async () => {
      mockPoolQuery.mockRejectedValue(new Error('DB error'))

      await expect(
        computeAttendanceBatch('t1', 'JSS 1', '2024/2025', 'First')
      ).rejects.toThrow('Failed to compute batch attendance')
    })
  })

  describe('createScore — tenant isolation and upsert', () => {
    it('should insert with tenant_id', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE') || query.includes('DO $$')) return Promise.resolve({ rows: [] })
        if (query.includes('INSERT INTO student_scores')) return Promise.resolve({ rows: [makeScoreRow()] })
        if (query.includes('INSERT INTO student_scores_audit')) return Promise.resolve({ rows: [] })
        // computeAttendancePercentage + computeWeightedTotal calls
        return Promise.resolve({ rows: [{ total: '0', present: '0', late: '0' }] })
      })

      await createScore('tenant-X', {
        studentId: 's1',
        subject: 'Math',
        academicSession: '2024/2025',
        term: 'First',
        class: 'JSS 1',
        caScore: 40,
        examScore: 50,
        attendancePercentage: 95,
      })

      const insertCall = findCall('INSERT INTO student_scores')
      expect(insertCall[1]).toContain('tenant-X')
    })

    it('should use ON CONFLICT with tenant_id in conflict target', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE') || query.includes('DO $$')) return Promise.resolve({ rows: [] })
        if (query.includes('INSERT INTO student_scores')) return Promise.resolve({ rows: [makeScoreRow()] })
        if (query.includes('INSERT INTO student_scores_audit')) return Promise.resolve({ rows: [] })
        return Promise.resolve({ rows: [{ total: '0', present: '0', late: '0' }] })
      })

      await createScore('t1', {
        studentId: 's1',
        subject: 'Math',
        academicSession: '2024/2025',
        term: 'First',
        class: 'JSS 1',
        caScore: 40,
        examScore: 50,
        attendancePercentage: 95,
      })

      const insertCall = findCall('INSERT INTO student_scores')
      expect(insertCall[0]).toContain('ON CONFLICT (tenant_id, student_id, subject, academic_session, term)')
    })
  })

  describe('recomputeAllScores — tenant isolation', () => {
    it('should query scores with tenant_id filter', async () => {
      await recomputeAllScores('t1', '2024/2025', 'First')

      const call = findCall('FROM student_scores')
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[1][0]).toBe('t1')
    })

    it('should throw on database error', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE')) return Promise.resolve({ rows: [] })
        return Promise.reject(new Error('DB error'))
      })

      await expect(
        recomputeAllScores('t1', '2024/2025', 'First')
      ).rejects.toThrow('Failed to recompute scores')
    })
  })

  describe('compileResults — tenant isolation', () => {
    it('should query scores with tenant_id filter', async () => {
      await compileResults('t1', '2024/2025', 'First')

      const selectCall = findCall('SELECT * FROM student_scores')
      expect(selectCall[0]).toContain('tenant_id = $1')
      expect(selectCall[1][0]).toBe('t1')
    })

    it('should return compiled: 0 when no scores exist', async () => {
      const result = await compileResults('t1', '2024/2025', 'First')

      expect(result.compiled).toBe(0)
      expect(result.results).toEqual([])
    })

    it('should throw on database error', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('ALTER TABLE') || query.includes('CREATE TABLE')) return Promise.resolve({ rows: [] })
        return Promise.reject(new Error('DB error'))
      })

      await expect(
        compileResults('t1', '2024/2025', 'First')
      ).rejects.toThrow('Failed to compile results')
    })
  })

  describe('fetchCompiledResults — tenant isolation', () => {
    it('should query with tenant_id filter', async () => {
      await fetchCompiledResults('t1', '2024/2025', 'First')

      const call = findCall('FROM compiled_results')
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[1][0]).toBe('t1')
    })

    it('should throw on database error', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('CREATE TABLE')) return Promise.resolve({ rows: [] })
        return Promise.reject(new Error('DB error'))
      })

      await expect(
        fetchCompiledResults('t1', '2024/2025', 'First')
      ).rejects.toThrow('Failed to fetch compiled results')
    })
  })

  describe('approveCompiledResults — tenant isolation', () => {
    it('should update with tenant_id filter and status=compiled', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('CREATE TABLE')) return Promise.resolve({ rows: [] })
        if (query.includes('UPDATE compiled_results')) return Promise.resolve({ rows: [{ id: 'c1' }, { id: 'c2' }] })
        return Promise.resolve({ rows: [] })
      })

      const count = await approveCompiledResults('t1', '2024/2025', 'First')

      const call = findCall('UPDATE compiled_results')
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[0]).toContain("status = 'compiled'")
      expect(call[1][0]).toBe('t1')
      expect(count).toBe(2)
    })
  })

  describe('publishCompiledResults — tenant isolation', () => {
    it('should update with tenant_id filter and status=approved', async () => {
      mockPoolQuery.mockImplementation((query: string) => {
        if (query.includes('CREATE TABLE')) return Promise.resolve({ rows: [] })
        if (query.includes('UPDATE compiled_results')) return Promise.resolve({ rows: [{ id: 'c1' }] })
        return Promise.resolve({ rows: [] })
      })

      const count = await publishCompiledResults('t1', '2024/2025', 'First')

      const call = findCall('UPDATE compiled_results')
      expect(call[0]).toContain('tenant_id = $1')
      expect(call[0]).toContain("status = 'approved'")
      expect(call[1][0]).toBe('t1')
      expect(count).toBe(1)
    })
  })

  describe('fetchBroadsheet — tenant isolation', () => {
    it('should query compiled_results with tenant_id filter and join students on tenant', async () => {
      await fetchBroadsheet('t1', '2024/2025', 'First', 'JSS 1')

      const call = findCall('FROM compiled_results')
      expect(call[0]).toContain('cr.tenant_id = $1')
      expect(call[0]).toContain('s.tenant_id = $1')
      expect(call[1][0]).toBe('t1')
    })

    it('should return null when no results found', async () => {
      const result = await fetchBroadsheet('t1', '2024/2025', 'First', 'JSS 1')

      expect(result).toBeNull()
    })
  })
})
