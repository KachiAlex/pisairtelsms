import { sql } from '@vercel/postgres'
import * as crypto from 'crypto'

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err)
      else resolve(`${salt}:${derived.toString('hex')}`)
    })
  })
}

export async function verifyStaffPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, stored] = hash.split(':')
    if (!salt || !stored) { resolve(false); return }
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err)
      else resolve(derived.toString('hex') === stored)
    })
  })
}

export interface Staff {
  id: string
  staffId: string
  tenantId: string
  name: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on_leave'
  email: string
  phone: string
  hireDate: string
  salary?: number
  address?: string
  qualification?: string
  gender?: 'male' | 'female' | 'other'
  dateOfBirth?: string
  emergencyContact?: string
  emergencyPhone?: string
  createdAt: string
  updatedAt: string
}

export interface StaffPayload {
  staffId?: string
  name: string
  role: string
  department: string
  email: string
  phone: string
  hireDate: string
  status?: 'active' | 'inactive' | 'on_leave'
  salary?: number
  address?: string
  qualification?: string
  gender?: 'male' | 'female' | 'other'
  dateOfBirth?: string
  emergencyContact?: string
  emergencyPhone?: string
}

export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export interface Attendance {
  id: string
  staffId: string
  staffName: string
  date: string
  checkIn?: string
  checkOut?: string
  status: 'present' | 'absent' | 'late' | 'half_day'
  notes?: string
  latitude?: number | null
  longitude?: number | null
  geoVerified?: boolean
  anomalyFlags?: string[]
  createdAt: string
}

export interface PayrollRecord {
  id: string
  staffId: string
  staffName: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  status: 'pending' | 'processed' | 'paid'
  paymentDate?: string
  createdAt: string
}

interface StaffRow {
  id: string
  staff_id: string
  tenant_id: string
  name: string
  role: string
  department: string
  status: string
  email: string
  phone: string
  hire_date: Date
  salary: number | null
  address: string | null
  qualification: string | null
  gender: string | null
  date_of_birth: Date | null
  emergency_contact: string | null
  emergency_phone: string | null
  created_at: Date
  updated_at: Date
}

interface LeaveRow {
  id: string
  staff_id: string
  staff_name: string
  leave_type: string
  start_date: Date
  end_date: Date
  days: number
  reason: string
  status: string
  approved_by: string | null
  created_at: Date
  updated_at: Date
}

interface AttendanceRow {
  id: string
  staff_id: string
  staff_name: string
  date: Date
  check_in: string | null
  check_out: string | null
  status: string
  notes: string | null
  latitude: number | null
  longitude: number | null
  geo_verified: boolean | null
  created_at: Date
}

interface PayrollRow {
  id: string
  staff_id: string
  staff_name: string
  month: string
  year: number
  basic_salary: number
  allowances: number
  deductions: number
  net_salary: number
  status: string
  payment_date: Date | null
  created_at: Date
}

function rowToStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    staffId: row.staff_id,
    tenantId: row.tenant_id,
    name: row.name,
    role: row.role,
    department: row.department,
    status: row.status as Staff['status'],
    email: row.email,
    phone: row.phone,
    hireDate: row.hire_date instanceof Date ? row.hire_date.toISOString().split('T')[0] : String(row.hire_date),
    salary: row.salary ?? undefined,
    address: row.address ?? undefined,
    qualification: row.qualification ?? undefined,
    gender: row.gender as Staff['gender'] ?? undefined,
    dateOfBirth: row.date_of_birth instanceof Date ? row.date_of_birth.toISOString().split('T')[0] : row.date_of_birth ?? undefined,
    emergencyContact: row.emergency_contact ?? undefined,
    emergencyPhone: row.emergency_phone ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function rowToLeave(row: LeaveRow): LeaveRequest {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    leaveType: row.leave_type,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : String(row.start_date),
    endDate: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : String(row.end_date),
    days: row.days,
    reason: row.reason,
    status: row.status as LeaveRequest['status'],
    approvedBy: row.approved_by ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function rowToAttendance(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    checkIn: row.check_in ?? undefined,
    checkOut: row.check_out ?? undefined,
    status: row.status as Attendance['status'],
    notes: row.notes ?? undefined,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    geoVerified: row.geo_verified ?? false,
    createdAt: row.created_at.toISOString(),
  }
}

