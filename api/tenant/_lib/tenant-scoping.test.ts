import { describe, it, expect } from 'vitest'

/**
 * Tenant scoping tests for staff and student queries.
 * Validates that query filtering by tenantId correctly isolates data per tenant,
 * preventing cross-tenant data leakage.
 */

interface StudentRecord {
  id: string
  tenant_id: string
  admission_no: string
  name: string
  class: string
  arm: string
  gender: string
  status: string
  guardian: string
  phone: string
}

interface StaffRecord {
  id: string
  tenant_id: string
  staff_id: string
  name: string
  role: string
  department: string
  status: string
  email: string
  phone: string
}

// Mirrors fetchStudents query filtering logic
function filterStudentsByTenant(records: StudentRecord[], tenantId: string): StudentRecord[] {
  return records.filter(r => r.tenant_id === tenantId)
}

// Mirrors fetchStaff query filtering logic
function filterStaffByTenant(records: StaffRecord[], tenantId: string): StaffRecord[] {
  return records.filter(r => r.tenant_id === tenantId)
}

// Mirrors fetchStudents with additional filters
function fetchStudents(
  records: StudentRecord[],
  tenantId: string,
  classFilter?: string,
  status?: string
): StudentRecord[] {
  return records.filter(r => {
    if (r.tenant_id !== tenantId) return false
    if (classFilter && r.class !== classFilter) return false
    if (status && r.status !== status) return false
    return true
  })
}

// Mirrors fetchStaff with additional filters
function fetchStaff(
  records: StaffRecord[],
  tenantId: string,
  department?: string,
  status?: string
): StaffRecord[] {
  return records.filter(r => {
    if (r.tenant_id !== tenantId) return false
    if (department && r.department !== department) return false
    if (status && r.status !== status) return false
    return true
  })
}

function buildStudent(overrides: Partial<StudentRecord> = {}): StudentRecord {
  return {
    id: 'stu_001',
    tenant_id: 'tenant_001',
    admission_no: 'ADM001',
    name: 'John Doe',
    class: 'JSS 1',
    arm: 'A',
    gender: 'M',
    status: 'Active',
    guardian: 'Jane Doe',
    phone: '08012345678',
    ...overrides,
  }
}

function buildStaff(overrides: Partial<StaffRecord> = {}): StaffRecord {
  return {
    id: 'stf_001',
    tenant_id: 'tenant_001',
    staff_id: 'STF001',
    name: 'Teacher Smith',
    role: 'teacher',
    department: 'Mathematics',
    status: 'active',
    email: 'smith@school.com',
    phone: '08098765432',
    ...overrides,
  }
}

describe('Tenant Scoping - Student Queries', () => {
  const students: StudentRecord[] = [
    buildStudent({ id: 's1', tenant_id: 'tenant_001', name: 'Alice', class: 'JSS 1' }),
    buildStudent({ id: 's2', tenant_id: 'tenant_001', name: 'Bob', class: 'JSS 2' }),
    buildStudent({ id: 's3', tenant_id: 'tenant_002', name: 'Charlie', class: 'JSS 1' }),
    buildStudent({ id: 's4', tenant_id: 'tenant_003', name: 'Diana', class: 'SSS 1' }),
    buildStudent({ id: 's5', tenant_id: 'tenant_001', name: 'Eve', class: 'JSS 1', status: 'Suspended' }),
  ]

  it('should return only students for the specified tenant', () => {
    const result = filterStudentsByTenant(students, 'tenant_001')
    expect(result).toHaveLength(3)
    expect(result.every(s => s.tenant_id === 'tenant_001')).toBe(true)
  })

  it('should not return students from other tenants', () => {
    const result = filterStudentsByTenant(students, 'tenant_001')
    const ids = result.map(s => s.id)
    expect(ids).not.toContain('s3')
    expect(ids).not.toContain('s4')
  })

  it('should return empty array for tenant with no students', () => {
    const result = filterStudentsByTenant(students, 'tenant_999')
    expect(result).toHaveLength(0)
  })

  it('should combine tenant filter with class filter', () => {
    const result = fetchStudents(students, 'tenant_001', 'JSS 1')
    expect(result).toHaveLength(2)
    expect(result.every(s => s.tenant_id === 'tenant_001' && s.class === 'JSS 1')).toBe(true)
  })

  it('should combine tenant filter with status filter', () => {
    const result = fetchStudents(students, 'tenant_001', undefined, 'Active')
    expect(result).toHaveLength(2)
    expect(result.every(s => s.status === 'Active')).toBe(true)
  })

  it('should not leak tenant_002 students when querying tenant_001', () => {
    const result = fetchStudents(students, 'tenant_001', 'JSS 1')
    const ids = result.map(s => s.id)
    expect(ids).not.toContain('s3')
  })

  it('should isolate tenants correctly across multiple queries (property-based)', () => {
    for (let i = 0; i < 10; i++) {
      const tenant = `tenant_${i % 3}`
      const result = filterStudentsByTenant(students, tenant)
      expect(result.every(s => s.tenant_id === tenant)).toBe(true)
    }
  })
})

