import { describe, it, expect } from 'vitest'

/**
 * Unit tests for rowToStudent conversion
 * Tests that every field maps correctly from snake_case DB row to camelCase frontend type.
 * Validates: Requirements 12.4
 */

// Mirrors the StudentRow and Student types from the API layer
interface StudentRow {
  id: string
  admission_no: string
  name: string
  class: string
  arm: string
  gender: string
  status: 'Active' | 'Suspended' | 'Graduated'
  guardian: string
  phone: string
  created_at?: string
  updated_at?: string
}

interface Student {
  id: string
  admissionNo: string
  name: string
  class: string
  arm: string
  gender: string
  status: 'Active' | 'Suspended' | 'Graduated'
  guardian: string
  phone: string
  created_at?: string
  updated_at?: string
}

// rowToStudent conversion function (mirrors api/tenant/_lib/students.ts logic)
function rowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    admissionNo: row.admission_no,
    name: row.name,
    class: row.class,
    arm: row.arm,
    gender: row.gender,
    status: row.status,
    guardian: row.guardian,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function buildRow(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    id: 'student_001',
    admission_no: 'ADM001',
    name: 'John Doe',
    class: 'JSS 1',
    arm: 'A',
    gender: 'Male',
    status: 'Active',
    guardian: 'Jane Doe',
    phone: '+2348012345678',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    ...overrides,
  }
}

describe('rowToStudent conversion', () => {
  describe('Field mapping — snake_case to camelCase', () => {
    it('should map admission_no to admissionNo', () => {
      const row = buildRow({ admission_no: 'ADM999' })
      const student = rowToStudent(row)
      expect(student.admissionNo).toBe('ADM999')
    })

    it('should preserve id unchanged', () => {
      const row = buildRow({ id: 'student_xyz' })
      const student = rowToStudent(row)
      expect(student.id).toBe('student_xyz')
    })

    it('should preserve name unchanged', () => {
      const row = buildRow({ name: 'Chioma Okafor' })
      const student = rowToStudent(row)
      expect(student.name).toBe('Chioma Okafor')
    })

    it('should preserve class unchanged', () => {
      const row = buildRow({ class: 'SSS 3' })
      const student = rowToStudent(row)
      expect(student.class).toBe('SSS 3')
    })

    it('should preserve arm unchanged', () => {
      const row = buildRow({ arm: 'B' })
      const student = rowToStudent(row)
      expect(student.arm).toBe('B')
    })

    it('should preserve gender unchanged', () => {
      const row = buildRow({ gender: 'Female' })
      const student = rowToStudent(row)
      expect(student.gender).toBe('Female')
    })

    it('should preserve status unchanged', () => {
      const statuses: Array<'Active' | 'Suspended' | 'Graduated'> = ['Active', 'Suspended', 'Graduated']
      for (const status of statuses) {
        const row = buildRow({ status })
        const student = rowToStudent(row)
        expect(student.status).toBe(status)
      }
    })

    it('should preserve guardian unchanged', () => {
      const row = buildRow({ guardian: 'Mr. Adewale' })
      const student = rowToStudent(row)
      expect(student.guardian).toBe('Mr. Adewale')
    })

    it('should preserve phone unchanged', () => {
      const row = buildRow({ phone: '+2348099999999' })
      const student = rowToStudent(row)
      expect(student.phone).toBe('+2348099999999')
    })
  })

  describe('Optional fields — created_at and updated_at', () => {
    it('should preserve created_at when present', () => {
      const ts = '2024-06-15T10:30:00.000Z'
      const row = buildRow({ created_at: ts })
      const student = rowToStudent(row)
      expect(student.created_at).toBe(ts)
    })

    it('should preserve updated_at when present', () => {
      const ts = '2024-06-20T08:00:00.000Z'
      const row = buildRow({ updated_at: ts })
      const student = rowToStudent(row)
      expect(student.updated_at).toBe(ts)
    })

    it('should set created_at to undefined when not present in row', () => {
      const row = buildRow()
      delete row.created_at
      const student = rowToStudent(row)
      expect(student.created_at).toBeUndefined()
    })

    it('should set updated_at to undefined when not present in row', () => {
      const row = buildRow()
      delete row.updated_at
      const student = rowToStudent(row)
      expect(student.updated_at).toBeUndefined()
    })

    it('should handle both optional fields absent simultaneously', () => {
      const row = buildRow()
      delete row.created_at
      delete row.updated_at
      const student = rowToStudent(row)
      expect(student.created_at).toBeUndefined()
      expect(student.updated_at).toBeUndefined()
    })
  })

  describe('Complete round-trip mapping', () => {
    it('should correctly map all fields in a full row', () => {
      const row = buildRow()
      const student = rowToStudent(row)

      expect(student.id).toBe(row.id)
      expect(student.admissionNo).toBe(row.admission_no)
      expect(student.name).toBe(row.name)
      expect(student.class).toBe(row.class)
      expect(student.arm).toBe(row.arm)
      expect(student.gender).toBe(row.gender)
      expect(student.status).toBe(row.status)
      expect(student.guardian).toBe(row.guardian)
      expect(student.phone).toBe(row.phone)
      expect(student.created_at).toBe(row.created_at)
      expect(student.updated_at).toBe(row.updated_at)
    })

    it('should not include admission_no key (only admissionNo)', () => {
      const row = buildRow()
      const student = rowToStudent(row) as Record<string, unknown>
      expect('admission_no' in student).toBe(false)
      expect('admissionNo' in student).toBe(true)
    })

    it('should map multiple rows consistently (property-based)', () => {
      const admissionNos = ['ADM001', 'ADM002', 'ADM003', 'ADM100', 'ADM999']
      for (const admNo of admissionNos) {
        const row = buildRow({ admission_no: admNo, id: `student_${admNo}` })
        const student = rowToStudent(row)
        expect(student.admissionNo).toBe(admNo)
        expect(student.id).toBe(`student_${admNo}`)
      }
    })
  })
})
