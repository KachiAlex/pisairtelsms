/**
 * Comprehensive Unit Tests for CSV Parser
 * Task: 5.1 (csv-parser.unit.test.ts)
 * Validates: Requirements 6 (Manual Batch Upload), 20 (Data Validation)
 */

import { describe, it, expect } from 'vitest'
import {
  parseCsvContent,
  generateCsvTemplate,
  type CsvAttendanceRecord,
  type CsvParseResult,
} from './csv-parser.js'

// ============================================================================
// Helpers
// ============================================================================

function buildCsv(rows: string[]): string {
  const header = 'studentId,class,date,status,academicSession,term'
  return [header, ...rows].join('\n')
}

const TODAY = new Date().toISOString().split('T')[0]
const PAST_DATE = '2024-05-04'

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// ============================================================================
// Header Validation
// ============================================================================

describe('CSV Header Validation (Req 6.2)', () => {
  it('accepts a valid header row with all required columns', () => {
    const csv = buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024/2025,1`])
    const result = parseCsvContent(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
  })

  it('rejects CSV with empty content', () => {
    const result = parseCsvContent('')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('empty')
  })

  it('rejects CSV with only a header and no data rows', () => {
    const result = parseCsvContent('studentId,class,date,status,academicSession,term')
    expect(result.valid).toHaveLength(0)
    expect(result.totalRows).toBe(0)
  })

  it('rejects CSV missing studentId column', () => {
    const result = parseCsvContent('class,date,status,academicSession,term\nJSS 1,2024-05-04,present,2024/2025,1')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('studentId')
  })

  it('rejects CSV missing class column', () => {
    const result = parseCsvContent('studentId,date,status,academicSession,term\nSTU001,2024-05-04,present,2024/2025,1')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('class')
  })

  it('rejects CSV missing date column', () => {
    const result = parseCsvContent('studentId,class,status,academicSession,term\nSTU001,JSS 1,present,2024/2025,1')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('date')
  })

  it('rejects CSV missing status column', () => {
    const result = parseCsvContent('studentId,class,date,academicSession,term\nSTU001,JSS 1,2024-05-04,2024/2025,1')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('status')
  })

  it('rejects CSV missing academicSession column', () => {
    const result = parseCsvContent('studentId,class,date,status,term\nSTU001,JSS 1,2024-05-04,present,1')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('academicSession')
  })

  it('rejects CSV missing term column', () => {
    const result = parseCsvContent('studentId,class,date,status,academicSession\nSTU001,JSS 1,2024-05-04,present,2024/2025')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('term')
  })

  it('accepts header with extra optional columns (e.g. absenceReason)', () => {
    const csv = 'studentId,class,date,status,academicSession,term,absenceReason\nSTU001,JSS 1,2024-05-04,present,2024/2025,1,'
    const result = parseCsvContent(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
  })

  it('handles quoted header values', () => {
    const csv = '"studentId","class","date","status","academicSession","term"\nSTU001,JSS 1,2024-05-04,present,2024/2025,1'
    const result = parseCsvContent(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
  })
})

// ============================================================================
// Status Validation (Req 6.3)
// ============================================================================

describe('Status Validation (Req 6.3)', () => {
  it('accepts "present" status', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].status).toBe('present')
  })

  it('accepts "absent" status', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},absent,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].status).toBe('absent')
  })

  it('accepts "late" status', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},late,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].status).toBe('late')
  })

  it('accepts status in uppercase (normalised to lowercase)', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},PRESENT,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].status).toBe('present')
  })

  it('rejects "maybe" status', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},maybe,2024/2025,1`]))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('status')
    expect(result.errors[0].message).toContain('must be one of')
  })

  it('rejects "yes" status', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},yes,2024/2025,1`]))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('status')
  })

  it('rejects empty status', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},,2024/2025,1`]))
    expect(result.errors.length).toBeGreaterThan(0)
    const statusError = result.errors.find(e => e.field === 'status')
    expect(statusError).toBeDefined()
  })
})

// ============================================================================
// Date Validation (Req 6.4)
// ============================================================================

