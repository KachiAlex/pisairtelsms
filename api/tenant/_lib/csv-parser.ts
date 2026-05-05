/**
 * CSV Parser for Attendance Batch Upload
 * Parses and validates CSV files for bulk attendance import
 */

export interface CsvAttendanceRecord {
  studentId: string
  class: string
  date: string
  status: string
  academicSession: string
  term: string
  absenceReason?: string
}

export interface CsvRowError {
  row: number
  field: string
  message: string
  data?: string
}

export interface CsvParseResult {
  valid: CsvAttendanceRecord[]
  errors: CsvRowError[]
  totalRows: number
}

const REQUIRED_COLUMNS = ['studentId', 'class', 'date', 'status', 'academicSession', 'term']
const VALID_STATUSES = ['present', 'absent', 'late']

/**
 * Parse CSV text content into attendance records
 */
export function parseCsvContent(csvText: string): CsvParseResult {
  const result: CsvParseResult = {
    valid: [],
    errors: [],
    totalRows: 0,
  }

  // Split into lines, handle both \r\n and \n
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  if (lines.length < 2) {
    result.errors.push({ row: 0, field: 'file', message: 'CSV file is empty or has no data rows' })
    return result
  }

  // Parse header row
  const headerLine = lines[0].trim()
  if (!headerLine) {
    result.errors.push({ row: 0, field: 'header', message: 'CSV header row is empty' })
    return result
  }

  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))

  // Validate required columns exist
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missingColumns.length > 0) {
    result.errors.push({
      row: 0,
      field: 'header',
      message: `Missing required columns: ${missingColumns.join(', ')}. Required: ${REQUIRED_COLUMNS.join(', ')}`,
    })
    return result
  }

  // Get column indices
  const colIndex = (name: string) => headers.indexOf(name)

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    result.totalRows++
    const rowNum = i + 1

    // Parse CSV row (handle quoted values)
    const values = parseCsvRow(line)

    if (values.length < REQUIRED_COLUMNS.length) {
      result.errors.push({
        row: rowNum,
        field: 'row',
        message: `Row has ${values.length} columns, expected at least ${REQUIRED_COLUMNS.length}`,
        data: line,
      })
      continue
    }

    const getValue = (col: string) => {
      const idx = colIndex(col)
      return idx >= 0 ? (values[idx] || '').trim() : ''
    }

    const studentId = getValue('studentId')
    const className = getValue('class')
    const date = getValue('date')
    const status = getValue('status').toLowerCase()
    const academicSession = getValue('academicSession')
    const term = getValue('term')
    const absenceReason = getValue('absenceReason') || undefined

    // Validate required fields and collect per-field errors
    const rowErrors: CsvRowError[] = []

    if (!studentId) rowErrors.push({ row: rowNum, field: 'studentId', message: 'studentId is required', data: line })
    if (!className) rowErrors.push({ row: rowNum, field: 'class', message: 'class is required', data: line })
    if (!date) rowErrors.push({ row: rowNum, field: 'date', message: 'date is required', data: line })
    if (!status) rowErrors.push({ row: rowNum, field: 'status', message: 'status is required', data: line })
    if (!academicSession) rowErrors.push({ row: rowNum, field: 'academicSession', message: 'academicSession is required', data: line })
    if (!term) rowErrors.push({ row: rowNum, field: 'term', message: 'term is required', data: line })

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      rowErrors.push({
        row: rowNum,
        field: 'status',
        message: `status must be one of: ${VALID_STATUSES.join(', ')} (got: ${status})`,
        data: line,
      })
    }

    // Validate date format
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      rowErrors.push({
        row: rowNum,
        field: 'date',
        message: `date must be in YYYY-MM-DD format (got: ${date})`,
        data: line,
      })
    }

    // Validate date is not in future
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const recordDate = new Date(date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (recordDate > today) {
        rowErrors.push({
          row: rowNum,
          field: 'date',
          message: `date cannot be in the future (got: ${date})`,
          data: line,
        })
      }
    }

    // Validate academic session format
    if (academicSession && !/^\d{4}\/\d{4}$/.test(academicSession)) {
      rowErrors.push({
        row: rowNum,
        field: 'academicSession',
        message: `academicSession must be in YYYY/YYYY format (got: ${academicSession})`,
        data: line,
      })
    }

    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors)
      continue
    }

    result.valid.push({
      studentId,
      class: className,
      date,
      status: status as 'present' | 'absent' | 'late',
      academicSession,
      term,
      absenceReason,
    })
  }

  return result
}

/**
 * Parse a single CSV row, handling quoted values
 */
function parseCsvRow(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

/**
 * Generate a sample CSV template for download
 */
export function generateCsvTemplate(): string {
  const headers = [...REQUIRED_COLUMNS, 'absenceReason']
  const sampleRow = [
    'STU001',
    'JSS 1',
    new Date().toISOString().split('T')[0],
    'present',
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    '1',
    '',
  ]

  return [headers.join(','), sampleRow.join(',')].join('\n')
}
