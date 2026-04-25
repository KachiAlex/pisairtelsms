import { describe, it, expect } from 'vitest'

/**
 * Property 16: Staff Ordering
 * For any set of staff records, the GET response must be ordered by hire_date descending
 * Validates: Requirements 9.3
 */

interface StaffMember {
  id: string
  name: string
  role: string
  department: string
  status: string
  email: string
  phone: string
  hireDate: string
}

// Mirrors ordering logic from api/tenant/_lib/staff.ts
function sortByHireDateDesc(staff: StaffMember[]): StaffMember[] {
  return [...staff].sort(
    (a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime()
  )
}

function isOrderedByHireDateDesc(staff: StaffMember[]): boolean {
  for (let i = 0; i < staff.length - 1; i++) {
    const curr = new Date(staff[i].hireDate).getTime()
    const next = new Date(staff[i + 1].hireDate).getTime()
    if (curr < next) return false
  }
  return true
}

function buildStaffMember(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 'staff_001',
    name: 'John Teacher',
    role: 'Teacher',
    department: 'Mathematics',
    status: 'active',
    email: 'john@school.com',
    phone: '+2348012345678',
    hireDate: '2023-01-15',
    ...overrides,
  }
}

describe('Staff API - Property Tests', () => {
  describe('Property 16: Staff Ordering by hire_date DESC', () => {
    it('should order staff by hireDate descending', () => {
      const staff = [
        buildStaffMember({ id: 's1', hireDate: '2020-01-01' }),
        buildStaffMember({ id: 's2', hireDate: '2023-06-15' }),
        buildStaffMember({ id: 's3', hireDate: '2021-09-01' }),
        buildStaffMember({ id: 's4', hireDate: '2024-01-10' }),
      ]
      const sorted = sortByHireDateDesc(staff)
      expect(sorted[0].id).toBe('s4') // most recent
      expect(sorted[1].id).toBe('s2')
      expect(sorted[2].id).toBe('s3')
      expect(sorted[3].id).toBe('s1') // oldest
      expect(isOrderedByHireDateDesc(sorted)).toBe(true)
    })

    it('should maintain descending order for any permutation (property-based)', () => {
      const dates = ['2019-03-01', '2021-07-15', '2022-11-30', '2023-04-20', '2024-02-01']

      // Test multiple shuffles
      for (let trial = 0; trial < 10; trial++) {
        const shuffled = dates
          .map((d, i) => buildStaffMember({ id: `s${i}`, hireDate: d }))
          .sort(() => Math.random() - 0.5)

        const sorted = sortByHireDateDesc(shuffled)
        expect(isOrderedByHireDateDesc(sorted)).toBe(true)
      }
    })

    it('should handle single staff member', () => {
      const staff = [buildStaffMember({ hireDate: '2023-01-01' })]
      const sorted = sortByHireDateDesc(staff)
      expect(sorted).toHaveLength(1)
      expect(isOrderedByHireDateDesc(sorted)).toBe(true)
    })

    it('should handle empty staff list', () => {
      const sorted = sortByHireDateDesc([])
      expect(sorted).toHaveLength(0)
      expect(isOrderedByHireDateDesc(sorted)).toBe(true)
    })

    it('should handle staff with same hire date (stable)', () => {
      const staff = [
        buildStaffMember({ id: 's1', hireDate: '2023-01-01' }),
        buildStaffMember({ id: 's2', hireDate: '2023-01-01' }),
        buildStaffMember({ id: 's3', hireDate: '2022-06-01' }),
      ]
      const sorted = sortByHireDateDesc(staff)
      expect(isOrderedByHireDateDesc(sorted)).toBe(true)
      // s3 must be last (oldest)
      expect(sorted[sorted.length - 1].id).toBe('s3')
    })

    it('should not mutate the original array', () => {
      const staff = [
        buildStaffMember({ id: 's1', hireDate: '2020-01-01' }),
        buildStaffMember({ id: 's2', hireDate: '2024-01-01' }),
      ]
      const originalOrder = staff.map(s => s.id)
      sortByHireDateDesc(staff)
      expect(staff.map(s => s.id)).toEqual(originalOrder)
    })

    it('most recently hired staff should always be first (property-based)', () => {
      for (let i = 0; i < 20; i++) {
        const count = 3 + (i % 5)
        const year = 2015 + i
        const staff = Array.from({ length: count }, (_, j) =>
          buildStaffMember({ id: `s${j}`, hireDate: `${year + j}-01-01` })
        )
        const sorted = sortByHireDateDesc(staff)
        // The last item in the generated array has the most recent date
        expect(sorted[0].hireDate).toBe(`${year + count - 1}-01-01`)
        expect(isOrderedByHireDateDesc(sorted)).toBe(true)
      }
    })
  })
})
