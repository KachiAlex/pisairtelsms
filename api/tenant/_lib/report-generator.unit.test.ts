/**
 * Unit Tests for Report Generator
 * Tests CSV and PDF content generation without database dependencies
 */

import { describe, it, expect } from 'vitest'
import {
  generateCSVContent,
  generatePDFContent,
  type ReportData,
} from './report-generator.js'

// ============================================================================
// Test Data
// ============================================================================

const mockReportData: ReportData = {
  records: [
    {
      id: '1',
      tenantId: 'tenant-1',
      studentId: 'STU001',
      class: 'JSS 1',
      date: '2024-05-01',
      status: 'present',
      source: 'teacher_entry',
      userId: 'user-1',
      academicSession: '2024/2025',
      term: '1',
      createdAt: '2024-05-01T10:00:00Z',
      updatedAt: '2024-05-01T10:00:00Z',
    },
    {
      id: '2',
      tenantId: 'tenant-1',
      studentId: 'STU002',
      class: 'JSS 1',
      date: '2024-05-01',
      status: 'absent',
      source: 'teacher_entry',
      userId: 'user-1',
      academicSession: '2024/2025',
      term: '1',
      createdAt: '2024-05-01T10:00:00Z',
      updatedAt: '2024-05-01T10:00:00Z',
    },
    {
      id: '3',
      tenantId: 'tenant-1',
      studentId: 'STU003',
      class: 'JSS 1',
      date: '2024-05-01',
      status: 'late',
      source: 'teacher_entry',
      userId: 'user-1',
      academicSession: '2024/2025',
      term: '1',
      createdAt: '2024-05-01T10:00:00Z',
      updatedAt: '2024-05-01T10:00:00Z',
    },
  ],
  summary: {
    totalRecords: 3,
    presentCount: 1,
    absentCount: 1,
    lateCount: 1,
    presentRate: 33.3,
    absentRate: 33.3,
    lateRate: 33.3,
  },
  generatedAt: '2024-05-01T12:00:00Z',
  filters: {
    class: 'JSS 1',
    term: '1',
  },
}

const emptyReportData: ReportData = {
  records: [],
  summary: {
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    presentRate: 0,
    absentRate: 0,
    lateRate: 0,
  },
  generatedAt: '2024-05-01T12:00:00Z',
  filters: {},
}

// ============================================================================
// CSV Generation Tests
// ============================================================================

describe('CSV Content Generation', () => {
  it('should generate CSV with header', () => {
    const csv = generateCSVContent(mockReportData)

    expect(csv).toContain('Attendance Report')
    expect(csv).toContain('Generated:')
  })

  it('should include summary statistics in CSV', () => {
    const csv = generateCSVContent(mockReportData)

    expect(csv).toContain('Summary Statistics')
    expect(csv).toContain('Total Records,3')
    expect(csv).toContain('Present,1')
    expect(csv).toContain('Absent,1')
    expect(csv).toContain('Late,1')
  })

  it('should include column headers', () => {
    const csv = generateCSVContent(mockReportData)

    expect(csv).toContain('Student ID')
    expect(csv).toContain('Class')
    expect(csv).toContain('Date')
    expect(csv).toContain('Status')
    expect(csv).toContain('Source')
    expect(csv).toContain('Academic Session')
    expect(csv).toContain('Term')
  })

  it('should include attendance records', () => {
    const csv = generateCSVContent(mockReportData)

    expect(csv).toContain('STU001')
    expect(csv).toContain('STU002')
    expect(csv).toContain('STU003')
    expect(csv).toContain('JSS 1')
    expect(csv).toContain('2024-05-01')
    expect(csv).toContain('present')
    expect(csv).toContain('absent')
    expect(csv).toContain('late')
  })

  it('should include filters when applied', () => {
    const csv = generateCSVContent(mockReportData)

    expect(csv).toContain('Filters Applied')
    expect(csv).toContain('Class,JSS 1')
    expect(csv).toContain('Term,1')
  })

  it('should handle empty records', () => {
    const csv = generateCSVContent(emptyReportData)

    expect(csv).toContain('Attendance Report')
    expect(csv).toContain('Total Records,0')
    expect(csv).toContain('Student ID')
  })

  it('should properly escape CSV values with commas', () => {
    const dataWithCommas: ReportData = {
      ...mockReportData,
      records: [
        {
          ...mockReportData.records[0],
          class: 'JSS 1, Section A',
        },
      ],
    }

    const csv = generateCSVContent(dataWithCommas)

    // Should be quoted because it contains a comma
    expect(csv).toContain('"JSS 1, Section A"')
  })

  it('should properly escape CSV values with quotes', () => {
    const dataWithQuotes: ReportData = {
      ...mockReportData,
      records: [
        {
          ...mockReportData.records[0],
          class: 'JSS "1"',
        },
      ],
    }

    const csv = generateCSVContent(dataWithQuotes)

    // Quotes should be escaped
    expect(csv).toContain('JSS ""1""')
  })

  it('should be valid CSV format', () => {
    const csv = generateCSVContent(mockReportData)

    const lines = csv.split('\n')
    expect(lines.length).toBeGreaterThan(0)

    // Find header row
    const headerIndex = lines.findIndex(l => l.includes('Student ID'))
    expect(headerIndex).toBeGreaterThan(-1)

    // Verify data rows exist
    expect(lines.length).toBeGreaterThan(headerIndex + 1)
  })
})

// ============================================================================
// PDF Content Generation Tests
// ============================================================================