function rowToPayroll(row: PayrollRow): PayrollRecord {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    month: row.month,
    year: row.year,
    basicSalary: row.basic_salary,
    allowances: row.allowances,
    deductions: row.deductions,
    netSalary: row.net_salary,
    status: row.status as PayrollRecord['status'],
    paymentDate: row.payment_date instanceof Date ? row.payment_date.toISOString().split('T')[0] : row.payment_date ?? undefined,
    createdAt: row.created_at.toISOString(),
  }
}

export async function ensureStaffTables(): Promise<void> {
  try {
    // Create core tables if they don't exist (fresh deployments)
    await sql`CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      staff_id TEXT,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      name TEXT NOT NULL DEFAULT '',
      role TEXT,
      department TEXT,
      status TEXT DEFAULT 'active',
      email TEXT,
      phone TEXT,
      hire_date DATE,
      salary NUMERIC,
      address TEXT,
      qualification TEXT,
      gender TEXT,
      date_of_birth DATE,
      emergency_contact TEXT,
      emergency_phone TEXT,
      password_hash TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`.catch((e: any) => console.error('staff create table failed:', e.message))

    await sql`CREATE TABLE IF NOT EXISTS staff_leave (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      leave_type TEXT,
      start_date DATE,
      end_date DATE,
      days NUMERIC,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`.catch((e: any) => console.error('staff_leave create table failed:', e.message))

    await sql`CREATE TABLE IF NOT EXISTS staff_attendance (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      date DATE,
      check_in TEXT,
      check_out TEXT,
      status TEXT,
      notes TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      geo_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`.catch((e: any) => console.error('staff_attendance create table failed:', e.message))

    await sql`CREATE TABLE IF NOT EXISTS staff_payroll (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      month TEXT,
      year NUMERIC,
      basic_salary NUMERIC,
      allowances NUMERIC,
      deductions NUMERIC,
      net_salary NUMERIC,
      status TEXT DEFAULT 'pending',
      payment_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`.catch((e: any) => console.error('staff_payroll create table failed:', e.message))

    // Backfill missing columns on pre-existing tables
    await sql`ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      ADD COLUMN IF NOT EXISTS staff_id TEXT,
      ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS role TEXT,
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS hire_date DATE,
      ADD COLUMN IF NOT EXISTS salary NUMERIC,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS qualification TEXT,
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
      ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`.catch((e: any) => console.error('staff alter failed:', e.message))

    await sql`ALTER TABLE staff_leave
      ADD COLUMN IF NOT EXISTS staff_id TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS staff_name TEXT,
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      ADD COLUMN IF NOT EXISTS leave_type TEXT,
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS end_date DATE,
      ADD COLUMN IF NOT EXISTS days NUMERIC,
      ADD COLUMN IF NOT EXISTS reason TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS approved_by TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`.catch((e: any) => console.error('staff_leave alter failed:', e.message))

    await sql`ALTER TABLE staff_attendance
      ADD COLUMN IF NOT EXISTS staff_id TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS staff_name TEXT,
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      ADD COLUMN IF NOT EXISTS date DATE,
      ADD COLUMN IF NOT EXISTS check_in TEXT,
      ADD COLUMN IF NOT EXISTS check_out TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`.catch((e: any) => console.error('staff_attendance alter failed:', e.message))

    await sql`ALTER TABLE staff_payroll
      ADD COLUMN IF NOT EXISTS staff_id TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS staff_name TEXT,
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      ADD COLUMN IF NOT EXISTS month TEXT,
      ADD COLUMN IF NOT EXISTS year NUMERIC,
      ADD COLUMN IF NOT EXISTS basic_salary NUMERIC,
      ADD COLUMN IF NOT EXISTS allowances NUMERIC,
      ADD COLUMN IF NOT EXISTS deductions NUMERIC,
      ADD COLUMN IF NOT EXISTS net_salary NUMERIC,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS payment_date DATE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`.catch((e: any) => console.error('staff_payroll alter failed:', e.message))

    // Indexes & unique constraints needed by the app
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_attendance_unique ON staff_attendance(staff_id, date)`.catch((e: any) => console.error('attendance unique index failed:', e.message))
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_payroll_unique ON staff_payroll(staff_id, month, year)`.catch((e: any) => console.error('payroll unique index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id)`.catch((e: any) => console.error('staff tenant index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department)`.catch((e: any) => console.error('staff dept index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status)`.catch((e: any) => console.error('staff status index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email)`.catch((e: any) => console.error('staff email index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_leave_tenant_id ON staff_leave(tenant_id)`.catch((e: any) => console.error('leave tenant index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON staff_attendance(tenant_id)`.catch((e: any) => console.error('attendance tenant index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_payroll_tenant_id ON staff_payroll(tenant_id)`.catch((e: any) => console.error('payroll tenant index failed:', e.message))
  } catch (error) {
    console.error('Error ensuring staff tables:', error)
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Validate a staff member's location against the school's geofence
 */
export function validateGeofence(
  staffLat: number,
  staffLon: number,
  schoolLat: number,
  schoolLon: number,
  radiusMeters: number
): { withinFence: boolean; distance: number } {
  const distance = calculateDistance(staffLat, staffLon, schoolLat, schoolLon)
  return { withinFence: distance <= radiusMeters, distance }
}

/**
 * Check if current time is within a configured time window
 * @param currentTime HH:MM format
 * @param windowStart HH:MM format
 * @param windowEnd HH:MM format
 */
export function isWithinTimeWindow(
  currentTime: string,
  windowStart: string,
  windowEnd: string
): boolean {
  return currentTime >= windowStart && currentTime <= windowEnd
}

// ── Staff CRUD ──────────────────────────────────────────────────────────────

export async function fetchStaffCount(tenantId?: string): Promise<number> {
  await ensureStaffTables()
  try {
    if (tenantId) {
      const result = await sql<{ count: string }>`SELECT COUNT(*) as count FROM staff WHERE tenant_id = ${tenantId}`
      return parseInt(result.rows[0]?.count || '0', 10)
    }
    const result = await sql<{ count: string }>`SELECT COUNT(*) as count FROM staff`
    return parseInt(result.rows[0]?.count || '0', 10)
  } catch (error) {
    console.error('Error fetching staff count:', error)
    return 0
  }
}

export async function fetchStaff(department?: string, status?: string, tenantId?: string): Promise<Staff[]> {
  await ensureStaffTables()
  try {
    if (tenantId && department && status) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE tenant_id = ${tenantId} AND department = ${department} AND status = ${status} ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    } else if (tenantId && department) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE tenant_id = ${tenantId} AND department = ${department} ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    } else if (tenantId && status) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    } else if (tenantId) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE tenant_id = ${tenantId} ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    } else if (department && status) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE department = ${department} AND status = ${status} ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    } else if (department) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE department = ${department} ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    } else if (status) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE status = ${status} ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    } else {
      const result = await sql<StaffRow>`SELECT * FROM staff ORDER BY name ASC`
      return result.rows.map(rowToStaff)
    }
  } catch (error) {
    console.error('Error fetching staff:', error)
    return []
  }
}

