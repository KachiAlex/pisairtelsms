import { sql } from '@vercel/postgres'
import crypto from 'crypto'

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
    await sql`
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        staff_id TEXT UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        email TEXT,
        phone TEXT,
        hire_date DATE NOT NULL,
        salary NUMERIC,
        address TEXT,
        qualification TEXT,
        gender TEXT,
        date_of_birth DATE,
        emergency_contact TEXT,
        emergency_phone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    // Backfill columns added after initial table creation
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_id TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary NUMERIC`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS qualification TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_phone TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_hash TEXT`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_staff_id ON staff(staff_id) WHERE staff_id IS NOT NULL`
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department)`
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status)`

    await sql`
      CREATE TABLE IF NOT EXISTS staff_leave (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        leave_type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days INTEGER NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        approved_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_leave_staff_id ON staff_leave(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_leave_status ON staff_leave(status)`

    await sql`
      CREATE TABLE IF NOT EXISTS staff_attendance (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        date DATE NOT NULL,
        check_in TEXT,
        check_out TEXT,
        status TEXT NOT NULL DEFAULT 'present',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(staff_id, date)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON staff_attendance(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_date ON staff_attendance(date)`

    await sql`
      CREATE TABLE IF NOT EXISTS staff_payroll (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        basic_salary NUMERIC NOT NULL DEFAULT 0,
        allowances NUMERIC NOT NULL DEFAULT 0,
        deductions NUMERIC NOT NULL DEFAULT 0,
        net_salary NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(staff_id, month, year)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_payroll_staff_id ON staff_payroll(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON staff_payroll(month, year)`
  } catch (error) {
    console.error('Error ensuring staff tables:', error)
  }
}

// ── Staff CRUD ──────────────────────────────────────────────────────────────

export async function fetchStaffCount(): Promise<number> {
  await ensureStaffTables()
  try {
    const result = await sql<{ count: string }>`SELECT COUNT(*) as count FROM staff WHERE phone IS NOT NULL AND phone <> ''`
    return parseInt(result.rows[0]?.count || '0', 10)
  } catch (error) {
    console.error('Error fetching staff count:', error)
    return 0
  }
}

