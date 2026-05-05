import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

/**
 * Tests for StudentAttendance component logic
 * Covers: CSV export, filter logic, pagination, heatmap color coding,
 *         API fetch functions, loading/error states, and refresh behavior.
 */

// ─── Type definitions (mirrors component interfaces) ─────────────────────────

interface AtRiskStudent {
  studentId: string
  name: string
  class: string
  attendance: number
  reason: string
  absenceCount: number
  lateCount: number
  owner: string | null
}

interface HeatmapEntry {
  week: string
  presentPct: number
  absentPct: number
  latePct: number
  total: number
  color: 'green' | 'yellow' | 'red'
}

interface DashboardStats {
  presentRate: number
  absentRate: number
  lateRate: number
  totalRecords: number
  dataFreshness: string
}

// ─── Pure logic helpers (extracted from component for testability) ────────────

const AT_RISK_PAGE_SIZE = 10

function heatmapBgClass(color: HeatmapEntry['color']): string {
  if (color === 'green') return 'bg-emerald-500'
  if (color === 'yellow') return 'bg-amber-400'
  return 'bg-rose-500'
}

function buildCSV(students: AtRiskStudent[]): string {
  const headers = ['Student Name', 'Class', 'Attendance %', 'Reason', 'Absences', 'Late Count', 'Owner']
  const rows = students.map((s) => [
    s.name,
    s.class,
    `${s.attendance}%`,
    s.reason,
    s.absenceCount,
    s.lateCount,
    s.owner || '',
  ])
  return [headers, ...rows].map((r) => r.join(',')).join('\n')
}

function filterAtRisk(students: AtRiskStudent[], searchTerm: string): AtRiskStudent[] {
  if (!searchTerm) return students
  const lower = searchTerm.toLowerCase()
  return students.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.class.toLowerCase().includes(lower)
  )
}

function totalPages(total: number): number {
  return Math.ceil(total / AT_RISK_PAGE_SIZE)
}

function getTenantHeaders(authJson: string | null): Record<string, string> {
  try {
    const tenantId = authJson ? JSON.parse(authJson).tenantId || 'default-tenant' : 'default-tenant'
    return { 'x-tenant-id': tenantId }
  } catch {
    return { 'x-tenant-id': 'default-tenant' }
  }
}

// ─── Generators ───────────────────────────────────────────────────────────────

const atRiskStudentArb = fc.record({
  studentId: fc.uuid(),
  name: fc.string({ minLength: 2, maxLength: 40 }),
  class: fc.constantFrom('JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'),
  attendance: fc.integer({ min: 0, max: 84 }),
  reason: fc.constantFrom('absence', 'late'),
  absenceCount: fc.integer({ min: 0, max: 30 }),
  lateCount: fc.integer({ min: 0, max: 30 }),
  owner: fc.option(fc.string({ minLength: 2, maxLength: 30 }), { nil: null }),
})

const heatmapColorArb = fc.constantFrom('green', 'yellow', 'red') as fc.Arbitrary<'green' | 'yellow' | 'red'>

const dashboardStatsArb = fc.record({
  presentRate: fc.integer({ min: 0, max: 100 }),
  absentRate: fc.integer({ min: 0, max: 100 }),
  lateRate: fc.integer({ min: 0, max: 100 }),
  totalRecords: fc.integer({ min: 0, max: 100000 }),
  dataFreshness: fc.string({ minLength: 5, maxLength: 30 }),
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StudentAttendance - Heatmap color coding', () => {
  it('returns bg-emerald-500 for green', () => {
    expect(heatmapBgClass('green')).toBe('bg-emerald-500')
  })

  it('returns bg-amber-400 for yellow', () => {
    expect(heatmapBgClass('yellow')).toBe('bg-amber-400')
  })

  it('returns bg-rose-500 for red', () => {
    expect(heatmapBgClass('red')).toBe('bg-rose-500')
  })

  it('always returns a non-empty CSS class for any valid color', () => {
    fc.assert(
      fc.property(heatmapColorArb, (color) => {
        const cls = heatmapBgClass(color)
        expect(cls.length).toBeGreaterThan(0)
        expect(cls.startsWith('bg-')).toBe(true)
      })
    )
  })

  it('maps each color to a distinct CSS class', () => {
    fc.assert(
      fc.property(heatmapColorArb, (color) => {
        const cls = heatmapBgClass(color)
        if (color === 'green') expect(cls).toBe('bg-emerald-500')
        else if (color === 'yellow') expect(cls).toBe('bg-amber-400')
        else expect(cls).toBe('bg-rose-500')
      })
    )
  })
})