export async function fetchStaffById(id: string, tenantId?: string): Promise<Staff | null> {
  await ensureStaffTables()
  try {
    if (tenantId) {
      const result = await sql<StaffRow>`SELECT * FROM staff WHERE id = ${id} AND tenant_id = ${tenantId}`
      return result.rows[0] ? rowToStaff(result.rows[0]) : null
    }
    const result = await sql<StaffRow>`SELECT * FROM staff WHERE id = ${id}`
    return result.rows[0] ? rowToStaff(result.rows[0]) : null
  } catch (error) {
    console.error('Error fetching staff by id:', error)
    return null
  }
}

export async function fetchStaffByEmail(email: string): Promise<(Staff & { passwordHash: string | null }) | null> {
  await ensureStaffTables()
  try {
    const result = await sql<StaffRow & { password_hash: string | null }>`SELECT * FROM staff WHERE email = ${email} LIMIT 1`
    if (!result.rows[0]) return null
    return { ...rowToStaff(result.rows[0]), passwordHash: result.rows[0].password_hash }
  } catch (error) {
    console.error('Error fetching staff by email:', error)
    return null
  }
}

export async function createStaffMember(
  payload: StaffPayload & { defaultPassword?: string },
  tenantId?: string
): Promise<Staff> {
  await ensureStaffTables()
  const id = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const staffId = payload.staffId || `STF${Date.now().toString().slice(-6)}`
  const rawPassword = payload.defaultPassword || `${payload.name.split(' ')[0].toLowerCase()}@${Date.now().toString().slice(-4)}`
  const passwordHash = await hashPassword(rawPassword)
  const resolvedTenantId = tenantId || 'default-tenant'
  const result = await sql<StaffRow>`
    INSERT INTO staff (id, staff_id, tenant_id, name, role, department, status, email, phone, hire_date,
                       salary, address, qualification, gender, date_of_birth, emergency_contact, emergency_phone, password_hash)
    VALUES (${id}, ${staffId}, ${resolvedTenantId}, ${payload.name}, ${payload.role}, ${payload.department},
            ${payload.status || 'active'}, ${payload.email}, ${payload.phone}, ${payload.hireDate},
            ${payload.salary ?? null}, ${payload.address ?? null}, ${payload.qualification ?? null},
            ${payload.gender ?? null}, ${payload.dateOfBirth ?? null},
            ${payload.emergencyContact ?? null}, ${payload.emergencyPhone ?? null}, ${passwordHash})
    RETURNING *
  `

  // Mirror into tenant_users using actual tenantId (not functional department)
  try {
    const existing = await sql`SELECT id FROM tenant_users WHERE email = ${payload.email.toLowerCase()} LIMIT 1`
    if (existing.rows.length > 0) {
      await sql`
        UPDATE tenant_users
        SET tenant_id = ${resolvedTenantId}, name = ${payload.name}, role = ${payload.role}, status = 'active'
        WHERE email = ${payload.email.toLowerCase()}
      `
    } else {
      await sql`
        INSERT INTO tenant_users (tenant_id, name, email, role, status)
        VALUES (${resolvedTenantId}, ${payload.name}, ${payload.email.toLowerCase()}, ${payload.role}, 'active')
      `
    }
  } catch (e) {
    console.error('tenant_users mirror insert failed:', e)
  }

  return rowToStaff(result.rows[0])
}

