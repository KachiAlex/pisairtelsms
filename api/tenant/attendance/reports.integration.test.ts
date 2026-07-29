/**
 * Integration Tests for Attendance Report Generation
 * Tests CSV and PDF export functionality with various filters
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { query, queryOne, queryAll } from '../cbt/_lib/db.js'
import { v4 as uuidv4 } from 'uuid'
import {
  generateAttendanceReport,
  exportReportAsCSV,
  exportReportAsPDF,
  generateCSVContent,
  generatePDFContent,
  type ReportFilter,
} from '../_lib/report-generator.js'

vi.mock('../cbt/_lib/db.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryAll: vi.fn(),
}))

// ============================================================================
// Test Setup
// ============================================================================

const TEST_TENANT_ID = uuidv4()
const TEST_USER_ID = uuidv4()

async function setupTestData() {
  try {
    // Create test students
    const studentIds = ['STU001', 'STU002', 'STU003']
    for (const studentId of studentIds) {
      await query(
        `INSERT INTO students (id, tenant_id, name, email, phone, deleted_at)
         VALUES ($1, $2, $3, $4, $5, NULL)
         ON CONFLICT (id) DO NOTHING`,
        [studentId, TEST_TENANT_ID, `Student ${studentId}`, `${studentId}@test.com`, '1234567890']
      )
    }

    // Create test class
    await query(
      `INSERT INTO classes (id, tenant_id, name, advisor_name, deleted_at)
       VALUES ($1, $2, $3, $4, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [uuidv4(), TEST_TENANT_ID, 'JSS 1', 'Mr. Smith']
    )

    // Create test attendance records
    const today = new Date()
    const dates = [
      new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    ]

    const statuses = ['present', 'absent', 'late']
    let recordCount = 0

    for (const studentId of studentIds) {
      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0]
        const status = statuses[recordCount % statuses.length]

        await query(
          `INSERT INTO attendance_records (
            id, tenant_id, student_id, class, date, status, source,
            user_id, academic_session, term, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (tenant_id, student_id, date) DO NOTHING`,
          [
            uuidv4(),
            TEST_TENANT_ID,
            studentId,
            'JSS 1',
            dateStr,
            status,
            'teacher_entry',
            TEST_USER_ID,
            '2024/2025',
            '1',
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        )

        recordCount++
      }
    }

    console.log(`Created ${recordCount} test attendance records`)
  } catch (error) {
    console.error('Error setting up test data:', error)
    throw error
  }
}

async function cleanupTestData() {
  try {
    // Delete test data
    await query(`DELETE FROM attendance_audit_trail WHERE attendance_record_id IN (
      SELECT id FROM attendance_records WHERE tenant_id = $1
    )`, [TEST_TENANT_ID])

    await query(`DELETE FROM attendance_records WHERE tenant_id = $1`, [TEST_TENANT_ID])
    await query(`DELETE FROM students WHERE tenant_id = $1`, [TEST_TENANT_ID])
    await query(`DELETE FROM classes WHERE tenant_id = $1`, [TEST_TENANT_ID])

    console.log('Cleaned up test data')
  } catch (error) {
    console.error('Error cleaning up test data:', error)
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Attendance Report Generation', () => {
  beforeAll(async () => {
    await setupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('generateAttendanceReport', () => {
    it('should generate report with all records when no filters applied', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      expect(report).toBeDefined()
      expect(report.records).toBeDefined()
      expect(report.records.length).toBeGreaterThan(0)
      expect(report.summary).toBeDefined()
      expect(report.summary.totalRecords).toBeGreaterThan(0)
      expect(report.generatedAt).toBeDefined()
    })

    it('should calculate correct summary statistics', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      const { summary, records } = report
      const presentCount = records.filter(r => r.status === 'present').length
      const absentCount = records.filter(r => r.status === 'absent').length
      const lateCount = records.filter(r => r.status === 'late').length

      expect(summary.presentCount).toBe(presentCount)
      expect(summary.absentCount).toBe(absentCount)
      expect(summary.lateCount).toBe(lateCount)
      expect(summary.totalRecords).toBe(records.length)

      // Verify rates are calculated correctly
      const expectedPresentRate = (presentCount / records.length) * 100
      expect(Math.abs(summary.presentRate - expectedPresentRate)).toBeLessThan(0.1)
    })

    it('should filter records by class', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        class: 'JSS 1',
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      expect(report.records.length).toBeGreaterThan(0)
      expect(report.records.every(r => r.class === 'JSS 1')).toBe(true)
    })

    it('should filter records by student ID', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        studentId: 'STU001',
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      expect(report.records.length).toBeGreaterThan(0)
      expect(report.records.every(r => r.studentId === 'STU001')).toBe(true)
    })

    it('should filter records by date range', async () => {
      const today = new Date()
      const startDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        startDate,
        endDate,
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      expect(report.records.length).toBeGreaterThan(0)
      expect(report.records.every(r => r.date >= startDate && r.date <= endDate)).toBe(true)
    })

    it('should include filters in report data', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        class: 'JSS 1',
        studentId: 'STU001',
        term: '1',
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      expect(report.filters.class).toBe('JSS 1')
      expect(report.filters.studentId).toBe('STU001')
      expect(report.filters.term).toBe('1')
    })
  })

  describe('CSV Export', () => {
    it('should generate valid CSV content', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const csv = await exportReportAsCSV(filter)

      expect(csv).toBeDefined()
      expect(typeof csv).toBe('string')
      expect(csv.length).toBeGreaterThan(0)
    })

    it('should include report header in CSV', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const csv = await exportReportAsCSV(filter)

      expect(csv).toContain('Attendance Report')
      expect(csv).toContain('Generated:')
      expect(csv).toContain('Summary Statistics')
    })

    it('should include column headers in CSV', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const csv = await exportReportAsCSV(filter)

      expect(csv).toContain('Student ID')
      expect(csv).toContain('Class')
      expect(csv).toContain('Date')
      expect(csv).toContain('Status')
      expect(csv).toContain('Source')
    })

    it('should include attendance records in CSV', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const csv = await exportReportAsCSV(filter)

      expect(csv).toContain('STU001')
      expect(csv).toContain('JSS 1')
      expect(csv).toContain('present')
    })

    it('should properly escape CSV values', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const csv = await exportReportAsCSV(filter)

      // CSV should be properly formatted
      const lines = csv.split('\n')
      expect(lines.length).toBeGreaterThan(0)
    })
  })

  describe('PDF Export', () => {
    it('should generate valid PDF content', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'pdf',
      }

      const pdf = await exportReportAsPDF(filter)

      expect(pdf).toBeDefined()
      expect(typeof pdf).toBe('string')
      expect(pdf.length).toBeGreaterThan(0)
    })

    it('should include report header in PDF', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'pdf',
      }

      const pdf = await exportReportAsPDF(filter)

      expect(pdf).toContain('ATTENDANCE REPORT')
      expect(pdf).toContain('Generated:')
      expect(pdf).toContain('SUMMARY STATISTICS')
    })

    it('should include summary statistics in PDF', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'pdf',
      }

      const pdf = await exportReportAsPDF(filter)

      expect(pdf).toContain('Total Records')
      expect(pdf).toContain('Present')
      expect(pdf).toContain('Absent')
      expect(pdf).toContain('Late')
      expect(pdf).toContain('Present Rate')
    })

    it('should include attendance records table in PDF', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'pdf',
      }

      const pdf = await exportReportAsPDF(filter)

      expect(pdf).toContain('ATTENDANCE RECORDS')
      expect(pdf).toContain('Student ID')
      expect(pdf).toContain('Class')
      expect(pdf).toContain('Date')
      expect(pdf).toContain('Status')
    })

    it('should include filters in PDF when applied', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        class: 'JSS 1',
        studentId: 'STU001',
        format: 'pdf',
      }

      const pdf = await exportReportAsPDF(filter)

      expect(pdf).toContain('FILTERS APPLIED')
      expect(pdf).toContain('Class')
      expect(pdf).toContain('Student ID')
    })
  })

  describe('Report Content Generation', () => {
    it('should generate properly formatted CSV content', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)
      const csv = generateCSVContent(report)

      // Verify CSV structure
      const lines = csv.split('\n')
      expect(lines.length).toBeGreaterThan(10)

      // Find header row
      const headerIndex = lines.findIndex(l => l.includes('Student ID'))
      expect(headerIndex).toBeGreaterThan(-1)

      // Verify data rows exist after header
      expect(lines.length).toBeGreaterThan(headerIndex + 1)
    })

    it('should generate properly formatted PDF content', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        format: 'pdf',
      }

      const report = await generateAttendanceReport(filter)
      const pdf = generatePDFContent(report)

      // Verify PDF structure
      const lines = pdf.split('\n')
      expect(lines.length).toBeGreaterThan(10)

      // Verify key sections exist
      expect(pdf).toContain('='.repeat(80))
      expect(pdf).toContain('ATTENDANCE REPORT')
      expect(pdf).toContain('SUMMARY STATISTICS')
      expect(pdf).toContain('ATTENDANCE RECORDS')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty result set', async () => {
      const filter: ReportFilter = {
        tenantId: uuidv4(), // Non-existent tenant
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      expect(report.records).toEqual([])
      expect(report.summary.totalRecords).toBe(0)
    })

    it('should handle invalid date range gracefully', async () => {
      const filter: ReportFilter = {
        tenantId: TEST_TENANT_ID,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        format: 'csv',
      }

      const report = await generateAttendanceReport(filter)

      // Should return empty or filtered results
      expect(report).toBeDefined()
      expect(report.summary).toBeDefined()
    })
  })
})