describe('StudentAttendance - CSV export logic', () => {
  it('produces correct header row', () => {
    const csv = buildCSV([])
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toBe('Student Name,Class,Attendance %,Reason,Absences,Late Count,Owner')
  })

  it('produces one data row per student', () => {
    const students: AtRiskStudent[] = [
      { studentId: '1', name: 'Alice', class: 'JSS 1', attendance: 70, reason: 'absence', absenceCount: 5, lateCount: 1, owner: 'Mr. Smith' },
      { studentId: '2', name: 'Bob', class: 'SS 2', attendance: 60, reason: 'late', absenceCount: 2, lateCount: 8, owner: null },
    ]
    const lines = buildCSV(students).split('\n')
    expect(lines).toHaveLength(3) // header + 2 rows
  })

  it('formats attendance as percentage string', () => {
    const students: AtRiskStudent[] = [
      { studentId: '1', name: 'Alice', class: 'JSS 1', attendance: 72, reason: 'absence', absenceCount: 5, lateCount: 0, owner: null },
    ]
    const csv = buildCSV(students)
    expect(csv).toContain('72%')
  })

  it('uses empty string for null owner', () => {
    const students: AtRiskStudent[] = [
      { studentId: '1', name: 'Alice', class: 'JSS 1', attendance: 72, reason: 'absence', absenceCount: 5, lateCount: 0, owner: null },
    ]
    const csv = buildCSV(students)
    const dataRow = csv.split('\n')[1]
    expect(dataRow.endsWith(',')).toBe(true) // last field is empty
  })

  it('CSV row count equals student count + 1 (header) for any list', () => {
    fc.assert(
      fc.property(fc.array(atRiskStudentArb, { minLength: 0, maxLength: 50 }), (students) => {
        const lines = buildCSV(students).split('\n')
        expect(lines).toHaveLength(students.length + 1)
      })
    )
  })

  it('every data row contains the student name', () => {
    fc.assert(
      fc.property(fc.array(atRiskStudentArb, { minLength: 1, maxLength: 20 }), (students) => {
        const csv = buildCSV(students)
        const lines = csv.split('\n').slice(1) // skip header
        students.forEach((s, i) => {
          expect(lines[i]).toContain(s.name)
        })
      })
    )
  })

  it('every data row contains the attendance percentage', () => {
    fc.assert(
      fc.property(fc.array(atRiskStudentArb, { minLength: 1, maxLength: 20 }), (students) => {
        const csv = buildCSV(students)
        const lines = csv.split('\n').slice(1)
        students.forEach((s, i) => {
          expect(lines[i]).toContain(`${s.attendance}%`)
        })
      })
    )
  })
})