describe('Date Validation (Req 6.4)', () => {
  it('rejects future dates', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${tomorrow()},present,2024/2025,1`]))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('date')
    expect(result.errors[0].message).toContain('future')
  })

  it('accepts today\'s date', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${TODAY},present,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
  })

  it('accepts past dates', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
  })

  it('rejects date in MM-DD-YYYY format', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,05-04-2024,present,2024/2025,1`]))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('date')
    expect(result.errors[0].message).toContain('YYYY-MM-DD')
  })

  it('rejects date in YYYY/MM/DD format', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,2024/05/04,present,2024/2025,1`]))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('date')
  })

  it('rejects empty date', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,,present,2024/2025,1`]))
    expect(result.errors.length).toBeGreaterThan(0)
    const dateError = result.errors.find(e => e.field === 'date')
    expect(dateError).toBeDefined()
  })
})

// ============================================================================
// Academic Session Validation
// ============================================================================

describe('Academic Session Validation', () => {
  it('accepts YYYY/YYYY format', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
  })

  it('rejects YYYY-YYYY format', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024-2025,1`]))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('academicSession')
    expect(result.errors[0].message).toContain('YYYY/YYYY')
  })

  it('rejects single year format', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024,1`]))
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].field).toBe('academicSession')
  })

  it('rejects empty academicSession', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,,1`]))
    expect(result.errors.length).toBeGreaterThan(0)
    const sessionError = result.errors.find(e => e.field === 'academicSession')
    expect(sessionError).toBeDefined()
  })
})

// ============================================================================
// Required Field Validation
// ============================================================================

describe('Required Field Validation', () => {
  it('rejects row with missing studentId', () => {
    const result = parseCsvContent(buildCsv([`,JSS 1,${PAST_DATE},present,2024/2025,1`]))
    expect(result.errors.length).toBeGreaterThan(0)
    const err = result.errors.find(e => e.field === 'studentId')
    expect(err).toBeDefined()
  })

  it('rejects row with missing class', () => {
    const result = parseCsvContent(buildCsv([`STU001,,${PAST_DATE},present,2024/2025,1`]))
    expect(result.errors.length).toBeGreaterThan(0)
    const err = result.errors.find(e => e.field === 'class')
    expect(err).toBeDefined()
  })

  it('rejects row with missing term', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024/2025,`]))
    expect(result.errors.length).toBeGreaterThan(0)
    const err = result.errors.find(e => e.field === 'term')
    expect(err).toBeDefined()
  })

  it('reports row number in error', () => {
    const result = parseCsvContent(buildCsv([
      `STU001,JSS 1,${PAST_DATE},present,2024/2025,1`,
      `STU002,JSS 1,${PAST_DATE},invalid_status,2024/2025,1`,
    ]))
    const err = result.errors.find(e => e.field === 'status')
    expect(err).toBeDefined()
    expect(err!.row).toBe(3) // row 1 = header, row 2 = first data, row 3 = second data
  })
})

// ============================================================================
// Mixed Valid/Invalid Rows
// ============================================================================

describe('Mixed Valid/Invalid Rows (Req 6.6)', () => {
  it('separates valid and invalid rows correctly', () => {
    const csv = buildCsv([
      `STU001,JSS 1,${PAST_DATE},present,2024/2025,1`,
      `STU002,JSS 1,${PAST_DATE},invalid_status,2024/2025,1`,
      `STU003,JSS 1,${PAST_DATE},absent,2024/2025,1`,
    ])
    const result = parseCsvContent(csv)
    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
    expect(result.totalRows).toBe(3)
  })

  it('counts totalRows correctly including invalid rows', () => {
    const csv = buildCsv([
      `STU001,JSS 1,${PAST_DATE},present,2024/2025,1`,
      `STU002,JSS 1,${PAST_DATE},bad,2024/2025,1`,
      `STU003,JSS 1,${PAST_DATE},late,2024/2025,1`,
      `STU004,JSS 1,${tomorrow()},present,2024/2025,1`,
    ])
    const result = parseCsvContent(csv)
    expect(result.totalRows).toBe(4)
    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(2)
  })

  it('skips empty lines without counting them', () => {
    const csv = 'studentId,class,date,status,academicSession,term\n\nSTU001,JSS 1,2024-05-04,present,2024/2025,1\n\n'
    const result = parseCsvContent(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.totalRows).toBe(1)
  })
})

