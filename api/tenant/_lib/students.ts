import { sql } from '@vercel/postgres';

// Internal DB row type — snake_case, never exported to frontend
interface StudentRow {
  id: string;
  admission_no: string;
  name: string;
  class: string;
  arm: string;
  gender: string;
  status: string;
  guardian: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

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
  admissionNo: string;
  name: string;
  class: string;
  arm: string;
  gender: string;
  status: 'Active' | 'Suspended' | 'Graduated';
  guardian: string;
  phone: string;
}

function rowToStudent(row: StudentRow): StudentDTO {
  return {
    id: row.id,
    admissionNo: row.admission_no,
    name: row.name,
    class: row.class,
    arm: row.arm,
    gender: row.gender,
    status: row.status as StudentDTO['status'],
    guardian: row.guardian,
    phone: row.phone,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function ensureStudentsTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        admission_no TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        class TEXT NOT NULL,
        arm TEXT NOT NULL,
        gender TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        guardian TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create index on admission_no for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(admission_no)
    `;

    console.log('Students table ensured.');
  } catch (error) {
    console.error('Error ensuring students table:', error);
  }
}

export async function fetchStudents(): Promise<StudentDTO[]> {
  try {
    await ensureStudentsTable();

    const result = await sql<StudentRow>`
      SELECT * FROM students ORDER BY created_at DESC
    `;

    return result.rows.map(rowToStudent);
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
}

export async function createStudent(studentData: StudentPayload): Promise<StudentDTO> {
  try {
    await ensureStudentsTable();

    // Generate ID
    const id = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await sql<StudentRow>`
      INSERT INTO students (id, admission_no, name, class, arm, gender, status, guardian, phone)
      VALUES (${id}, ${studentData.admissionNo}, ${studentData.name}, ${studentData.class},
              ${studentData.arm}, ${studentData.gender}, ${studentData.status},
              ${studentData.guardian}, ${studentData.phone})
      RETURNING *
    `;

    const row = result.rows[0];
    return rowToStudent(row);
  } catch (error) {
    console.error('Error creating student:', error);
    throw new Error('Failed to create student');
  }
}

export async function createStudents(studentsData: StudentPayload[]): Promise<StudentDTO[]> {
  try {
    await ensureStudentsTable();

    const createdStudents: StudentDTO[] = [];

    for (const studentData of studentsData) {
      const student = await createStudent(studentData);
      createdStudents.push(student);
    }

    return createdStudents;
  } catch (error) {
    console.error('Error creating students:', error);
    throw new Error('Failed to create students');
  }
}

export async function updateStudent(id: string, studentData: Partial<StudentPayload>): Promise<StudentDTO | null> {
  try {
    await ensureStudentsTable();

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (studentData.admissionNo !== undefined) {
      updateFields.push(`admission_no = $${paramIndex++}`);
      values.push(studentData.admissionNo);
    }
    if (studentData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(studentData.name);
    }
    if (studentData.class !== undefined) {
      updateFields.push(`class = $${paramIndex++}`);
      values.push(studentData.class);
    }
    if (studentData.arm !== undefined) {
      updateFields.push(`arm = $${paramIndex++}`);
      values.push(studentData.arm);
    }
    if (studentData.gender !== undefined) {
      updateFields.push(`gender = $${paramIndex++}`);
      values.push(studentData.gender);
    }
    if (studentData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(studentData.status);
    }
    if (studentData.guardian !== undefined) {
      updateFields.push(`guardian = $${paramIndex++}`);
      values.push(studentData.guardian);
    }
    if (studentData.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      values.push(studentData.phone);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id); // Add ID at the end

    const result = await sql<StudentRow>`
      UPDATE students
      SET ${sql.raw(updateFields.join(', '))}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return rowToStudent(row);
  } catch (error) {
    console.error('Error updating student:', error);
    throw new Error('Failed to update student');
  }
}

export async function deleteStudent(id: string): Promise<boolean> {
  try {
    await ensureStudentsTable();

    const result = await sql`
      DELETE FROM students WHERE id = ${id}
    `;

    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting student:', error);
    return false;
  }
}