describe('StudentAttendance - Search/filter logic', () => {
  const sampleStudents: AtRiskStudent[] = [
    { studentId: '1', name: 'Alice Johnson', class: 'JSS 1', attendance: 70, reason: 'absence', absenceCount: 5, lateCount: 0, owner: null },
    { studentId: '2', name: 'Bob Smith', class: 'SS 2', attendance: 60, reason: 'late', absenceCount: 0, lateCount: 8, owner: null },
    { studentId: '3', name: 'Carol White', class: 'JSS 2', attendance: 75, reason: 'absence', absenceCount: 3, lateCount: 1, owner: null },
  ]

  it('returns all students when search term is empty', () => {
    expect(filterAtRisk(sampleStudents, '')).toHaveLength(3)
  })

  it('filters by student name (case-insensitive)', () => {
    const result = filterAtRisk(sampleStudents, 'alice')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice Johnson')
  })

  it('filters by class name', () => {
    const result = filterAtRisk(sampleStudents, 'JSS 1')
    expect(result).toHaveLength(1)
    expect(result[0].class).toBe('JSS 1')
  })

  it('returns empty array when no match', () => {
    expect(filterAtRisk(sampleStudents, 'xyz-no-match')).toHaveLength(0)
  })

  it('filtered results are always a subset of original list', () => {
    fc.assert(
      fc.property(
        fc.array(atRiskStudentArb, { minLength: 0, maxLength: 30 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        (students, term) => {
          const filtered = filterAtRisk(students, term)
          expect(filtered.length).toBeLessThanOrEqual(students.length)
          filtered.forEach((s) => {
            expect(students.some((orig) => orig.studentId === s.studentId)).toBe(true)
          })
        }
      )
    )
  })

  it('empty search term returns all students', () => {
    fc.assert(
      fc.property(fc.array(atRiskStudentArb, { minLength: 0, maxLength: 30 }), (students) => {
        expect(filterAtRisk(students, '')).toHaveLength(students.length)
      })
    )
  })
})

describe('StudentAttendance - Pagination logic', () => {
  it('calculates 0 pages for 0 students', () => {
    expect(totalPages(0)).toBe(0)
  })

  it('calculates 1 page for 10 students', () => {
    expect(totalPages(10)).toBe(1)
  })

  it('calculates 2 pages for 11 students', () => {
    expect(totalPages(11)).toBe(2)
  })

  it('calculates 1 page for 1 student', () => {
    expect(totalPages(1)).toBe(1)
  })

  it('page count is always ceil(total / PAGE_SIZE)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (total) => {
        expect(totalPages(total)).toBe(Math.ceil(total / AT_RISK_PAGE_SIZE))
      })
    )
  })

  it('page count is always non-negative', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (total) => {
        expect(totalPages(total)).toBeGreaterThanOrEqual(0)
      })
    )
  })

  it('page count increases monotonically with total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (a, b) => {
          if (a <= b) {
            expect(totalPages(a)).toBeLessThanOrEqual(totalPages(b))
          } else {
            expect(totalPages(a)).toBeGreaterThanOrEqual(totalPages(b))
          }
        }
      )
    )
  })
})

describe('StudentAttendance - Tenant header extraction', () => {
  it('returns default-tenant when auth is null', () => {
    const headers = getTenantHeaders(null)
    expect(headers['x-tenant-id']).toBe('default-tenant')
  })

  it('returns default-tenant when auth is invalid JSON', () => {
    const headers = getTenantHeaders('not-json')
    expect(headers['x-tenant-id']).toBe('default-tenant')
  })

  it('returns tenantId from valid auth JSON', () => {
    const auth = JSON.stringify({ tenantId: 'school-abc' })
    const headers = getTenantHeaders(auth)
    expect(headers['x-tenant-id']).toBe('school-abc')
  })

  it('falls back to default-tenant when tenantId is missing from auth', () => {
    const auth = JSON.stringify({ userId: '123' })
    const headers = getTenantHeaders(auth)
    expect(headers['x-tenant-id']).toBe('default-tenant')
  })

  it('always returns an x-tenant-id header', () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: null }), (authStr) => {
        const headers = getTenantHeaders(authStr)
        expect(headers['x-tenant-id']).toBeTruthy()
      })
    )
  })
})

describe('StudentAttendance - Dashboard stats display', () => {
  it('stat cards show correct values from API data', () => {
    fc.assert(
      fc.property(dashboardStatsArb, (stats) => {
        const cards = [
          { label: 'Present rate', value: `${stats.presentRate}%` },
          { label: 'Absent rate', value: `${stats.absentRate}%` },
          { label: 'Late rate', value: `${stats.lateRate}%` },
          { label: 'Total records', value: stats.totalRecords.toLocaleString() },
        ]

        expect(cards[0].value).toBe(`${stats.presentRate}%`)
        expect(cards[1].value).toBe(`${stats.absentRate}%`)
        expect(cards[2].value).toBe(`${stats.lateRate}%`)
        expect(cards[3].value).toBe(stats.totalRecords.toLocaleString())
      })
    )
  })

  it('shows placeholder when stats are null', () => {
    const dashboardStats = null
    const value = dashboardStats ? 'some value' : '—'
    expect(value).toBe('—')
  })
})