// ============================================================================
// Quoted Values
// ============================================================================

describe('Quoted CSV Values', () => {
  it('handles values with commas inside quotes', () => {
    const csv = 'studentId,class,date,status,academicSession,term\nSTU001,"JSS 1, A",2024-05-04,present,2024/2025,1'
    const result = parseCsvContent(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].class).toBe('JSS 1, A')
  })

  it('handles escaped quotes inside quoted values', () => {
    const csv = 'studentId,class,date,status,academicSession,term\nSTU001,"JSS ""1""",2024-05-04,present,2024/2025,1'
    const result = parseCsvContent(csv)
    expect(result.valid).toHaveLength(1)
  })

  it('handles Windows-style CRLF line endings', () => {
    const csv = 'studentId,class,date,status,academicSession,term\r\nSTU001,JSS 1,2024-05-04,present,2024/2025,1\r\n'
    const result = parseCsvContent(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })
})

// ============================================================================
// Absence Reason (Optional Field)
// ============================================================================

describe('Absence Reason (Optional Field)', () => {
  it('captures absenceReason when provided', () => {
    const csv = 'studentId,class,date,status,academicSession,term,absenceReason\nSTU001,JSS 1,2024-05-04,absent,2024/2025,1,Sick'
    const result = parseCsvContent(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].absenceReason).toBe('Sick')
  })

  it('sets absenceReason to undefined when not provided', () => {
    const result = parseCsvContent(buildCsv([`STU001,JSS 1,${PAST_DATE},present,2024/2025,1`]))
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].absenceReason).toBeUndefined()
  })

  it('sets absenceReason to undefined when column is empty', () => {
    const csv = 'studentId,class,date,status,academicSession,term,absenceReason\nSTU001,JSS 1,2024-05-04,absent,2024/2025,1,'
    const result = parseCsvContent(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].absenceReason).toBeUndefined()
  })
})

// ============================================================================
// CSV Template Generation
// ============================================================================

describe('CSV Template Generation', () => {
  it('generates a parseable template', () => {
    const template = generateCsvTemplate()
    const result = parseCsvContent(template)
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
  })

  it('template contains all required columns', () => {
    const template = generateCsvTemplate()
    const headerLine = template.split('\n')[0]
    expect(headerLine).toContain('studentId')
    expect(headerLine).toContain('class')
    expect(headerLine).toContain('date')
    expect(headerLine).toContain('status')
    expect(headerLine).toContain('academicSession')
    expect(headerLine).toContain('term')
  })

  it('template sample row has valid status', () => {
    const template = generateCsvTemplate()
    const result = parseCsvContent(template)
    expect(result.valid[0].status).toBe('present')
  })

  it('template sample row has valid academicSession format', () => {
    const template = generateCsvTemplate()
    const result = parseCsvContent(template)
    expect(result.valid[0].academicSession).toMatch(/^\d{4}\/\d{4}$/)
  })
})

// ============================================================================
// Large Dataset Performance
// ============================================================================

describe('Large Dataset Handling', () => {
  it('parses 1000 rows without errors within 1 second', () => {
    const rows = Array.from({ length: 1000 }, (_, i) =>
      `STU${String(i).padStart(4, '0')},JSS 1,2024-05-04,present,2024/2025,1`
    )
    const csv = buildCsv(rows)

    const start = Date.now()
    const result = parseCsvContent(csv)
    const elapsed = Date.now() - start

    expect(result.valid).toHaveLength(1000)
    expect(result.errors).toHaveLength(0)
    expect(elapsed).toBeLessThan(1000)
  })

  it('parses 10000 rows within 5 seconds', () => {
    const rows = Array.from({ length: 10000 }, (_, i) =>
      `STU${String(i % 500).padStart(4, '0')},JSS ${(i % 3) + 1},2024-05-04,present,2024/2025,1`
    )
    const csv = buildCsv(rows)

    const start = Date.now()
    const result = parseCsvContent(csv)
    const elapsed = Date.now() - start

    expect(result.totalRows).toBe(10000)
    expect(elapsed).toBeLessThan(5000)
  })
})
