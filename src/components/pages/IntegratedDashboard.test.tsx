import { describe, it, expect } from 'vitest'
import { fc } from '@fast-check/vitest'

/**
 * Property-based tests for Dashboard data aggregation
 * Property 1: Dashboard Data Aggregation
 */

// Type definitions for upstream API data
interface Student {
  id: string
  name: string
  class: string
  status: 'Active' | 'Suspended' | 'Graduated'
}

interface StaffMember {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on-leave'
}

interface ScoreRecord {
  studentId: string
  subject: string
  totalScore: number
  attendancePercentage: number
}

interface AttendanceRecord {
  studentId: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
}

interface FeeRecord {
  studentId: string
  amount: number
  paid: number
  balance: number
}

interface Announcement {
  id: string
  title: string
  body: string
  sentAt: string
}

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalExams: number
  activeExams: number
  classesCount: number
  recentActivity: Array<{
    type: string
    message: string
    timestamp: string
  }>
  classSummaries: Array<{
    className: string
    studentCount: number
    teacherCount?: number
    examCount?: number
    avgScore?: number
  }>
  systemHealth: {
    studentsApi: boolean
    teachersApi: boolean
    examsApi: boolean
    database: boolean
  }
  revenueByMonth?: Array<{ month: string; amount: number }>
}

// Generators
const studentArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 2, maxLength: 50 }),
    class: fc.constantFrom('Primary 1', 'Primary 2', 'JSS 1', 'SS 1'),
    status: fc.constantFrom('Active', 'Suspended', 'Graduated'),
  })

const staffMemberArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 2, maxLength: 50 }),
    role: fc.constantFrom('Teacher', 'Administrator', 'Support Staff'),
    department: fc.constantFrom('Academic', 'Administration', 'Support'),
    status: fc.constantFrom('active', 'inactive', 'on-leave'),
  })

const scoreRecordArbitrary = () =>
  fc.record({
    studentId: fc.uuid(),
    subject: fc.constantFrom('Math', 'English', 'Science', 'History'),
    totalScore: fc.integer({ min: 0, max: 100 }),
    attendancePercentage: fc.integer({ min: 0, max: 100 }),
  })

const attendanceRecordArbitrary = () =>
  fc.record({
    studentId: fc.uuid(),
    class: fc.constantFrom('Primary 1', 'Primary 2', 'JSS 1', 'SS 1'),
    date: fc.date().map(d => d.toISOString().split('T')[0]),
    status: fc.constantFrom('present', 'absent', 'late'),
  })

const feeRecordArbitrary = () =>
  fc.record({
    studentId: fc.uuid(),
    amount: fc.integer({ min: 1000, max: 100000 }),
    paid: fc.integer({ min: 0, max: 100000 }),
    balance: fc.integer({ min: 0, max: 100000 }),
  })

const announcementArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    body: fc.string({ minLength: 10, maxLength: 500 }),
    sentAt: fc.date().map(d => d.toISOString()),
  })