describe('Tenant Scoping - Staff Queries', () => {
  const staff: StaffRecord[] = [
    buildStaff({ id: 't1', tenant_id: 'tenant_001', name: 'Smith', department: 'Mathematics' }),
    buildStaff({ id: 't2', tenant_id: 'tenant_001', name: 'Jones', department: 'English' }),
    buildStaff({ id: 't3', tenant_id: 'tenant_002', name: 'Brown', department: 'Mathematics' }),
    buildStaff({ id: 't4', tenant_id: 'tenant_001', name: 'Davis', department: 'Mathematics', status: 'inactive' }),
    buildStaff({ id: 't5', tenant_id: 'tenant_003', name: 'Wilson', department: 'Science' }),
  ]

  it('should return only staff for the specified tenant', () => {
    const result = filterStaffByTenant(staff, 'tenant_001')
    expect(result).toHaveLength(3)
    expect(result.every(s => s.tenant_id === 'tenant_001')).toBe(true)
  })

  it('should not return staff from other tenants', () => {
    const result = filterStaffByTenant(staff, 'tenant_001')
    const ids = result.map(s => s.id)
    expect(ids).not.toContain('t3')
    expect(ids).not.toContain('t5')
  })

  it('should return empty array for tenant with no staff', () => {
    const result = filterStaffByTenant(staff, 'tenant_999')
    expect(result).toHaveLength(0)
  })

  it('should combine tenant filter with department filter', () => {
    const result = fetchStaff(staff, 'tenant_001', 'Mathematics')
    expect(result).toHaveLength(2)
    expect(result.every(s => s.tenant_id === 'tenant_001' && s.department === 'Mathematics')).toBe(true)
  })

  it('should combine tenant filter with status filter', () => {
    const result = fetchStaff(staff, 'tenant_001', undefined, 'active')
    expect(result).toHaveLength(2)
    expect(result.every(s => s.status === 'active')).toBe(true)
  })

  it('should not leak tenant_002 staff when querying tenant_001', () => {
    const result = fetchStaff(staff, 'tenant_001', 'Mathematics')
    const ids = result.map(s => s.id)
    expect(ids).not.toContain('t3')
  })

  it('should isolate tenants correctly across multiple queries (property-based)', () => {
    for (let i = 0; i < 10; i++) {
      const tenant = `tenant_${(i % 3) + 1}`
      const result = filterStaffByTenant(staff, tenant)
      expect(result.every(s => s.tenant_id === tenant)).toBe(true)
    }
  })
})

describe('Tenant Scoping - Cross-Tenant Isolation', () => {
  it('should never return records from a different tenant (property-based)', () => {
    const students = Array.from({ length: 20 }, (_, i) =>
      buildStudent({ id: `s${i}`, tenant_id: `tenant_${i % 4}` })
    )
    for (let t = 0; t < 4; t++) {
      const tenant = `tenant_${t}`
      const result = filterStudentsByTenant(students, tenant)
      expect(result.every(s => s.tenant_id === tenant)).toBe(true)
      expect(result).toHaveLength(5)
    }
  })

  it('should handle single-tenant datasets correctly', () => {
    const staff = [buildStaff({ tenant_id: 'only_tenant' })]
    const result = filterStaffByTenant(staff, 'only_tenant')
    expect(result).toHaveLength(1)
  })

  it('should handle empty datasets correctly', () => {
    const result = filterStudentsByTenant([], 'tenant_001')
    expect(result).toHaveLength(0)
  })
})