export async function updateStaffMember(
  id: string,
  payload: Partial<StaffPayload>,
  tenantId?: string
): Promise<Staff | null> {
  await ensureStaffTables()
  try {
    const result = await sql<StaffRow>`
      UPDATE staff SET
        name = COALESCE(${payload.name ?? null}, name),
        role = COALESCE(${payload.role ?? null}, role),
        department = COALESCE(${payload.department ?? null}, department),
        status = COALESCE(${payload.status ?? null}, status),
        email = COALESCE(${payload.email ?? null}, email),
        phone = COALESCE(${payload.phone ?? null}, phone),
        salary = COALESCE(${payload.salary ?? null}, salary),
        address = COALESCE(${payload.address ?? null}, address),
        qualification = COALESCE(${payload.qualification ?? null}, qualification),
        gender = COALESCE(${payload.gender ?? null}, gender),
        emergency_contact = COALESCE(${payload.emergencyContact ?? null}, emergency_contact),
        emergency_phone = COALESCE(${payload.emergencyPhone ?? null}, emergency_phone),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId || 'default-tenant'}
      RETURNING *
    `
    const staff = result.rows[0] ? rowToStaff(result.rows[0]) : null
    if (staff) {
      try {
        const resolvedTenantId = tenantId || 'default-tenant'
        const userStatus = staff.status === 'active' ? 'active' : 'suspended'
        await sql`
          UPDATE tenant_users
          SET tenant_id = ${resolvedTenantId}, name = ${staff.name}, role = ${staff.role}, status = ${userStatus}
          WHERE email = ${staff.email.toLowerCase()}
        `
      } catch (e) {
        console.error('tenant_users sync on update failed:', e)
      }
    }
    return staff
  } catch (error) {
    console.error('Error updating staff:', error)
    return null
  }
}

