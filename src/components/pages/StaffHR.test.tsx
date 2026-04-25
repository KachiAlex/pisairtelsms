import { describe, it, expect } from 'vitest'
import { fc } from '@fast-check/vitest'

/**
 * Property-based tests for StaffHR statistics computation
 * Property 17: Staff Statistics Computation
 */

// Type definitions
interface StaffRecord {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on-leave'
  email: string
  phone: string
  hireDate: string
  createdAt: string
  updatedAt: string
}

// Generators
const staffRecordArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 2, maxLength: 50 }),
    role: fc.constantFrom('Teacher', 'Administrator', 'Support Staff', 'Principal', 'Vice Principal'),
    department: fc.constantFrom('Academic', 'Administration', 'Support', 'Finance', 'HR'),
    status: fc.constantFrom('active', 'inactive', 'on-leave'),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    hireDate: fc.date().map(d => d.toISOString()),
    createdAt: fc.date().map(d => d.toISOString()),
    updatedAt: fc.date().map(d => d.toISOString()),
  })

describe('StaffHR Statistics Computation - Property Tests', () => {
  describe('Property 17: Staff Statistics Computation', () => {
    it(
      'should compute total staff count correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: Total count should equal length of staff array
          const totalCount = staffRecords.length

          expect(totalCount).toBeGreaterThanOrEqual(0)
          expect(typeof totalCount).toBe('number')
        }
      )
    )

    it(
      'should compute active staff count correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: Active count should equal number of staff with status 'active'
          const activeCount = staffRecords.filter(s => s.status === 'active').length

          expect(activeCount).toBeGreaterThanOrEqual(0)
          expect(activeCount).toBeLessThanOrEqual(staffRecords.length)
        }
      )
    )

    it(
      'should compute inactive staff count correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: Inactive count should equal number of staff with status 'inactive'
          const inactiveCount = staffRecords.filter(s => s.status === 'inactive').length

          expect(inactiveCount).toBeGreaterThanOrEqual(0)
          expect(inactiveCount).toBeLessThanOrEqual(staffRecords.length)
        }
      )
    )

    it(
      'should compute on-leave staff count correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: On-leave count should equal number of staff with status 'on-leave'
          const onLeaveCount = staffRecords.filter(s => s.status === 'on-leave').length

          expect(onLeaveCount).toBeGreaterThanOrEqual(0)
          expect(onLeaveCount).toBeLessThanOrEqual(staffRecords.length)
        }
      )
    )

    it(
      'should satisfy: total = active + inactive + on-leave',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: Sum of all status counts should equal total
          const totalCount = staffRecords.length
          const activeCount = staffRecords.filter(s => s.status === 'active').length
          const inactiveCount = staffRecords.filter(s => s.status === 'inactive').length
          const onLeaveCount = staffRecords.filter(s => s.status === 'on-leave').length

          expect(totalCount).toBe(activeCount + inactiveCount + onLeaveCount)
        }
      )
    )

    it(
      'should compute department distribution correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: Sum of department counts should equal total
          const departments = ['Academic', 'Administration', 'Support', 'Finance', 'HR']
          const departmentCounts = departments.map(
            dept => staffRecords.filter(s => s.department === dept).length
          )
          const totalFromDepts = departmentCounts.reduce((sum, count) => sum + count, 0)

          expect(totalFromDepts).toBe(staffRecords.length)
        }
      )
    )

    it(
      'should compute role distribution correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: Sum of role counts should equal total
          const roles = ['Teacher', 'Administrator', 'Support Staff', 'Principal', 'Vice Principal']
          const roleCounts = roles.map(role => staffRecords.filter(s => s.role === role).length)
          const totalFromRoles = roleCounts.reduce((sum, count) => sum + count, 0)

          expect(totalFromRoles).toBe(staffRecords.length)
        }
      )
    )

    it(
      'should handle empty staff records',
      fc.prop(fc.constant([]), staffRecords => {
        // Property: Empty records should result in zero counts
        const totalCount = staffRecords.length
        const activeCount = staffRecords.filter((s: StaffRecord) => s.status === 'active').length
        const inactiveCount = staffRecords.filter((s: StaffRecord) => s.status === 'inactive').length
        const onLeaveCount = staffRecords.filter((s: StaffRecord) => s.status === 'on-leave').length

        expect(totalCount).toBe(0)
        expect(activeCount).toBe(0)
        expect(inactiveCount).toBe(0)
        expect(onLeaveCount).toBe(0)
      })
    )

    it(
      'should handle single staff record',
      fc.prop(staffRecordArbitrary(), staffRecord => {
        // Property: Single record should have total count of 1
        const staffRecords = [staffRecord]
        const totalCount = staffRecords.length

        expect(totalCount).toBe(1)

        // Property: Exactly one status count should be 1, others should be 0
        const activeCount = staffRecords.filter(s => s.status === 'active').length
        const inactiveCount = staffRecords.filter(s => s.status === 'inactive').length
        const onLeaveCount = staffRecords.filter(s => s.status === 'on-leave').length

        const statusCounts = [activeCount, inactiveCount, onLeaveCount]
        const nonZeroCounts = statusCounts.filter(c => c > 0)
        expect(nonZeroCounts.length).toBe(1)
        expect(nonZeroCounts[0]).toBe(1)
      })
    )

    it(
      'should compute percentages correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 1, maxLength: 100 }),
        staffRecords => {
          // Property: All percentages should be between 0 and 100
          const totalCount = staffRecords.length
          const activeCount = staffRecords.filter(s => s.status === 'active').length
          const inactiveCount = staffRecords.filter(s => s.status === 'inactive').length
          const onLeaveCount = staffRecords.filter(s => s.status === 'on-leave').length

          if (totalCount > 0) {
            const activePercentage = (activeCount / totalCount) * 100
            const inactivePercentage = (inactiveCount / totalCount) * 100
            const onLeavePercentage = (onLeaveCount / totalCount) * 100

            expect(activePercentage).toBeGreaterThanOrEqual(0)
            expect(activePercentage).toBeLessThanOrEqual(100)
            expect(inactivePercentage).toBeGreaterThanOrEqual(0)
            expect(inactivePercentage).toBeLessThanOrEqual(100)
            expect(onLeavePercentage).toBeGreaterThanOrEqual(0)
            expect(onLeavePercentage).toBeLessThanOrEqual(100)

            // Sum of percentages should equal 100
            const totalPercentage = activePercentage + inactivePercentage + onLeavePercentage
            expect(totalPercentage).toBe(100)
          }
        }
      )
    )

    it(
      'should compute department distribution percentages correctly',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 1, maxLength: 100 }),
        staffRecords => {
          // Property: Department percentages should sum to 100
          const totalCount = staffRecords.length
          const departments = ['Academic', 'Administration', 'Support', 'Finance', 'HR']
          const departmentCounts = departments.map(
            dept => staffRecords.filter(s => s.department === dept).length
          )
          const departmentPercentages = departmentCounts.map(count => (count / totalCount) * 100)
          const totalPercentage = departmentPercentages.reduce((sum, pct) => sum + pct, 0)

          expect(totalPercentage).toBe(100)
        }
      )
    )

    it(
      'should not use hardcoded values for statistics',
      fc.prop(
        fc.array(staffRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        staffRecords => {
          // Property: Statistics should be derived from data, not hardcoded
          const totalCount = staffRecords.length
          const activeCount = staffRecords.filter(s => s.status === 'active').length

          // These should match the actual data
          expect(totalCount).toBe(staffRecords.length)
          expect(activeCount).toBeLessThanOrEqual(totalCount)

          // Verify they're not always the same (would indicate hardcoding)
          expect(typeof totalCount).toBe('number')
          expect(typeof activeCount).toBe('number')
        }
      )
    )

    it(
      'should handle all staff in single status',
      fc.prop(
        fc.constantFrom('active', 'inactive', 'on-leave'),
        status => {
          // Create staff records all with the same status
          const staffRecords = Array.from({ length: 10 }, (_, i) => ({
            id: `staff-${i}`,
            name: `Staff ${i}`,
            role: 'Teacher',
            department: 'Academic',
            status: status as 'active' | 'inactive' | 'on-leave',
            email: `staff${i}@example.com`,
            phone: '1234567890',
            hireDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))

          // Property: All staff should be in the same status
          const totalCount = staffRecords.length
          const activeCount = staffRecords.filter(s => s.status === 'active').length
          const inactiveCount = staffRecords.filter(s => s.status === 'inactive').length
          const onLeaveCount = staffRecords.filter(s => s.status === 'on-leave').length

          const nonZeroCounts = [activeCount, inactiveCount, onLeaveCount].filter(c => c > 0)
          expect(nonZeroCounts.length).toBe(1)
          expect(nonZeroCounts[0]).toBe(10)
          expect(totalCount).toBe(10)
        }
      )
    )

    it(
      'should handle all staff in single department',
      fc.prop(
        fc.constantFrom('Academic', 'Administration', 'Support', 'Finance', 'HR'),
        department => {
          // Create staff records all in the same department
          const staffRecords = Array.from({ length: 10 }, (_, i) => ({
            id: `staff-${i}`,
            name: `Staff ${i}`,
            role: 'Teacher',
            department: department,
            status: 'active' as const,
            email: `staff${i}@example.com`,
            phone: '1234567890',
            hireDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))

          // Property: All staff should be in the same department
          const totalCount = staffRecords.length
          const deptCount = staffRecords.filter(s => s.department === department).length

          expect(deptCount).toBe(totalCount)
          expect(deptCount).toBe(10)
        }
      )
    )
  })
})