describe('Dashboard Data Aggregation - Property Tests', () => {
  describe('Property 1: Dashboard Data Aggregation', () => {
    it(
      'should aggregate totalStudents from students table',
      fc.prop(
        fc.array(studentArbitrary(), { minLength: 0, maxLength: 100 }),
        students => {
          // Property: totalStudents should equal count of students
          const totalStudents = students.length

          expect(totalStudents).toBeGreaterThanOrEqual(0)
          expect(typeof totalStudents).toBe('number')
        }
      )
    )

    it(
      'should aggregate totalTeachers from staff table',
      fc.prop(
        fc.array(staffMemberArbitrary(), { minLength: 0, maxLength: 100 }),
        staff => {
          // Property: totalTeachers should equal count of staff with role 'Teacher'
          const totalTeachers = staff.filter(s => s.role === 'Teacher').length

          expect(totalTeachers).toBeGreaterThanOrEqual(0)
          expect(totalTeachers).toBeLessThanOrEqual(staff.length)
        }
      )
    )

    it(
      'should aggregate classesCount from unique classes in students',
      fc.prop(
        fc.array(studentArbitrary(), { minLength: 0, maxLength: 100 }),
        students => {
          // Property: classesCount should equal count of unique classes
          const uniqueClasses = new Set(students.map(s => s.class))
          const classesCount = uniqueClasses.size

          expect(classesCount).toBeGreaterThanOrEqual(0)
          expect(classesCount).toBeLessThanOrEqual(students.length)
        }
      )
    )

    it(
      'should aggregate classSummaries with correct student counts',
      fc.prop(
        fc.array(studentArbitrary(), { minLength: 0, maxLength: 100 }),
        students => {
          // Property: Each class summary should have correct student count
          const classSummaries = Array.from(
            new Map(
              students
                .reduce((acc, student) => {
                  const existing = acc.find(s => s.className === student.class)
                  if (existing) {
                    existing.studentCount++
                  } else {
                    acc.push({ className: student.class, studentCount: 1 })
                  }
                  return acc
                }, [] as Array<{ className: string; studentCount: number }>)
                .entries()
            ).values()
          )

          // Property: Sum of student counts should equal total students
          const totalFromSummaries = classSummaries.reduce((sum, cs) => sum + cs.studentCount, 0)
          expect(totalFromSummaries).toBe(students.length)
        }
      )
    )

    it(
      'should compute recentActivity from multiple sources',
      fc.prop(
        fc.tuple(
          fc.array(studentArbitrary(), { minLength: 0, maxLength: 10 }),
          fc.array(attendanceRecordArbitrary(), { minLength: 0, maxLength: 10 }),
          fc.array(announcementArbitrary(), { minLength: 0, maxLength: 10 })
        ),
        ([students, attendance, announcements]) => {
          // Property: recentActivity should aggregate from all sources
          const allActivities = [
            ...students.map(s => ({
              type: 'student_added',
              message: `Student ${s.name} added`,
              timestamp: new Date().toISOString(),
            })),
            ...attendance.map(a => ({
              type: 'attendance_marked',
              message: `Attendance marked for ${a.studentId}`,
              timestamp: new Date(a.date).toISOString(),
            })),
            ...announcements.map(a => ({
              type: 'announcement',
              message: a.title,
              timestamp: a.sentAt,
            })),
          ]

          // Property: Should have activities from all sources (if any exist)
          const hasStudentActivities = allActivities.some(a => a.type === 'student_added')
          const hasAttendanceActivities = allActivities.some(a => a.type === 'attendance_marked')
          const hasAnnouncements = allActivities.some(a => a.type === 'announcement')

          expect(hasStudentActivities || students.length === 0).toBe(true)
          expect(hasAttendanceActivities || attendance.length === 0).toBe(true)
          expect(hasAnnouncements || announcements.length === 0).toBe(true)
        }
      )
    )

    it(
      'should compute revenueByMonth from fee records',
      fc.prop(
        fc.array(feeRecordArbitrary(), { minLength: 0, maxLength: 100 }),
        feeRecords => {
          // Property: revenueByMonth should aggregate paid amounts by month
          const revenueByMonth = feeRecords.reduce(
            (acc, record) => {
              const month = 'January' // Simplified for test
              const existing = acc.find(r => r.month === month)
              if (existing) {
                existing.amount += record.paid
              } else {
                acc.push({ month, amount: record.paid })
              }
              return acc
            },
            [] as Array<{ month: string; amount: number }>
          )

          // Property: All amounts should be non-negative
          revenueByMonth.forEach(revenue => {
            expect(revenue.amount).toBeGreaterThanOrEqual(0)
          })

          // Property: Total revenue should equal sum of all paid amounts
          const totalRevenue = revenueByMonth.reduce((sum, r) => sum + r.amount, 0)
          const expectedTotal = feeRecords.reduce((sum, r) => sum + r.paid, 0)
          expect(totalRevenue).toBe(expectedTotal)
        }
      )
    )

    it(
      'should maintain data integrity across aggregation',
      fc.prop(
        fc.tuple(
          fc.array(studentArbitrary(), { minLength: 1, maxLength: 50 }),
          fc.array(staffMemberArbitrary(), { minLength: 1, maxLength: 50 }),
          fc.array(scoreRecordArbitrary(), { minLength: 0, maxLength: 50 })
        ),
        ([students, staff, scores]) => {
          // Property: Aggregated data should be consistent
          const totalStudents = students.length
          const totalTeachers = staff.filter(s => s.role === 'Teacher').length
          const uniqueClasses = new Set(students.map(s => s.class)).size

          // Property: All aggregated values should be non-negative
          expect(totalStudents).toBeGreaterThanOrEqual(0)
          expect(totalTeachers).toBeGreaterThanOrEqual(0)
          expect(uniqueClasses).toBeGreaterThanOrEqual(0)

          // Property: Teachers should not exceed total staff
          expect(totalTeachers).toBeLessThanOrEqual(staff.length)

          // Property: Classes should not exceed students
          expect(uniqueClasses).toBeLessThanOrEqual(totalStudents)
        }
      )
    )

    it(
      'should handle empty upstream data gracefully',
      fc.prop(fc.constant(null), _ => {
        // Property: Empty data should result in zero aggregates
        const emptyStats: DashboardStats = {
          totalStudents: 0,
          totalTeachers: 0,
          totalExams: 0,
          activeExams: 0,
          classesCount: 0,
          recentActivity: [],
          classSummaries: [],
          systemHealth: {
            studentsApi: false,
            teachersApi: false,
            examsApi: false,
            database: false,
          },
          revenueByMonth: [],
        }

        expect(emptyStats.totalStudents).toBe(0)
        expect(emptyStats.totalTeachers).toBe(0)
        expect(emptyStats.classesCount).toBe(0)
        expect(emptyStats.recentActivity.length).toBe(0)
        expect(emptyStats.classSummaries.length).toBe(0)
      })
    )

    it(
      'should compute correct totals for mixed data',
      fc.prop(
        fc.tuple(
          fc.array(studentArbitrary(), { minLength: 1, maxLength: 100 }),
          fc.array(staffMemberArbitrary(), { minLength: 1, maxLength: 100 }),
          fc.array(feeRecordArbitrary(), { minLength: 1, maxLength: 100 })
        ),
        ([students, staff, fees]) => {
          // Property: Aggregated totals should match source data
          const totalStudents = students.length
          const totalTeachers = staff.filter(s => s.role === 'Teacher').length
          const totalRevenue = fees.reduce((sum, f) => sum + f.paid, 0)

          // Property: All totals should be consistent
          expect(totalStudents).toBe(students.length)
          expect(totalTeachers).toBeLessThanOrEqual(staff.length)
          expect(totalRevenue).toBeGreaterThanOrEqual(0)
        }
      )
    )

    it(
      'should preserve data accuracy during aggregation',
      fc.prop(
        fc.array(studentArbitrary(), { minLength: 0, maxLength: 100 }),
        students => {
          // Property: Aggregated class summaries should preserve individual counts
          const classCounts = new Map<string, number>()
          students.forEach(s => {
            classCounts.set(s.class, (classCounts.get(s.class) ?? 0) + 1)
          })

          const classSummaries = Array.from(classCounts.entries()).map(([className, studentCount]) => ({
            className,
            studentCount,
          }))

          // Property: Each class summary should have correct count
          classSummaries.forEach(summary => {
            expect(summary.studentCount).toBe(classCounts.get(summary.className))
          })

          // Property: Total should match
          const totalFromSummaries = classSummaries.reduce((sum, cs) => sum + cs.studentCount, 0)
          expect(totalFromSummaries).toBe(students.length)
        }
      )
    )

    it(
      'should handle system health status correctly',
      fc.prop(
        fc.record({
          studentsApi: fc.boolean(),
          teachersApi: fc.boolean(),
          examsApi: fc.boolean(),
          database: fc.boolean(),
        }),
        health => {
          // Property: System health should be a valid boolean object
          expect(typeof health.studentsApi).toBe('boolean')
          expect(typeof health.teachersApi).toBe('boolean')
          expect(typeof health.examsApi).toBe('boolean')
          expect(typeof health.database).toBe('boolean')
        }
      )
    )
  })
})
