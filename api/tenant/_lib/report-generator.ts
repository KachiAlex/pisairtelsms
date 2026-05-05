/**
 * Attendance Report Generator
 * Handles CSV and PDF export of attendance records with filtering and formatting
 * Validates: Requirements 21
 */

import { fetchAttendance, getGlobalAuditTrail, type AttendanceRecord, type AttendanceFilter } from './attendance.js'
import { queryOne } from '../cbt/_lib/db.js'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ReportFilter {
  tenantId: string
  startDate?: string
  endDate?: string
  class?: string
  studentId?: string
  term?: string
  format: 'csv' | 'pdf'
}

export interface ReportData {
  records: AttendanceRecord[]
  summary: {
    totalRecords: number
    presentCount: number
    absentCount: number
    lateCount: number
    presentRate: number
    absentRate: number
    lateRate: number
  }
  generatedAt: string
  filters: Partial<ReportFilter>
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Generate CSV content from attendance records
 * Includes all attendance fields and summary statistics
 */
export function generateCSVContent(reportData: ReportData): string {
  const lines: string[] = []

  // Add header with report metadata
  lines.push('Attendance Report')
  lines.push(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`)
  lines.push('')

  // Add summary statistics
  lines.push('Summary Statistics')
  lines.push(`Total Records,${reportData.summary.totalRecords}`)
  lines.push(`Present,${reportData.summary.presentCount}`)
  lines.push(`Absent,${reportData.summary.absentCount}`)
  lines.push(`Late,${reportData.summary.lateCount}`)
  lines.push(`Present Rate,${reportData.summary.presentRate.toFixed(1)}%`)
  lines.push(`Absent Rate,${reportData.summary.absentRate.toFixed(1)}%`)
  lines.push(`Late Rate,${reportData.summary.lateRate.toFixed(1)}%`)
  lines.push('')

  // Add filters applied
  if (Object.keys(reportData.filters).length > 0) {
    lines.push('Filters Applied')
    if (reportData.filters.startDate) lines.push(`Start Date,${reportData.filters.startDate}`)
    if (reportData.filters.endDate) lines.push(`End Date,${reportData.filters.endDate}`)
    if (reportData.filters.class) lines.push(`Class,${reportData.filters.class}`)
    if (reportData.filters.studentId) lines.push(`Student ID,${reportData.filters.studentId}`)
    if (reportData.filters.term) lines.push(`Term,${reportData.filters.term}`)
    lines.push('')
  }

  // Add column headers
  const headers = [
    'Student ID',
    'Class',
    'Date',
    'Status',
    'Absence Reason ID',
    'Source',
    'Device ID',
    'Academic Session',
    'Term',
    'Created At',
    'Updated At',
  ]
  lines.push(escapeCSVLine(headers))

  // Add data rows
  for (const record of reportData.records) {
    const row = [
      record.studentId,
      record.class,
      record.date,
      record.status,
      record.absenceReasonId || '',
      record.source,
      record.deviceId || '',
      record.academicSession,
      record.term,
      record.createdAt,
      record.updatedAt,
    ]
    lines.push(escapeCSVLine(row))
  }

  return lines.join('\n')
}

/**
 * Escape CSV line values and join with commas
 */
function escapeCSVLine(values: (string | number | undefined)[]): string {
  return values
    .map(v => {
      const str = String(v || '')
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"` 
      }
      return str
    })
    .join(',')
}

// ============================================================================
// PDF Export (Text-based, no external library)
// ============================================================================

/**
 * Generate PDF content as plain text formatted for PDF output
 * Since pdfkit is not available, we'll generate a formatted text document
 * that can be converted to PDF by the client or a separate service
 */