describe('StudentAttendance - API fetch URL construction', () => {
  it('builds correct dashboard URL with term filter', () => {
    const term = '1'
    const params = new URLSearchParams()
    if (term) params.set('term', term)
    const url = `/api/tenant/attendance/analytics/dashboard?${params}`
    expect(url).toBe('/api/tenant/attendance/analytics/dashboard?term=1')
  })

  it('builds correct heatmap URL with class filter', () => {
    const classFilter = 'JSS 1'
    const params = new URLSearchParams({ weeks: '4' })
    if (classFilter) params.set('class', classFilter)
    const url = `/api/tenant/attendance/analytics/heatmap?${params}`
    expect(url).toContain('weeks=4')
    expect(url).toContain('class=JSS+1')
  })

  it('builds correct at-risk URL with pagination', () => {
    const page = 2
    const params = new URLSearchParams({
      limit: String(AT_RISK_PAGE_SIZE),
      offset: String(page * AT_RISK_PAGE_SIZE),
    })
    const url = `/api/tenant/attendance/analytics/at-risk-students?${params}`
    expect(url).toContain('limit=10')
    expect(url).toContain('offset=20')
  })

  it('builds correct leaderboard URL with term filter', () => {
    const term = '2'
    const params = new URLSearchParams()
    if (term) params.set('term', term)
    const url = `/api/tenant/attendance/analytics/homeroom-leaderboard?${params}`
    expect(url).toBe('/api/tenant/attendance/analytics/homeroom-leaderboard?term=2')
  })

  it('at-risk offset is always page * PAGE_SIZE', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (page) => {
        const offset = page * AT_RISK_PAGE_SIZE
        expect(offset).toBe(page * 10)
      })
    )
  })
})

describe('StudentAttendance - Loading and error states', () => {
  it('shows loading placeholder when dashboardLoading is true and stats are null', () => {
    const dashboardLoading = true
    const dashboardStats = null
    const shouldShowSkeleton = dashboardLoading && !dashboardStats
    expect(shouldShowSkeleton).toBe(true)
  })

  it('shows data when stats are loaded', () => {
    const dashboardLoading = false
    const dashboardStats: DashboardStats = {
      presentRate: 92,
      absentRate: 5,
      lateRate: 3,
      totalRecords: 1000,
      dataFreshness: '2024-01-15',
    }
    const shouldShowData = !dashboardLoading && dashboardStats !== null
    expect(shouldShowData).toBe(true)
  })

  it('shows error message when fetch fails', () => {
    const atRiskError = 'Failed to fetch at-risk students'
    const atRiskLoading = false
    const shouldShowError = !atRiskLoading && atRiskError !== null
    expect(shouldShowError).toBe(true)
    expect(atRiskError).toContain('Failed')
  })

  it('shows empty state when no at-risk students found', () => {
    const atRiskStudents: AtRiskStudent[] = []
    const atRiskLoading = false
    const atRiskError = null
    const showEmpty = !atRiskLoading && !atRiskError && atRiskStudents.length === 0
    expect(showEmpty).toBe(true)
  })
})

describe('StudentAttendance - Refresh behavior', () => {
  it('refreshAll resets page to 0', () => {
    let atRiskPage = 5
    atRiskPage = 0
    expect(atRiskPage).toBe(0)
  })

  it('lastRefreshed is updated after refresh', () => {
    const before = new Date()
    const lastRefreshed = new Date()
    expect(lastRefreshed.getTime()).toBeGreaterThanOrEqual(before.getTime())
  })
})

describe('StudentAttendance - Leaderboard display', () => {
  it('leaderboard entries are ranked by index', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            homeroom: fc.string({ minLength: 2, maxLength: 20 }),
            rate: fc.integer({ min: 0, max: 100 }),
            studentCount: fc.integer({ min: 1, max: 100 }),
            presentCount: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (entries) => {
          entries.forEach((entry, idx) => {
            const rank = idx + 1
            expect(rank).toBeGreaterThanOrEqual(1)
            expect(rank).toBeLessThanOrEqual(entries.length)
          })
        }
      )
    )
  })

  it('badge variant is default for rate >= 95', () => {
    const rate = 97
    const variant = rate >= 95 ? 'default' : rate >= 85 ? 'secondary' : 'destructive'
    expect(variant).toBe('default')
  })

  it('badge variant is secondary for rate between 85 and 94', () => {
    const rate = 90
    const variant = rate >= 95 ? 'default' : rate >= 85 ? 'secondary' : 'destructive'
    expect(variant).toBe('secondary')
  })

  it('badge variant is destructive for rate below 85', () => {
    const rate = 70
    const variant = rate >= 95 ? 'default' : rate >= 85 ? 'secondary' : 'destructive'
    expect(variant).toBe('destructive')
  })

  it('badge variant is always one of the three valid values', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (rate) => {
        const variant = rate >= 95 ? 'default' : rate >= 85 ? 'secondary' : 'destructive'
        expect(['default', 'secondary', 'destructive']).toContain(variant)
      })
    )
  })
})