describe('PDF Content Generation', () => {
  it('should generate PDF with header', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('ATTENDANCE REPORT')
    expect(pdf).toContain('Generated:')
  })

  it('should include summary statistics section', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('SUMMARY STATISTICS')
    expect(pdf).toContain('Total Records')
    expect(pdf).toContain('Present')
    expect(pdf).toContain('Absent')
    expect(pdf).toContain('Late')
  })

  it('should include attendance rates', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('Present Rate')
    expect(pdf).toContain('Absent Rate')
    expect(pdf).toContain('Late Rate')
  })

  it('should include filters section when filters applied', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('FILTERS APPLIED')
    expect(pdf).toContain('Class')
    expect(pdf).toContain('Term')
  })

  it('should include attendance records table', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('ATTENDANCE RECORDS')
    expect(pdf).toContain('Student ID')
    expect(pdf).toContain('Class')
    expect(pdf).toContain('Date')
    expect(pdf).toContain('Status')
    expect(pdf).toContain('Source')
  })

  it('should include record data in table', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('STU001')
    expect(pdf).toContain('STU002')
    expect(pdf).toContain('STU003')
    expect(pdf).toContain('present')
    expect(pdf).toContain('absent')
    expect(pdf).toContain('late')
  })

  it('should have proper formatting with separators', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('='.repeat(80))
    expect(pdf).toContain('-'.repeat(80))
  })

  it('should include end of report marker', () => {
    const pdf = generatePDFContent(mockReportData)

    expect(pdf).toContain('End of Report')
  })

  it('should handle empty records', () => {
    const pdf = generatePDFContent(emptyReportData)

    expect(pdf).toContain('ATTENDANCE REPORT')
    expect(pdf).toContain('Total Records')
    expect(pdf).toContain('ATTENDANCE RECORDS')
  })

  it('should not include filters section when no filters applied', () => {
    const pdf = generatePDFContent(emptyReportData)

    // Should not have filters section if no filters
    const filterIndex = pdf.indexOf('FILTERS APPLIED')
    expect(filterIndex).toBe(-1)
  })

  it('should format data as readable text', () => {
    const pdf = generatePDFContent(mockReportData)

    const lines = pdf.split('\n')
    expect(lines.length).toBeGreaterThan(10)

    // Verify structure
    expect(lines[0]).toContain('=')
    expect(lines[lines.length - 1]).toContain('=')
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Report Content Consistency', () => {
  it('should have matching record counts in CSV and PDF', () => {
    const csv = generateCSVContent(mockReportData)
    const pdf = generatePDFContent(mockReportData)

    // Both should contain the same student IDs
    expect(csv).toContain('STU001')
    expect(pdf).toContain('STU001')
    expect(csv).toContain('STU002')
    expect(pdf).toContain('STU002')
  })

  it('should have matching summary statistics in CSV and PDF', () => {
    const csv = generateCSVContent(mockReportData)
    const pdf = generatePDFContent(mockReportData)

    // Both should contain the same statistics
    expect(csv).toContain('Total Records,3')
    expect(pdf).toContain('Total Records')
    expect(csv).toContain('Present,1')
    expect(pdf).toContain('Present')
  })

  it('should include all filters in both formats', () => {
    const csv = generateCSVContent(mockReportData)
    const pdf = generatePDFContent(mockReportData)

    expect(csv).toContain('Class,JSS 1')
    expect(pdf).toContain('Class')
    expect(csv).toContain('Term,1')
    expect(pdf).toContain('Term')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle records with missing optional fields', () => {
    const dataWithMissingFields: ReportData = {
      ...mockReportData,
      records: [
        {
          ...mockReportData.records[0],
          absenceReasonId: undefined,
          deviceId: undefined,
        },
      ],
    }

    const csv = generateCSVContent(dataWithMissingFields)
    const pdf = generatePDFContent(dataWithMissingFields)

    expect(csv).toBeDefined()
    expect(pdf).toBeDefined()
  })

  it('should handle very long student names', () => {
    const longName = 'A'.repeat(100)
    const dataWithLongName: ReportData = {
      ...mockReportData,
      records: [
        {
          ...mockReportData.records[0],
          studentId: longName,
        },
      ],
    }

    const csv = generateCSVContent(dataWithLongName)
    const pdf = generatePDFContent(dataWithLongName)

    expect(csv).toContain(longName)
    expect(pdf).toBeDefined()
  })

  it('should handle special characters in data', () => {
    const dataWithSpecialChars: ReportData = {
      ...mockReportData,
      records: [
        {
          ...mockReportData.records[0],
          class: 'JSS 1 & 2',
        },
      ],
    }

    const csv = generateCSVContent(dataWithSpecialChars)
    const pdf = generatePDFContent(dataWithSpecialChars)

    expect(csv).toContain('&')
    expect(pdf).toContain('&')
  })

  it('should handle large number of records', () => {
    const largeData: ReportData = {
      ...mockReportData,
      records: Array.from({ length: 1000 }, (_, i) => ({
        ...mockReportData.records[0],
        id: `${i}`,
        studentId: `STU${String(i).padStart(4, '0')}`,
      })),
      summary: {
        ...mockReportData.summary,
        totalRecords: 1000,
      },
    }

    const csv = generateCSVContent(largeData)
    const pdf = generatePDFContent(largeData)

    expect(csv.length).toBeGreaterThan(10000)
    expect(pdf.length).toBeGreaterThan(10000)
  })
})
