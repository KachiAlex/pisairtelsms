import { sql } from '@vercel/postgres'

// Internal DB row type — snake_case
export interface ApplicationRow {
  id: string
  student_name: string
  parent_name: string
  contact_phone: string
  contact_email: string
  class_applying: string
  status: string
  academic_session: string | null
  source: string | null
  created_at: Date
  updated_at: Date
}

// DTO for API responses — camelCase
export interface ApplicationDTO {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  academicSession: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationPayload {
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  academicSession?: string
  source?: string
}

function rowToDTO(row: ApplicationRow): ApplicationDTO {
  return {
    id: row.id,
    studentName: row.student_name,
    parentName: row.parent_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    classApplying: row.class_applying,
    status: row.status as ApplicationDTO['status'],
    academicSession: row.academic_session,
    source: row.source,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

export async function ensureApplicationsTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_name VARCHAR(255) NOT NULL,
        parent_name VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        class_applying VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
        academic_session VARCHAR(20),
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)
    `
  } catch (error) {
    console.error('Error ensuring applications table:', error)
  }
}

export async function fetchApplications(
  status?: string,
  academicSession?: string
): Promise<ApplicationDTO[]> {
  try {
    await ensureApplicationsTable()

    let rows: ApplicationRow[]

    if (status && academicSession) {
      const result = await sql<ApplicationRow>`
        SELECT * FROM applications
        WHERE status = ${status} AND academic_session = ${academicSession}
        ORDER BY created_at DESC
      `
      rows = result.rows
    } else if (status) {
      const result = await sql<ApplicationRow>`
        SELECT * FROM applications
        WHERE status = ${status}
        ORDER BY created_at DESC
      `
      rows = result.rows
    } else if (academicSession) {
      const result = await sql<ApplicationRow>`
        SELECT * FROM applications
        WHERE academic_session = ${academicSession}
        ORDER BY created_at DESC
      `
      rows = result.rows
    } else {
      const result = await sql<ApplicationRow>`
        SELECT * FROM applications ORDER BY created_at DESC
      `
      rows = result.rows
    }

    return rows.map(rowToDTO)
  } catch (error) {
    console.error('Error fetching applications:', error)
    return []
  }
}

export async function createApplication(payload: ApplicationPayload): Promise<ApplicationDTO> {
  await ensureApplicationsTable()

  const result = await sql<ApplicationRow>`
    INSERT INTO applications (student_name, parent_name, contact_phone, contact_email, class_applying, academic_session, source)
    VALUES (
      ${payload.studentName},
      ${payload.parentName},
      ${payload.contactPhone},
      ${payload.contactEmail},
      ${payload.classApplying},
      ${payload.academicSession ?? null},
      ${payload.source ?? null}
    )
    RETURNING *
  `
  return rowToDTO(result.rows[0])
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationDTO['status']
): Promise<ApplicationDTO | null> {
  await ensureApplicationsTable()

  const result = await sql<ApplicationRow>`
    UPDATE applications
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  if (result.rows.length === 0) return null
  return rowToDTO(result.rows[0])
}