export async function deleteStaffMember(id: string, tenantId?: string): Promise<boolean> {
  try {
    const staffRes = await sql`SELECT email FROM staff WHERE id = ${id} AND tenant_id = ${tenantId || 'default-tenant'} LIMIT 1`
    const email = staffRes.rows[0]?.email
    await sql`DELETE FROM staff WHERE id = ${id} AND tenant_id = ${tenantId || 'default-tenant'}`
    if (email) {
      try {
        await sql`UPDATE tenant_users SET status = 'suspended' WHERE email = ${email.toLowerCase()}`
      } catch (e) {
        console.error('tenant_users sync on delete failed:', e)
      }
    }
    return true
  } catch (error) {
    console.error('Error deleting staff:', error)
    return false
  }
}

export async function resetStaffPassword(id: string, newPassword: string): Promise<boolean> {
  try {
    const passwordHash = await hashPassword(newPassword)
    const result = await sql`UPDATE staff SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${id}`
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('Error resetting staff password:', error)
    return false
  }
}

// ── Leave ───────────────────────────────────────────────────────────────────

export async function fetchLeaveRequests(staffId?: string, status?: string, tenantId?: string): Promise<LeaveRequest[]> {
  await ensureStaffTables()
  try {
    const resolvedTenantId = tenantId || 'default-tenant'
    if (staffId && status) {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave WHERE staff_id = ${staffId} AND status = ${status} AND tenant_id = ${resolvedTenantId} ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    } else if (staffId) {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave WHERE staff_id = ${staffId} AND tenant_id = ${resolvedTenantId} ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    } else if (status) {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave WHERE status = ${status} AND tenant_id = ${resolvedTenantId} ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    } else {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave WHERE tenant_id = ${resolvedTenantId} ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    }
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return []
  }
}

