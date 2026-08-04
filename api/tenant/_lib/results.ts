import { sql } from '@vercel/postgres'
import { getTenantCAConfig, type CAConfig } from './ca-config.js'

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
  testsScore: number | null
  assignmentsScore: number | null
  projectsScore: number | null
  examsScore: number | null
  submittedBy: string | null
  submittedByName: string | null
  submissionStatus: 'draft' | 'submitted' | 'approved'
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
  testsScore?: number
  assignmentsScore?: number
  projectsScore?: number
  examsScore?: number
  submittedBy?: string
  submittedByName?: string
  submissionStatus?: 'draft' | 'submitted' | 'approved'
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
  tests_score: string | null
  assignments_score: string | null
  projects_score: string | null
  exams_score: string | null
  submitted_by: string | null
  submitted_by_name: string | null
  submission_status: string
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
    testsScore: row.tests_score !== null ? parseFloat(row.tests_score) : null,
    assignmentsScore: row.assignments_score !== null ? parseFloat(row.assignments_score) : null,
    projectsScore: row.projects_score !== null ? parseFloat(row.projects_score) : null,
    examsScore: row.exams_score !== null ? parseFloat(row.exams_score) : null,
    submittedBy: row.submitted_by,
    submittedByName: row.submitted_by_name,
    submissionStatus: (row.submission_status as 'draft' | 'submitted' | 'approved') || 'submitted',
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function ensureResultsTable(): Promise<void> {
  try {
    await sql`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS tests_score NUMERIC DEFAULT 0`
    await sql`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS assignments_score NUMERIC DEFAULT 0`
    await sql`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS projects_score NUMERIC DEFAULT 0`
    await sql`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS exams_score NUMERIC DEFAULT 0`
    await sql`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by TEXT`
    await sql`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by_name TEXT`
    await sql`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted'`
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

function getLevelForClass(className: string): 'primary' | 'jss' | 'sss' {
  const upper = className.toUpperCase()
  if (upper.includes('SS') || upper.includes('SENIOR') || upper.includes('SSS')) return 'sss'
  if (upper.includes('JSS') || upper.includes('JUNIOR') || upper.includes('JS')) return 'jss'
  return 'primary'
}

export async function computeWeightedTotal(
  tenantId: string,
  className: string,
  scores: { testsScore: number; assignmentsScore: number; projectsScore: number; examsScore: number }
): Promise<number> {
  try {
    const config = await getTenantCAConfig(tenantId)
    const level = getLevelForClass(className)
    const weights = config.published[level]

    const weightedTotal =
      (scores.testsScore * weights.tests +
       scores.assignmentsScore * weights.assignments +
       scores.projectsScore * weights.projects +
       scores.examsScore * weights.exams) / 100

    return Math.round(weightedTotal * 100) / 100
  } catch (error) {
    console.error('Error computing weighted total, falling back to simple sum:', error)
    return Math.round((scores.testsScore + scores.assignmentsScore + scores.projectsScore + scores.examsScore) * 100) / 100
  }
}

export async function fetchScoresByClassAndSubject(
  tenantId: string,
  className: string,
  subject: string,
  academicSession: string,
  term: string
): Promise<StudentScore[]> {
  await ensureResultsTable()
  try {
    const result = await sql<ScoreRow>`
      SELECT * FROM student_scores
      WHERE tenant_id = ${tenantId}
        AND class = ${className}
        AND subject = ${subject}
        AND academic_session = ${academicSession}
        AND term = ${term}
      ORDER BY student_id ASC
    `
    return result.rows.map(rowToScore)
  } catch (error) {
    console.error('Error fetching scores by class/subject:', error)
    return []
  }
}

export async function fetchTeacherSubmissions(
  tenantId: string,
  academicSession: string,
  term: string,
  className?: string
): Promise<{ submittedBy: string; submittedByName: string; subject: string; class: string; status: string; updatedAt: string }[]> {
  await ensureResultsTable()
  try {
    if (className) {
      const result = await sql`
        SELECT DISTINCT submitted_by, submitted_by_name, subject, class, submission_status, updated_at
        FROM student_scores
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND class = ${className}
          AND submitted_by IS NOT NULL
        ORDER BY updated_at DESC
      `
      return result.rows.map((r: any) => ({
        submittedBy: r.submitted_by,
        submittedByName: r.submitted_by_name,
        subject: r.subject,
        class: r.class,
        status: r.submission_status,
        updatedAt: r.updated_at.toISOString(),
      }))
    } else {
      const result = await sql`
        SELECT DISTINCT submitted_by, submitted_by_name, subject, class, submission_status, updated_at
        FROM student_scores
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND submitted_by IS NOT NULL
        ORDER BY updated_at DESC
      `
      return result.rows.map((r: any) => ({
        submittedBy: r.submitted_by,
        submittedByName: r.submitted_by_name,
        subject: r.subject,
        class: r.class,
        status: r.submission_status,
        updatedAt: r.updated_at.toISOString(),
      }))
    }
  } catch (error) {
    console.error('Error fetching teacher submissions:', error)
    return []
  }
}

export async function createScore(tenantId: string, payload: ScorePayload): Promise<StudentScore> {
  await ensureResultsTable()
  const id = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const testsScore = payload.testsScore ?? 0
  const assignmentsScore = payload.assignmentsScore ?? 0
  const projectsScore = payload.projectsScore ?? 0
  const examsScore = payload.examsScore ?? 0

  // Compute weighted total using CA config, or fall back to simple sum
  const totalScore = await computeWeightedTotal(tenantId, payload.class, {
    testsScore, assignmentsScore, projectsScore, examsScore,
  })

  // caScore = aggregate of tests + assignments + projects (CA components)
  // examScore = exams_score (exam component)
  const caScore = testsScore + assignmentsScore + projectsScore
  const examScore = examsScore

  const submittedBy = payload.submittedBy ?? null
  const submittedByName = payload.submittedByName ?? null
  const submissionStatus = payload.submissionStatus ?? 'submitted'

  const result = await sql<ScoreRow>`
    INSERT INTO student_scores
      (id, tenant_id, student_id, subject, academic_session, term,
       ca_score, exam_score, total_score, attendance_percentage, class,
       tests_score, assignments_score, projects_score, exams_score,
       submitted_by, submitted_by_name, submission_status)
    VALUES
      (${id}, ${tenantId}, ${payload.studentId}, ${payload.subject}, ${payload.academicSession}, ${payload.term},
       ${caScore}, ${examScore}, ${totalScore}, ${payload.attendancePercentage}, ${payload.class},
       ${testsScore}, ${assignmentsScore}, ${projectsScore}, ${examsScore},
       ${submittedBy}, ${submittedByName}, ${submissionStatus})
    ON CONFLICT (tenant_id, student_id, subject, academic_session, term)
    DO UPDATE SET
      ca_score = EXCLUDED.ca_score,
      exam_score = EXCLUDED.exam_score,
      total_score = EXCLUDED.total_score,
      attendance_percentage = EXCLUDED.attendance_percentage,
      tests_score = EXCLUDED.tests_score,
      assignments_score = EXCLUDED.assignments_score,
      projects_score = EXCLUDED.projects_score,
      exams_score = EXCLUDED.exams_score,
      submitted_by = EXCLUDED.submitted_by,
      submitted_by_name = EXCLUDED.submitted_by_name,
      submission_status = EXCLUDED.submission_status,
      updated_at = NOW()
    RETURNING *
  `
  return rowToScore(result.rows[0])
}

export async function recomputeAllScores(
  tenantId: string,
  academicSession?: string,
  term?: string,
  className?: string
): Promise<{ recomputed: number; details: { studentId: string; subject: string; class: string; oldTotal: number; newTotal: number }[] }> {
  await ensureResultsTable()
  try {
    let query
    if (className && academicSession && term) {
      query = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId} AND class = ${className}
          AND academic_session = ${academicSession} AND term = ${term}
      `
    } else if (academicSession && term) {
      query = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession} AND term = ${term}
      `
    } else {
      query = await sql<ScoreRow>`
        SELECT * FROM student_scores WHERE tenant_id = ${tenantId}
      `
    }

    const details: { studentId: string; subject: string; class: string; oldTotal: number; newTotal: number }[] = []
    let recomputed = 0

    for (const row of query.rows) {
      const oldTotal = parseFloat(row.total_score)
      const newTotal = await computeWeightedTotal(tenantId, row.class, {
        testsScore: row.tests_score !== null ? parseFloat(row.tests_score) : 0,
        assignmentsScore: row.assignments_score !== null ? parseFloat(row.assignments_score) : 0,
        projectsScore: row.projects_score !== null ? parseFloat(row.projects_score) : 0,
        examsScore: row.exams_score !== null ? parseFloat(row.exams_score) : 0,
      })

      if (Math.abs(oldTotal - newTotal) > 0.01) {
        await sql`
          UPDATE student_scores SET total_score = ${newTotal}, updated_at = NOW()
          WHERE id = ${row.id}
        `
        recomputed++
        details.push({
          studentId: row.student_id,
          subject: row.subject,
          class: row.class,
          oldTotal,
          newTotal,
        })
      }
    }

    return { recomputed, details }
  } catch (error) {
    console.error('Error recomputing scores:', error)
    return { recomputed: 0, details: [] }
  }
}
