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

// ─── Compiled Results ──────────────────────────────────────────────

interface CompiledResult {
  studentId: string
  subject: string
  class: string
  totalScore: number
  grade: string
  remark: string
  classAverage: number
  highestScore: number
  lowestScore: number
  subjectPosition: number
  overallTotal: number
  overallAverage: number
  classPosition: number
  totalStudents: number
  attendancePercent: number
  principalComment: string
}

function assignGrade(score: number): string {
  if (score >= 80) return 'A1'
  if (score >= 70) return 'B2'
  if (score >= 65) return 'B3'
  if (score >= 60) return 'C4'
  if (score >= 55) return 'C5'
  if (score >= 50) return 'C6'
  if (score >= 45) return 'D7'
  if (score >= 40) return 'E8'
  return 'F9'
}

function gradeRemark(grade: string): string {
  const remarks: Record<string, string> = {
    A1: 'Distinction', B2: 'Very Good', B3: 'Good',
    C4: 'Credit', C5: 'Credit', C6: 'Satisfactory',
    D7: 'Pass', E8: 'Marginal Pass', F9: 'Fail',
  }
  return remarks[grade] || ''
}

function principalCommentFor(avg: number): string {
  if (avg >= 75) return 'Excellent performance. Keep up the outstanding work.'
  if (avg >= 60) return 'Very good performance. Continue to work hard.'
  if (avg >= 50) return 'Satisfactory performance. There is room for improvement.'
  if (avg >= 40) return 'Below average performance. More effort is required.'
  return 'Poor performance. Urgent intervention needed.'
}

async function ensureCompiledResultsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS compiled_results (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      class TEXT NOT NULL,
      academic_session TEXT NOT NULL,
      term TEXT NOT NULL,
      total_score NUMERIC(5,2) DEFAULT 0,
      grade TEXT,
      remark TEXT,
      class_average NUMERIC(5,2) DEFAULT 0,
      highest_score NUMERIC(5,2) DEFAULT 0,
      lowest_score NUMERIC(5,2) DEFAULT 0,
      subject_position INTEGER DEFAULT 0,
      overall_total NUMERIC(6,2) DEFAULT 0,
      overall_average NUMERIC(5,2) DEFAULT 0,
      class_position INTEGER DEFAULT 0,
      total_students INTEGER DEFAULT 0,
      attendance_percent NUMERIC(5,2) DEFAULT 0,
      principal_comment TEXT,
      status TEXT DEFAULT 'compiled',
      compiled_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, student_id, subject, academic_session, term)
    )
  `
}

export async function compileResults(
  tenantId: string,
  academicSession: string,
  term: string,
  className?: string
): Promise<{ compiled: number; results: CompiledResult[] }> {
  await ensureResultsTable()
  await ensureCompiledResultsTable()

  try {
    // Fetch all submitted/approved scores for the scope
    let scoresQuery
    if (className) {
      scoresQuery = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND class = ${className}
          AND submission_status IN ('submitted', 'approved')
      `
    } else {
      scoresQuery = await sql<ScoreRow>`
        SELECT * FROM student_scores
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND submission_status IN ('submitted', 'approved')
      `
    }

    if (scoresQuery.rows.length === 0) {
      return { compiled: 0, results: [] }
    }

    // Group by class
    const classGroups: Record<string, ScoreRow[]> = {}
    for (const row of scoresQuery.rows) {
      const cls = row.class || 'Unknown'
      if (!classGroups[cls]) classGroups[cls] = []
      classGroups[cls].push(row)
    }

    const allResults: CompiledResult[] = []
    let compiledCount = 0

    for (const cls of Object.keys(classGroups)) {
      const classRows = classGroups[cls]

      // Group by subject for subject-level stats
      const subjectGroups: Record<string, ScoreRow[]> = {}
      for (const row of classRows) {
        if (!subjectGroups[row.subject]) subjectGroups[row.subject] = []
        subjectGroups[row.subject].push(row)
      }

      // Compute subject-level stats
      const subjectStats: Record<string, { avg: number; highest: number; lowest: number }> = {}
      for (const subject of Object.keys(subjectGroups)) {
        const subjRows = subjectGroups[subject]
        const totals = subjRows.map(r => parseFloat(r.total_score))
        subjectStats[subject] = {
          avg: totals.reduce((a, b) => a + b, 0) / totals.length,
          highest: Math.max(...totals),
          lowest: Math.min(...totals),
        }
      }

      // Compute overall totals per student for class ranking
      const studentTotals: Record<string, { total: number; attendanceSum: number; count: number }> = {}
      for (const row of classRows) {
        if (!studentTotals[row.student_id]) {
          studentTotals[row.student_id] = { total: 0, attendanceSum: 0, count: 0 }
        }
        studentTotals[row.student_id].total += parseFloat(row.total_score)
        studentTotals[row.student_id].attendanceSum += parseFloat(row.attendance_percentage)
        studentTotals[row.student_id].count++
      }

      // Sort students by total for class position
      const sortedStudents = Object.keys(studentTotals).sort((a, b) =>
        studentTotals[b].total - studentTotals[a].total
      )
      const classPositionMap: Record<string, number> = {}
      sortedStudents.forEach((sid, idx) => { classPositionMap[sid] = idx + 1 })
      const totalStudents = sortedStudents.length

      // Build compiled results
      for (const row of classRows) {
        const totalScore = parseFloat(row.total_score)
        const grade = assignGrade(totalScore)
        const remark = gradeRemark(grade)
        const stats = subjectStats[row.subject] || { avg: 0, highest: 0, lowest: 0 }

        // Subject position
        const subjRows = subjectGroups[row.subject] || []
        const subjectPosition = subjRows
          .filter(r => parseFloat(r.total_score) > totalScore)
          .length + 1

        const overallTotal = studentTotals[row.student_id].total
        const overallAverage = studentTotals[row.student_id].count > 0
          ? overallTotal / studentTotals[row.student_id].count
          : 0
        const attendancePercent = studentTotals[row.student_id].count > 0
          ? studentTotals[row.student_id].attendanceSum / studentTotals[row.student_id].count
          : 0

        const compiled: CompiledResult = {
          studentId: row.student_id,
          subject: row.subject,
          class: row.class,
          totalScore,
          grade,
          remark,
          classAverage: Math.round(stats.avg * 100) / 100,
          highestScore: stats.highest,
          lowestScore: stats.lowest,
          subjectPosition,
          overallTotal: Math.round(overallTotal * 100) / 100,
          overallAverage: Math.round(overallAverage * 100) / 100,
          classPosition: classPositionMap[row.student_id],
          totalStudents,
          attendancePercent: Math.round(attendancePercent * 100) / 100,
          principalComment: principalCommentFor(overallAverage),
        }
        allResults.push(compiled)
        compiledCount++
        const id = `compiled_${tenantId}_${row.student_id}_${row.subject}_${academicSession}_${term}`.replace(/\s+/g, '_')
        await sql`
          INSERT INTO compiled_results (
            id, tenant_id, student_id, subject, class, academic_session, term,
            total_score, grade, remark, class_average, highest_score, lowest_score,
            subject_position, overall_total, overall_average, class_position,
            total_students, attendance_percent, principal_comment, status, compiled_at
          ) VALUES (
            ${id}, ${tenantId}, ${row.student_id}, ${row.subject}, ${row.class},
            ${academicSession}, ${term},
            ${totalScore}, ${grade}, ${remark},
            ${Math.round(stats.avg * 100) / 100}, ${stats.highest}, ${stats.lowest},
            ${subjectPosition}, ${Math.round(overallTotal * 100) / 100},
            ${Math.round(overallAverage * 100) / 100}, ${classPositionMap[row.student_id]},
            ${totalStudents}, ${Math.round(attendancePercent * 100) / 100},
            ${principalCommentFor(overallAverage)}, 'compiled', NOW()
          )
          ON CONFLICT (tenant_id, student_id, subject, academic_session, term)
          DO UPDATE SET
            total_score = EXCLUDED.total_score,
            grade = EXCLUDED.grade,
            remark = EXCLUDED.remark,
            class_average = EXCLUDED.class_average,
            highest_score = EXCLUDED.highest_score,
            lowest_score = EXCLUDED.lowest_score,
            subject_position = EXCLUDED.subject_position,
            overall_total = EXCLUDED.overall_total,
            overall_average = EXCLUDED.overall_average,
            class_position = EXCLUDED.class_position,
            total_students = EXCLUDED.total_students,
            attendance_percent = EXCLUDED.attendance_percent,
            principal_comment = EXCLUDED.principal_comment,
            status = 'compiled',
            compiled_at = NOW()
        `
      }

    }

    return { compiled: compiledCount, results: allResults }
  } catch (error) {
    console.error('Error compiling results:', error)
    return { compiled: 0, results: [] }
  }
}