export async function createLeaveRequest(
  payload: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>,
  tenantId?: string
): Promise<LeaveRequest> {
  await ensureStaffTables()
  const id = `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const resolvedTenantId = tenantId || 'default-tenant'
  const result = await sql<LeaveRow>`
    INSERT INTO staff_leave (id, staff_id, staff_name, tenant_id, leave_type, start_date, end_date, days, reason, status)
    VALUES (${id}, ${payload.staffId}, ${payload.staffName}, ${resolvedTenantId}, ${payload.leaveType},
            ${payload.startDate}, ${payload.endDate}, ${payload.days}, ${payload.reason}, ${payload.status || 'pending'})
    RETURNING *
  `
  return rowToLeave(result.rows[0])
}

export async function updateLeaveStatus(id: string, status: string, approvedBy?: string, tenantId?: string): Promise<LeaveRequest | null> {
  try {
    const resolvedTenantId = tenantId || 'default-tenant'
    const result = await sql<LeaveRow>`
      UPDATE staff_leave SET status = ${status}, approved_by = ${approvedBy ?? null}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${resolvedTenantId} RETURNING *
    `
    return result.rows[0] ? rowToLeave(result.rows[0]) : null
  } catch (error) {
    console.error('Error updating leave status:', error)
    return null
  }
}

// ── Attendance ──────────────────────────────────────────────────────────────

export async function fetchAttendance(date?: string, staffId?: string, tenantId?: string): Promise<Attendance[]> {
  await ensureStaffTables()
  try {
    const resolvedTenantId = tenantId || 'default-tenant'
    if (date && staffId) {
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE date = ${date} AND staff_id = ${staffId} AND tenant_id = ${resolvedTenantId}`
      return result.rows.map(rowToAttendance)
    } else if (date) {
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE date = ${date} AND tenant_id = ${resolvedTenantId} ORDER BY staff_name ASC`
      return result.rows.map(rowToAttendance)
    } else if (staffId) {
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE staff_id = ${staffId} AND tenant_id = ${resolvedTenantId} ORDER BY date DESC`
      return result.rows.map(rowToAttendance)
    } else {
      const today = new Date().toISOString().split('T')[0]
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE date = ${today} AND tenant_id = ${resolvedTenantId} ORDER BY staff_name ASC`
      return result.rows.map(rowToAttendance)
    }
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return []
  }
}

export async function markAttendance(
  payload: Omit<Attendance, 'id' | 'createdAt'>,
  tenantId?: string
): Promise<Attendance> {
  await ensureStaffTables()
  const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const resolvedTenantId = tenantId || 'default-tenant'
  const result = await sql<AttendanceRow>`
    INSERT INTO staff_attendance (id, staff_id, staff_name, tenant_id, date, check_in, check_out, status, notes)
    VALUES (${id}, ${payload.staffId}, ${payload.staffName}, ${resolvedTenantId}, ${payload.date},
            ${payload.checkIn ?? null}, ${payload.checkOut ?? null}, ${payload.status}, ${payload.notes ?? null})
    ON CONFLICT (staff_id, date) DO UPDATE SET
      check_in = COALESCE(EXCLUDED.check_in, staff_attendance.check_in),
      check_out = COALESCE(EXCLUDED.check_out, staff_attendance.check_out),
      status = EXCLUDED.status,
      notes = COALESCE(EXCLUDED.notes, staff_attendance.notes)
    RETURNING *
  `
  return rowToAttendance(result.rows[0])
}

// ── Payroll ─────────────────────────────────────────────────────────────────

export async function fetchPayroll(month?: string, year?: number, tenantId?: string): Promise<PayrollRecord[]> {
  await ensureStaffTables()
  try {
    const currentYear = year || new Date().getFullYear()
    const currentMonth = month || new Date().toLocaleString('default', { month: 'long' })
    const resolvedTenantId = tenantId || 'default-tenant'
    const result = await sql<PayrollRow>`
      SELECT * FROM staff_payroll WHERE month = ${currentMonth} AND year = ${currentYear} AND tenant_id = ${resolvedTenantId} ORDER BY staff_name ASC
    `
    return result.rows.map(rowToPayroll)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return []
  }
}

export async function generatePayroll(
  staffId: string,
  staffName: string,
  month: string,
  year: number,
  basicSalary: number,
  allowances: number,
  deductions: number,
  tenantId?: string
): Promise<PayrollRecord> {
  await ensureStaffTables()
  const id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const netSalary = basicSalary + allowances - deductions
  const resolvedTenantId = tenantId || 'default-tenant'
  const result = await sql<PayrollRow>`
    INSERT INTO staff_payroll (id, staff_id, staff_name, tenant_id, month, year, basic_salary, allowances, deductions, net_salary, status)
    VALUES (${id}, ${staffId}, ${staffName}, ${resolvedTenantId}, ${month}, ${year}, ${basicSalary}, ${allowances}, ${deductions}, ${netSalary}, 'pending')
    ON CONFLICT (staff_id, month, year) DO UPDATE SET
      basic_salary = EXCLUDED.basic_salary,
      allowances = EXCLUDED.allowances,
      deductions = EXCLUDED.deductions,
      net_salary = EXCLUDED.net_salary
    RETURNING *
  `
  return rowToPayroll(result.rows[0])
}

export async function updatePayrollStatus(id: string, status: string, paymentDate?: string, tenantId?: string): Promise<PayrollRecord | null> {
  try {
    const resolvedTenantId = tenantId || 'default-tenant'
    const result = await sql<PayrollRow>`
      UPDATE staff_payroll SET status = ${status}, payment_date = ${paymentDate ?? null} WHERE id = ${id} AND tenant_id = ${resolvedTenantId} RETURNING *
    `
    return result.rows[0] ? rowToPayroll(result.rows[0]) : null
  } catch (error) {
    console.error('Error updating payroll status:', error)
    return null
  }
}
