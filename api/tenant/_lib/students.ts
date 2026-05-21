/**
 * Students Database Library
 * Handles all database operations for student management
 */

import { queryAll, queryOne, query, transaction } from '../cbt/_lib/db.js';
import { fetchTenantSettings } from './tenant-settings.js';

// Internal API-layer Student type (camelCase, for API responses only)
interface StudentDTO {
  id: string;
  admissionNo: string;
  name: string;
  class: string;
  arm: string;
  gender: string;
  status: 'Active' | 'Suspended' | 'Graduated';
  guardian: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentPayload {
  admissionNo?: string;
  name: string;
  class: string;
  arm: string;
  gender: string;
  status: 'Active' | 'Suspended' | 'Graduated';
  guardian: string;
  phone: string;
}

/**
 * Generate a unique admission number for a tenant using their configured format.
 * Tokens: {PREFIX} = first 3 letters of school name, {YEAR} = current year, {SEQ} = padded count
 */
async function generateAdmissionNo(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();

  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM students WHERE tenant_id = $1`,
    [tenantId]
  );
  const next = parseInt(row?.count || '0') + 1;

  let format = '{PREFIX}/{YEAR}/{SEQ}';
  let digits = 4;
  let prefix = 'SCH';

  try {
    const settings = await fetchTenantSettings();
    if (settings.admissionNoFormat) format = settings.admissionNoFormat;
    if (settings.admissionNoDigits) digits = settings.admissionNoDigits;
    if (settings.schoolName) {
      prefix = settings.schoolName.split(' ')[0].toUpperCase().slice(0, 3);
    }
  } catch {
    // fall back to defaults if settings fetch fails
  }

  const seq = String(next).padStart(digits, '0');
  return format
    .replace('{PREFIX}', prefix)
    .replace('{YEAR}', String(year))
    .replace('{SEQ}', seq);
}

/**
 * Convert database row to StudentDTO
 */
function rowToDTO(row: any): StudentDTO {
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
    created_at: row.created_at?.toISOString(),
    updated_at: row.updated_at?.toISOString(),
  };
}

/**
 * Fetch all students for a tenant
 */
export async function fetchStudents(tenantId: string): Promise<StudentDTO[]> {
  try {
    const rows = await queryAll<any>(
      `SELECT id, admission_no, name, class, arm, gender, status, guardian, phone, created_at, updated_at
       FROM students
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return rows.map(rowToDTO);
  } catch (error) {
    console.error('Error fetching students:', error);
    throw new Error('Failed to fetch students');
  }
}

/**
 * Fetch a single student by ID
 */
export async function getStudent(id: string, tenantId: string): Promise<StudentDTO | null> {
  try {
    const row = await queryOne<any>(
      `SELECT id, admission_no, name, class, arm, gender, status, guardian, phone, created_at, updated_at
       FROM students
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    return row ? rowToDTO(row) : null;
  } catch (error) {
    console.error('Error fetching student:', error);
    throw new Error('Failed to fetch student');
  }
}

/**
 * Create a single student
 */
export async function createStudent(tenantId: string, studentData: StudentPayload): Promise<StudentDTO> {
  try {
    const admissionNo = studentData.admissionNo || await generateAdmissionNo(tenantId);
    const row = await queryOne<any>(
      `INSERT INTO students (tenant_id, admission_no, name, class, arm, gender, status, guardian, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, admission_no, name, class, arm, gender, status, guardian, phone, created_at, updated_at`,
      [
        tenantId,
        admissionNo,
        studentData.name,
        studentData.class,
        studentData.arm,
        studentData.gender,
        studentData.status,
        studentData.guardian,
        studentData.phone,
      ]
    );

    if (!row) {
      throw new Error('Failed to create student');
    }

    return rowToDTO(row);
  } catch (error) {
    console.error('Error creating student:', error);
    throw new Error('Failed to create student');
  }
}

/**
 * Create multiple students in a transaction
 */
export async function createStudents(tenantId: string, studentsData: StudentPayload[]): Promise<StudentDTO[]> {
  try {
    const createdStudents: StudentDTO[] = [];

    for (const studentData of studentsData) {
      const student = await createStudent(tenantId, studentData);
      createdStudents.push(student);
    }

    return createdStudents;
  } catch (error) {
    console.error('Error creating students:', error);
    throw new Error('Failed to create students');
  }
}

/**
 * Update a student
 */
export async function updateStudent(
  id: string,
  tenantId: string,
  studentData: Partial<StudentPayload>
): Promise<StudentDTO | null> {
  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [id, tenantId];
    let paramIndex = 3;

    if (studentData.admissionNo !== undefined) {
      updates.push(`admission_no = $${paramIndex++}`);
      values.push(studentData.admissionNo);
    }
    if (studentData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(studentData.name);
    }
    if (studentData.class !== undefined) {
      updates.push(`class = $${paramIndex++}`);
      values.push(studentData.class);
    }
    if (studentData.arm !== undefined) {
      updates.push(`arm = $${paramIndex++}`);
      values.push(studentData.arm);
    }
    if (studentData.gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(studentData.gender);
    }
    if (studentData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(studentData.status);
    }
    if (studentData.guardian !== undefined) {
      updates.push(`guardian = $${paramIndex++}`);
      values.push(studentData.guardian);
    }
    if (studentData.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(studentData.phone);
    }

    if (updates.length === 0) {
      return getStudent(id, tenantId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const row = await queryOne<any>(
      `UPDATE students
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, admission_no, name, class, arm, gender, status, guardian, phone, created_at, updated_at`,
      values
    );

    return row ? rowToDTO(row) : null;
  } catch (error) {
    console.error('Error updating student:', error);
    throw new Error('Failed to update student');
  }
}

/**
 * Soft delete a student
 */
export async function deleteStudent(id: string, tenantId: string): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE students
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error deleting student:', error);
    throw new Error('Failed to delete student');
  }
}