// ─── Fetch Compiled Results ────────────────────────────────────────

export async function fetchCompiledResults(
  tenantId: string,
  academicSession: string,
  term: string,
  className?: string
): Promise<any[]> {
  await ensureCompiledResultsTable()
  try {
    let result
    if (className) {
      result = await sql`
        SELECT * FROM compiled_results
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND class = ${className}
        ORDER BY class, class_position, subject
      `
    } else {
      result = await sql`
        SELECT * FROM compiled_results
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
        ORDER BY class, class_position, subject
      `
    }
    return result.rows
  } catch (error) {
    console.error('Error fetching compiled results:', error)
    return []
  }
}

// ─── Approve Compiled Results ──────────────────────────────────────

export async function approveCompiledResults(
  tenantId: string,
  academicSession: string,
  term: string,
  className?: string
): Promise<number> {
  await ensureCompiledResultsTable()
  try {
    let result
    if (className) {
      result = await sql`
        UPDATE compiled_results
        SET status = 'approved', compiled_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND class = ${className}
          AND status = 'compiled'
        RETURNING id
      `
    } else {
      result = await sql`
        UPDATE compiled_results
        SET status = 'approved', compiled_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND status = 'compiled'
        RETURNING id
      `
    }
    return result.rows.length
  } catch (error) {
    console.error('Error approving compiled results:', error)
    return 0
  }
}

// ─── Publish Compiled Results ──────────────────────────────────────

export async function publishCompiledResults(
  tenantId: string,
  academicSession: string,
  term: string,
  className?: string
): Promise<number> {
  await ensureCompiledResultsTable()
  try {
    let result
    if (className) {
      result = await sql`
        UPDATE compiled_results
        SET status = 'published', compiled_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND class = ${className}
          AND status = 'approved'
        RETURNING id
      `
    } else {
      result = await sql`
        UPDATE compiled_results
        SET status = 'published', compiled_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
          AND status = 'approved'
        RETURNING id
      `
    }
    return result.rows.length
  } catch (error) {
    console.error('Error publishing compiled results:', error)
    return 0
  }
}
