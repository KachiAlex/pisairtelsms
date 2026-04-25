import { sql } from '@vercel/postgres'

export interface Staff {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on_leave'
  email: string
  phone: string
  hireDate: string
  createdAt: string
  updatedAt: string
}

export interface StaffPayload {
  name: string
  role: string
  department: string
  email: string
  phone: string
  hireDate: string
  status?: 'active' | 'inactive' | 'on_leave'
}

interface StaffRow {
  id: string
  name: string
  role: string
  department: string
  status: string
  email: string
  phone: string
  hire_date: Date
  created_at: Date
  updated_at: Date
}

function rowToStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    status: row.status as Staff['status'],
    email: row.email,
    phone: row.phone,
    hireDate: row.hire_date instanceof Date ? row.hire_date.toISOString().split('T')[0] : String(row.hire_date),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function ensureStaffTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        email TEXT,
        phone TEXT,
        hire_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department)`
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status)`
  } catch (error) {
    console.error('Error ensuring staff table:', error)
  }
}

export async function fetchStaff(department?: string, status?: string): Promise<Staff[]> {
  await ensureStaffTable()
  try {
    if (department && status) {
      const result = await sql<StaffRow>`
        SELECT * FROM staff WHERE department = ${department} AND status = ${status} ORDER BY hire_date DESC
      `
      return result.rows.map(rowToStaff)
    } else if (department) {
      const result = await sql<StaffRow>`
        SELECT * FROM staff WHERE department = ${department} ORDER BY hire_date DESC
      `
      return result.rows.map(rowToStaff)
    } else if (status) {
      const result = await sql<StaffRow>`
        SELECT * FROM staff WHERE status = ${status} ORDER BY hire_date DESC
      `
      return result.rows.map(rowToStaff)
    } else {
      const result = await sql<StaffRow>`SELECT * FROM staff ORDER BY hire_date DESC`
      return result.rows.map(rowToStaff)
    }
  } catch (error) {
    console.error('Error fetching staff:', error)
    return []
  }
}

export async function createStaffMember(payload: StaffPayload): Promise<Staff> {
  await ensureStaffTable()
  const id = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const result = await sql<StaffRow>`
    INSERT INTO staff (id, name, role, department, status, email, phone, hire_date)
    VALUES (${id}, ${payload.name}, ${payload.role}, ${payload.department},
            ${payload.status || 'active'}, ${payload.email}, ${payload.phone}, ${payload.hireDate})
    RETURNING *
  `
  return rowToStaff(result.rows[0])
}
