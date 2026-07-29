import { sql } from '@vercel/postgres'

export interface StudentScore {
  id: string
  studentId: string
  subject: string
  academicSession: string
  term: string
  caScore: number
  examScore: number
  totalScore: number
  attendancePercentage: number
  class: string
  createdAt: string
  updatedAt: string
}

export interface ScorePayload {
  studentId: string
  subject: string
  academicSession: string
  term: string
  caScore: number
  examScore: number
  attendancePercentage: number
  class: string
}

interface ScoreRow {
  id: string
  student_id: string
  subject: string
  academic_session: string
  term: string
  ca_score: string
  exam_score: string
  total_score: string
  attendance_percentage: string
  class: string
  created_at: Date
  updated_at: Date
}

function rowToScore(row: ScoreRow): StudentScore {
  return {
    id: row.id,
    studentId: row.student_id,
    subject: row.subject,
    academicSession: row.academic_session,
    term: row.term,
    caScore: parseFloat(row.ca_score),
    examScore: parseFloat(row.exam_score),
    totalScore: parseFloat(row.total_score),
    attendancePercentage: parseFloat(row.attendance_percentage),
    class: row.class,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function ensureResultsTable(): Promise<void> {
  try {
    } catch (error) {
    console.error('Error ensuring student_scores table:', error)
  }
}

export async function fetchScores(
  tenantId: string,
  studentId?: string,
  academicSession?: string,
  term?: string,
  className?: string
): Promise<StudentScore[]> {
  await ensureResultsTable()
  try {
    // Build dynamic query using conditional logic
    if (studentId && academicSession && term) {
      const result = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId} AND student_id = ${studentId}
          AND academic_session = ${academicSession}
          AND term = ${term}
        ORDER BY created_at DESC
      `
      return result.rows.map(rowToScore)
    } else if (studentId && academicSession) {
      const result = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId} AND student_id = ${studentId}
          AND academic_session = ${academicSession}
        ORDER BY created_at DESC
      `
      return result.rows.map(rowToScore)
    } else if (studentId) {
      const result = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId} AND student_id = ${studentId}
        ORDER BY created_at DESC
      `
      return result.rows.map(rowToScore)
    } else if (academicSession && term && className) {
      const result = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession}
          AND term = ${term}
          AND class = ${className}
        ORDER BY created_at DESC
      `
      return result.rows.map(rowToScore)
    } else if (academicSession && term) {
      const result = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession}
          AND term = ${term}
        ORDER BY created_at DESC
      `
      return result.rows.map(rowToScore)
    } else {
      const result = await sql<ScoreRow>`
        SELECT * FROM student_scores WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
      `
      return result.rows.map(rowToScore)
    }
  } catch (error) {
    console.error('Error fetching scores:', error)
    return []
  }
}

export async function createScore(tenantId: string, payload: ScorePayload): Promise<StudentScore> {
  await ensureResultsTable()
  const id = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const totalScore = payload.caScore + payload.examScore

  const result = await sql<ScoreRow>`
    INSERT INTO student_scores
      (id, tenant_id, student_id, subject, academic_session, term, ca_score, exam_score, total_score, attendance_percentage, class)
    VALUES
      (${id}, ${tenantId}, ${payload.studentId}, ${payload.subject}, ${payload.academicSession}, ${payload.term},
       ${payload.caScore}, ${payload.examScore}, ${totalScore}, ${payload.attendancePercentage}, ${payload.class})
    ON CONFLICT (tenant_id, student_id, subject, academic_session, term)
    DO UPDATE SET
      ca_score = EXCLUDED.ca_score,
      exam_score = EXCLUDED.exam_score,
      total_score = EXCLUDED.total_score,
      attendance_percentage = EXCLUDED.attendance_percentage,
      updated_at = NOW()
    RETURNING *
  `
  return rowToScore(result.rows[0])
}