export function generatePDFContent(reportData: ReportData): string {
  const lines: string[] = []
  const pageWidth = 80
  const separator = '='.repeat(pageWidth)

  // Header
  lines.push(separator)
  lines.push(centerText('ATTENDANCE REPORT', pageWidth))
  lines.push(centerText(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, pageWidth))
  lines.push(separator)
  lines.push('')

  // Summary Statistics Section
  lines.push('SUMMARY STATISTICS')
  lines.push('-'.repeat(pageWidth))
  lines.push(formatKeyValue('Total Records', reportData.summary.totalRecords.toString(), pageWidth))
  lines.push(formatKeyValue('Present', reportData.summary.presentCount.toString(), pageWidth))
  lines.push(formatKeyValue('Absent', reportData.summary.absentCount.toString(), pageWidth))
  lines.push(formatKeyValue('Late', reportData.summary.lateCount.toString(), pageWidth))
  lines.push('')
  lines.push(formatKeyValue('Present Rate', `${reportData.summary.presentRate.toFixed(1)}%`, pageWidth))
  lines.push(formatKeyValue('Absent Rate', `${reportData.summary.absentRate.toFixed(1)}%`, pageWidth))
  lines.push(formatKeyValue('Late Rate', `${reportData.summary.lateRate.toFixed(1)}%`, pageWidth))
  lines.push('')

  // Filters Applied Section
  if (Object.keys(reportData.filters).length > 0) {
    lines.push('FILTERS APPLIED')
    lines.push('-'.repeat(pageWidth))
    if (reportData.filters.startDate) {
      lines.push(formatKeyValue('Start Date', reportData.filters.startDate, pageWidth))
    }
    if (reportData.filters.endDate) {
      lines.push(formatKeyValue('End Date', reportData.filters.endDate, pageWidth))
    }
    if (reportData.filters.class) {
      lines.push(formatKeyValue('Class', reportData.filters.class, pageWidth))
    }
    if (reportData.filters.studentId) {
      lines.push(formatKeyValue('Student ID', reportData.filters.studentId, pageWidth))
    }
    if (reportData.filters.term) {
      lines.push(formatKeyValue('Term', reportData.filters.term, pageWidth))
    }
    lines.push('')
  }

  // Attendance Records Section
  lines.push('ATTENDANCE RECORDS')
  lines.push('-'.repeat(pageWidth))
  lines.push('')

  // Table header
  const colWidths = [12, 10, 12, 10, 15, 12]
  const headers = ['Student ID', 'Class', 'Date', 'Status', 'Source', 'Created At']
  lines.push(formatTableRow(headers, colWidths))
  lines.push('-'.repeat(pageWidth))

  // Table rows
  for (const record of reportData.records) {
    const row = [
      record.studentId,
      record.class,
      record.date,
      record.status,
      record.source,
      record.createdAt.split('T')[0], // Just the date part
    ]
    lines.push(formatTableRow(row, colWidths))
  }

  lines.push('')
  lines.push(separator)
  lines.push(centerText('End of Report', pageWidth))
  lines.push(separator)

  return lines.join('\n')
}

/**
 * Center text within a given width
 */
function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(padding) + text
}

/**
 * Format key-value pair for display
 */
function formatKeyValue(key: string, value: string, width: number): string {
  const separator = ': '
  const availableWidth = width - key.length - separator.length
  const paddedValue = value.padEnd(availableWidth)
  return key + separator + paddedValue
}

/**
 * Format table row with column widths
 */
function formatTableRow(values: string[], colWidths: number[]): string {
  return values
    .map((v, i) => {
      const width = colWidths[i] || 10
      return (v || '').substring(0, width).padEnd(width)
    })
    .join(' ')
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate attendance report with filtering and formatting
 * Validates: Requirements 21
 */
export async function generateAttendanceReport(filters: ReportFilter): Promise<ReportData> {
  try {
    const {
      tenantId,
      startDate,
      endDate,
      class: className,
      studentId,
      term,
    } = filters

    // Fetch attendance records with filters
    const attendanceFilters: AttendanceFilter = {
      tenantId,
      startDate,
      endDate,
      class: className,
      studentId,
      term,
      limit: 10000, // Get all records for report
      offset: 0,
    }

    const result = await fetchAttendance(attendanceFilters)
    const records = result.records

    // Calculate summary statistics
    const presentCount = records.filter(r => r.status === 'present').length
    const absentCount = records.filter(r => r.status === 'absent').length
    const lateCount = records.filter(r => r.status === 'late').length
    const totalRecords = records.length

    const summary = {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      presentRate: totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0,
      absentRate: totalRecords > 0 ? (absentCount / totalRecords) * 100 : 0,
      lateRate: totalRecords > 0 ? (lateCount / totalRecords) * 100 : 0,
    }

    return {
      records,
      summary,
      generatedAt: new Date().toISOString(),
      filters: {
        startDate,
        endDate,
        class: className,
        studentId,
        term,
      },
    }
  } catch (error) {
    console.error('Error generating attendance report:', error)
    throw new Error('Failed to generate attendance report')
  }
}

/**
 * Export report to CSV format
 */
export async function exportReportAsCSV(filters: ReportFilter): Promise<string> {
  try {
    const reportData = await generateAttendanceReport(filters)
    return generateCSVContent(reportData)
  } catch (error) {
    console.error('Error exporting report as CSV:', error)
    throw new Error('Failed to export report as CSV')
  }
}

/**
 * Export report to PDF format (text-based)
 */
export async function exportReportAsPDF(filters: ReportFilter): Promise<string> {
  try {
    const reportData = await generateAttendanceReport(filters)
    return generatePDFContent(reportData)
  } catch (error) {
    console.error('Error exporting report as PDF:', error)
    throw new Error('Failed to export report as PDF')
  }
}

/**
 * Get report with specified format
 */
export async function getReport(filters: ReportFilter): Promise<string> {
  if (filters.format === 'csv') {
    return exportReportAsCSV(filters)
  } else if (filters.format === 'pdf') {
    return exportReportAsPDF(filters)
  } else {
    throw new Error('Invalid report format. Must be csv or pdf.')
  }
}
