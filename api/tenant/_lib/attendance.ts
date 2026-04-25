import { sql } from '@vercel/postgres'

export interface AttendanceRecord {
  id: string
  studentId: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
  academicSession: string
  term: string
  createdAt: string
}

export interface AttendancePayload {
  studentId: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
  academicSession: string
  term: string
}

interface AttendanceRow {
  id: string
  student_id: string
  class: string
  date: Date
  status: string
  academic_session: string
  term: string
  created_at: Date
}

function rowToAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    class: row.class,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    status: row.status as AttendanceRecord['status'],
    academicSession: row.academic_session,
    term: row.term,
    createdAt: row.created_at.toISOString(),
  }
}

export async function ensureAttendanceTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        class TEXT NOT NULL,
        date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(student_id, date)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance_records(class, date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_attendance_session_term ON attendance_records(academic_session, term)`
  } catch (error) {
    console.error('Error ensuring attendance_records table:', error)
  }
}

export async function fetchAttendance(
  className?: string,
  date?: string,
  term?: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> {
  await ensureAttendanceTable()
  try {
    if (className && date) {
      const result = await sql<AttendanceRow>`
        SELECT * FROM attendance_records WHERE class = ${className} AND date = ${date} ORDER BY created_at DESC
      `
      return result.rows.map(rowToAttendance)
    } else if (className && startDate && endDate) {
      const result = await sql<AttendanceRow>`
        SELECT * FROM attendance_records
        WHERE class = ${className} AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date DESC
      `
      return result.rows.map(rowToAttendance)
    } else if (className && term) {
      const result = await sql<AttendanceRow>`
        SELECT * FROM attendance_records WHERE class = ${className} AND term = ${term} ORDER BY date DESC
      `
      return result.rows.map(rowToAttendance)
    } else if (className) {
      const result = await sql<AttendanceRow>`
        SELECT * FROM attendance_records WHERE class = ${className} ORDER BY date DESC
      `
      return result.rows.map(rowToAttendance)
    } else {
      const result = await sql<AttendanceRow>`SELECT * FROM attendance_records ORDER BY date DESC`
      return result.rows.map(rowToAttendance)
    }
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return []
  }
}

export async function upsertAttendanceBatch(records: AttendancePayload[]): Promise<number> {
  await ensureAttendanceTable()
  let count = 0
  for (const record of records) {
    const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await sql`
      INSERT INTO attendance_records (id, student_id, class, date, status, academic_session, term)
      VALUES (${id}, ${record.studentId}, ${record.class}, ${record.date}, ${record.status}, ${record.academicSession}, ${record.term})
      ON CONFLICT (student_id, date)
      DO UPDATE SET status = EXCLUDED.status, class = EXCLUDED.class, academic_session = EXCLUDED.academic_session, term = EXCLUDED.term
    `
    count++
  }
  return count
}