export async function fetchStaff(department?: string, status?: string): Promise<Staff[]> {
  await ensureStaffTables()
  try {
    if (department && status) {
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

export async function fetchStaffById(id: string): Promise<Staff | null> {
  await ensureStaffTables()
  try {
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

export async function createStaffMember(payload: StaffPayload & { defaultPassword?: string }): Promise<Staff> {
  await ensureStaffTables()
  const id = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const staffId = payload.staffId || `STF${Date.now().toString().slice(-6)}`
  const rawPassword = payload.defaultPassword || `${payload.name.split(' ')[0].toLowerCase()}@${Date.now().toString().slice(-4)}`
  const passwordHash = await hashPassword(rawPassword)
  const result = await sql<StaffRow>`
    INSERT INTO staff (id, staff_id, name, role, department, status, email, phone, hire_date,
                       salary, address, qualification, gender, date_of_birth, emergency_contact, emergency_phone, password_hash)
    VALUES (${id}, ${staffId}, ${payload.name}, ${payload.role}, ${payload.department},
            ${payload.status || 'active'}, ${payload.email}, ${payload.phone}, ${payload.hireDate},
            ${payload.salary ?? null}, ${payload.address ?? null}, ${payload.qualification ?? null},
            ${payload.gender ?? null}, ${payload.dateOfBirth ?? null},
            ${payload.emergencyContact ?? null}, ${payload.emergencyPhone ?? null}, ${passwordHash})
    RETURNING *
  `
  return rowToStaff(result.rows[0])
}

export async function updateStaffMember(id: string, payload: Partial<StaffPayload>): Promise<Staff | null> {
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
      WHERE id = ${id}
      RETURNING *
    `
    return result.rows[0] ? rowToStaff(result.rows[0]) : null
  } catch (error) {
    console.error('Error updating staff:', error)
    return null
  }
}

export async function deleteStaffMember(id: string): Promise<boolean> {
  try {
    await sql`DELETE FROM staff WHERE id = ${id}`
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

export async function fetchLeaveRequests(staffId?: string, status?: string): Promise<LeaveRequest[]> {
  await ensureStaffTables()
  try {
    if (staffId && status) {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave WHERE staff_id = ${staffId} AND status = ${status} ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    } else if (staffId) {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave WHERE staff_id = ${staffId} ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    } else if (status) {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave WHERE status = ${status} ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    } else {
      const result = await sql<LeaveRow>`SELECT * FROM staff_leave ORDER BY created_at DESC`
      return result.rows.map(rowToLeave)
    }
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return []
  }
}

export async function createLeaveRequest(payload: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
  await ensureStaffTables()
  const id = `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const result = await sql<LeaveRow>`
    INSERT INTO staff_leave (id, staff_id, staff_name, leave_type, start_date, end_date, days, reason, status)
    VALUES (${id}, ${payload.staffId}, ${payload.staffName}, ${payload.leaveType},
            ${payload.startDate}, ${payload.endDate}, ${payload.days}, ${payload.reason}, ${payload.status || 'pending'})
    RETURNING *
  `
  return rowToLeave(result.rows[0])
}

export async function updateLeaveStatus(id: string, status: string, approvedBy?: string): Promise<LeaveRequest | null> {
  try {
    const result = await sql<LeaveRow>`
      UPDATE staff_leave SET status = ${status}, approved_by = ${approvedBy ?? null}, updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `
    return result.rows[0] ? rowToLeave(result.rows[0]) : null
  } catch (error) {
    console.error('Error updating leave status:', error)
    return null
  }
}

// ── Attendance ──────────────────────────────────────────────────────────────

export async function fetchAttendance(date?: string, staffId?: string): Promise<Attendance[]> {
  await ensureStaffTables()
  try {
    if (date && staffId) {
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE date = ${date} AND staff_id = ${staffId}`
      return result.rows.map(rowToAttendance)
    } else if (date) {
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE date = ${date} ORDER BY staff_name ASC`
      return result.rows.map(rowToAttendance)
    } else if (staffId) {
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE staff_id = ${staffId} ORDER BY date DESC`
      return result.rows.map(rowToAttendance)
    } else {
      const today = new Date().toISOString().split('T')[0]
      const result = await sql<AttendanceRow>`SELECT * FROM staff_attendance WHERE date = ${today} ORDER BY staff_name ASC`
      return result.rows.map(rowToAttendance)
    }
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return []
  }
}

export async function markAttendance(payload: Omit<Attendance, 'id' | 'createdAt'>): Promise<Attendance> {
  await ensureStaffTables()
  const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const result = await sql<AttendanceRow>`
    INSERT INTO staff_attendance (id, staff_id, staff_name, date, check_in, check_out, status, notes)
    VALUES (${id}, ${payload.staffId}, ${payload.staffName}, ${payload.date},
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

export async function fetchPayroll(month?: string, year?: number): Promise<PayrollRecord[]> {
  await ensureStaffTables()
  try {
    const currentYear = year || new Date().getFullYear()
    const currentMonth = month || new Date().toLocaleString('default', { month: 'long' })
    const result = await sql<PayrollRow>`
      SELECT * FROM staff_payroll WHERE month = ${currentMonth} AND year = ${currentYear} ORDER BY staff_name ASC
    `
    return result.rows.map(rowToPayroll)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return []
  }
}

export async function generatePayroll(staffId: string, staffName: string, month: string, year: number, basicSalary: number, allowances: number, deductions: number): Promise<PayrollRecord> {
  await ensureStaffTables()
  const id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const netSalary = basicSalary + allowances - deductions
  const result = await sql<PayrollRow>`
    INSERT INTO staff_payroll (id, staff_id, staff_name, month, year, basic_salary, allowances, deductions, net_salary, status)
    VALUES (${id}, ${staffId}, ${staffName}, ${month}, ${year}, ${basicSalary}, ${allowances}, ${deductions}, ${netSalary}, 'pending')
    ON CONFLICT (staff_id, month, year) DO UPDATE SET
      basic_salary = EXCLUDED.basic_salary,
      allowances = EXCLUDED.allowances,
      deductions = EXCLUDED.deductions,
      net_salary = EXCLUDED.net_salary
    RETURNING *
  `
  return rowToPayroll(result.rows[0])
}

export async function updatePayrollStatus(id: string, status: string, paymentDate?: string): Promise<PayrollRecord | null> {
  try {
    const result = await sql<PayrollRow>`
      UPDATE staff_payroll SET status = ${status}, payment_date = ${paymentDate ?? null} WHERE id = ${id} RETURNING *
    `
    return result.rows[0] ? rowToPayroll(result.rows[0]) : null
  } catch (error) {
    console.error('Error updating payroll status:', error)
    return null
  }
}
