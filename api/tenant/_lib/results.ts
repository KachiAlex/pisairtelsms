import { poolQuery } from '../_lib/pg-pool.js'
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
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS tests_score NUMERIC DEFAULT 0`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS assignments_score NUMERIC DEFAULT 0`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS projects_score NUMERIC DEFAULT 0`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS exams_score NUMERIC DEFAULT 0`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by TEXT`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by_name TEXT`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted'`, [])
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
    if (studentId && academicSession && term) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND student_id = $2
          AND academic_session = $3
          AND term = $4
        ORDER BY created_at DESC`,
        [tenantId, studentId, academicSession, term]
      )
      return result.rows.map(rowToScore)
    } else if (studentId && academicSession) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND student_id = $2
          AND academic_session = $3
        ORDER BY created_at DESC`,
        [tenantId, studentId, academicSession]
      )
      return result.rows.map(rowToScore)
    } else if (studentId) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND student_id = $2
        ORDER BY created_at DESC`,
        [tenantId, studentId]
      )
      return result.rows.map(rowToScore)
    } else if (academicSession && term && className) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND academic_session = $2
          AND term = $3
          AND class = $4
        ORDER BY created_at DESC`,
        [tenantId, academicSession, term, className]
      )
      return result.rows.map(rowToScore)
    } else if (academicSession && term) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND academic_session = $2
          AND term = $3
        ORDER BY created_at DESC`,
        [tenantId, academicSession, term]
      )
      return result.rows.map(rowToScore)
    } else {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
      )
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

/**
 * Compute attendance percentage from attendance_records for a student in a term.
 * Late counts as 0.5 present.
 * Returns 100 if no records exist (fallback to avoid penalizing when no data).
 */
export async function computeAttendancePercentage(
  tenantId: string,
  studentId: string,
  academicSession: string,
  term: string
): Promise<number> {
  try {
    const result = await poolQuery(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late
      FROM attendance_records
      WHERE tenant_id = $1
        AND student_id = $2
        AND academic_session = $3
        AND term = $4`,
      [tenantId, studentId, academicSession, term]
    )
    const total = parseInt(result.rows[0]?.total || '0', 10)
    const present = parseInt(result.rows[0]?.present || '0', 10)
    const late = parseInt(result.rows[0]?.late || '0', 10)
    if (total === 0) return 100
    const pct = ((present + 0.5 * late) / total) * 100
    return Math.round(pct * 100) / 100
  } catch (error) {
    console.error('Error computing attendance percentage:', error)
    return 100
  }
}

/**
 * Batch compute attendance percentages for all students in a class/term.
 * Returns a map of studentId -> attendance percentage.
 */
export async function computeAttendanceBatch(
  tenantId: string,
  className: string,
  academicSession: string,
  term: string
): Promise<Record<string, number>> {
  try {
    const result = await poolQuery(
      `SELECT
        student_id,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late
      FROM attendance_records
      WHERE tenant_id = $1
        AND class = $2
        AND academic_session = $3
        AND term = $4
      GROUP BY student_id`,
      [tenantId, className, academicSession, term]
    )
    const map: Record<string, number> = {}
    for (const row of result.rows) {
      const total = parseInt(row.total || '0', 10)
      const present = parseInt(row.present || '0', 10)
      const late = parseInt(row.late || '0', 10)
      if (total === 0) {
        map[row.student_id] = 100
      } else {
        const pct = ((present + 0.5 * late) / total) * 100
        map[row.student_id] = Math.round(pct * 100) / 100
      }
    }
    return map
  } catch (error) {
    console.error('Error computing batch attendance:', error)
    return {}
  }
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
    const result = await poolQuery<ScoreRow>(
      `SELECT * FROM student_scores
      WHERE tenant_id = $1
        AND class = $2
        AND subject = $3
        AND academic_session = $4
        AND term = $5
      ORDER BY student_id ASC`,
      [tenantId, className, subject, academicSession, term]
    )
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
      const result = await poolQuery(
        `SELECT DISTINCT submitted_by, submitted_by_name, subject, class, submission_status, updated_at
        FROM student_scores
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND class = $4
          AND submitted_by IS NOT NULL
        ORDER BY updated_at DESC`,
        [tenantId, academicSession, term, className]
      )
      return result.rows.map((r: any) => ({
        submittedBy: r.submitted_by,
        submittedByName: r.submitted_by_name,
        subject: r.subject,
        class: r.class,
        status: r.submission_status,
        updatedAt: r.updated_at.toISOString(),
      }))
    } else {
      const result = await poolQuery(
        `SELECT DISTINCT submitted_by, submitted_by_name, subject, class, submission_status, updated_at
        FROM student_scores
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND submitted_by IS NOT NULL
        ORDER BY updated_at DESC`,
        [tenantId, academicSession, term]
      )
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

  // Auto-compute attendance percentage from attendance_records if not explicitly provided
  let attendancePercentage = payload.attendancePercentage
  if (!attendancePercentage || attendancePercentage === 0) {
    attendancePercentage = await computeAttendancePercentage(
      tenantId, payload.studentId, payload.academicSession, payload.term
    )
  }

  const result = await poolQuery<ScoreRow>(
    `INSERT INTO student_scores
      (id, tenant_id, student_id, subject, academic_session, term,
       ca_score, exam_score, total_score, attendance_percentage, class,
       tests_score, assignments_score, projects_score, exams_score,
       submitted_by, submitted_by_name, submission_status)
    VALUES
      ($1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11,
       $12, $13, $14, $15,
       $16, $17, $18)
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
    RETURNING *`,
    [id, tenantId, payload.studentId, payload.subject, payload.academicSession, payload.term,
     caScore, examScore, totalScore, attendancePercentage, payload.class,
     testsScore, assignmentsScore, projectsScore, examsScore,
     submittedBy, submittedByName, submissionStatus]
  )
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
      query = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND class = $2
          AND academic_session = $3 AND term = $4`,
        [tenantId, className, academicSession, term]
      )
    } else if (academicSession && term) {
      query = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1
          AND academic_session = $2 AND term = $3`,
        [tenantId, academicSession, term]
      )
    } else {
      query = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores WHERE tenant_id = $1`,
        [tenantId]
      )
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

      // Also recompute attendance from records
      const newAttendance = await computeAttendancePercentage(
        tenantId, row.student_id, row.academic_session, row.term
      )
      const oldAttendance = parseFloat(row.attendance_percentage)

      const needsTotalUpdate = Math.abs(oldTotal - newTotal) > 0.01
      const needsAttendanceUpdate = Math.abs(oldAttendance - newAttendance) > 0.01

      if (needsTotalUpdate || needsAttendanceUpdate) {
        if (needsTotalUpdate && needsAttendanceUpdate) {
          await poolQuery(
            `UPDATE student_scores SET total_score = $1, attendance_percentage = $2, updated_at = NOW()
            WHERE id = $3`,
            [newTotal, newAttendance, row.id]
          )
        } else if (needsTotalUpdate) {
          await poolQuery(
            `UPDATE student_scores SET total_score = $1, updated_at = NOW()
            WHERE id = $2`,
            [newTotal, row.id]
          )
        } else {
          await poolQuery(
            `UPDATE student_scores SET attendance_percentage = $1, updated_at = NOW()
            WHERE id = $2`,
            [newAttendance, row.id]
          )
        }
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

interface GradeBand {
  grade: string
  minScore: number
  maxScore: number
  remark: string
}

const DEFAULT_BANDS: GradeBand[] = [
  { grade: 'A1', minScore: 80, maxScore: 100, remark: 'Distinction' },
  { grade: 'B2', minScore: 70, maxScore: 79, remark: 'Very Good' },
  { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good' },
  { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit' },
  { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit' },
  { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Satisfactory' },
  { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass' },
  { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Marginal Pass' },
  { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail' },
]

async function getGradeBands(tenantId: string): Promise<GradeBand[]> {
  try {
    const scaleRes = await poolQuery(
      `SELECT id FROM grading_scales
      WHERE tenant_id = $1 AND status = 'live'
      ORDER BY updated_at DESC LIMIT 1`,
      [tenantId]
    )
    if (!scaleRes.rows[0]) return DEFAULT_BANDS
    const scaleId = scaleRes.rows[0].id
    const bandsRes = await poolQuery(
      `SELECT grade, min_score, max_score, remark
      FROM grading_scale_bands
      WHERE scale_id = $1
      ORDER BY min_score DESC`,
      [scaleId]
    )
    if (bandsRes.rows.length === 0) return DEFAULT_BANDS
    return bandsRes.rows.map((r: any) => ({
      grade: r.grade,
      minScore: Number(r.min_score),
      maxScore: Number(r.max_score),
      remark: r.remark || '',
    }))
  } catch {
    return DEFAULT_BANDS
  }
}

function assignGradeFromBands(score: number, bands: GradeBand[]): { grade: string; remark: string } {
  for (const band of bands) {
    if (score >= band.minScore && score <= band.maxScore) {
      return { grade: band.grade, remark: band.remark }
    }
  }
  for (const band of bands) {
    if (score >= band.minScore) {
      return { grade: band.grade, remark: band.remark }
    }
  }
  return { grade: 'F9', remark: 'Fail' }
}

function principalCommentFor(avg: number): string {
  if (avg >= 75) return 'Excellent performance. Keep up the outstanding work.'
  if (avg >= 60) return 'Very good performance. Continue to work hard.'
  if (avg >= 50) return 'Satisfactory performance. There is room for improvement.'
  if (avg >= 40) return 'Below average performance. More effort is required.'
  return 'Poor performance. Urgent intervention needed.'
}

async function ensureCompiledResultsTable() {
  await poolQuery(
    `CREATE TABLE IF NOT EXISTS compiled_results (
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
    )`,
    []
  )
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
    // Load grade bands from DB (or fallback to defaults)
    const bands = await getGradeBands(tenantId)

    // Fetch all submitted/approved scores for the scope
    let scoresQuery
    if (className) {
      scoresQuery = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND class = $4
          AND submission_status IN ('submitted', 'approved')`,
        [tenantId, academicSession, term, className]
      )
    } else {
      scoresQuery = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND submission_status IN ('submitted', 'approved')`,
        [tenantId, academicSession, term]
      )
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
        const { grade, remark } = assignGradeFromBands(totalScore, bands)
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
        await poolQuery(
          `INSERT INTO compiled_results (
            id, tenant_id, student_id, subject, class, academic_session, term,
            total_score, grade, remark, class_average, highest_score, lowest_score,
            subject_position, overall_total, overall_average, class_position,
            total_students, attendance_percent, principal_comment, status, compiled_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19, $20, 'compiled', NOW()
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
            compiled_at = NOW()`,
          [id, tenantId, row.student_id, row.subject, row.class,
            academicSession, term,
            totalScore, grade, remark,
            Math.round(stats.avg * 100) / 100, stats.highest, stats.lowest,
            subjectPosition, Math.round(overallTotal * 100) / 100,
            Math.round(overallAverage * 100) / 100, classPositionMap[row.student_id],
            totalStudents, Math.round(attendancePercent * 100) / 100,
            principalCommentFor(overallAverage)]
        )
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
      result = await poolQuery(
        `SELECT * FROM compiled_results
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND class = $4
        ORDER BY class, class_position, subject`,
        [tenantId, academicSession, term, className]
      )
    } else {
      result = await poolQuery(
        `SELECT * FROM compiled_results
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
        ORDER BY class, class_position, subject`,
        [tenantId, academicSession, term]
      )
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
      result = await poolQuery(
        `UPDATE compiled_results
        SET status = 'approved', compiled_at = NOW()
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND class = $4
          AND status = 'compiled'
        RETURNING id`,
        [tenantId, academicSession, term, className]
      )
    } else {
      result = await poolQuery(
        `UPDATE compiled_results
        SET status = 'approved', compiled_at = NOW()
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND status = 'compiled'
        RETURNING id`,
        [tenantId, academicSession, term]
      )
    }
    return result.rows.length
  } catch (error) {
    console.error('Error approving compiled results:', error)
    return 0
  }
}

// ─── Broadsheet ────────────────────────────────────────────────────

export interface BroadsheetStudent {
  studentId: string
  studentName: string
  classPosition: number
  totalStudents: number
  overallTotal: number
  overallAverage: number
  attendancePercent: number
  subjects: Record<string, { score: number; grade: string; position: number; remark: string }>
}

export interface BroadsheetData {
  className: string
  academicSession: string
  term: string
  subjects: string[]
  students: BroadsheetStudent[]
  statusBreakdown: Record<string, number>
}

export async function fetchBroadsheet(
  tenantId: string,
  academicSession: string,
  term: string,
  className: string
): Promise<BroadsheetData | null> {
  await ensureCompiledResultsTable()
  try {
    // Fetch compiled results joined with student names
    const result = await poolQuery(
      `SELECT cr.student_id, cr.subject, cr.class, cr.total_score, cr.grade,
             cr.remark, cr.subject_position, cr.overall_total, cr.overall_average,
             cr.class_position, cr.total_students, cr.attendance_percent, cr.status,
             s.name AS student_name
      FROM compiled_results cr
      LEFT JOIN students s ON s.id = cr.student_id
      WHERE cr.tenant_id = $1
        AND cr.academic_session = $2
        AND cr.term = $3
        AND cr.class = $4
      ORDER BY cr.class_position, cr.student_id, cr.subject`,
      [tenantId, academicSession, term, className]
    )

    if (result.rows.length === 0) return null

    // Collect all unique subjects
    const subjectSet = new Set<string>()
    const studentMap: Record<string, BroadsheetStudent> = {}
    const statusBreakdown: Record<string, number> = {}

    for (const row of result.rows) {
      const sid = row.student_id
      subjectSet.add(row.subject)

      if (!studentMap[sid]) {
        studentMap[sid] = {
          studentId: sid,
          studentName: row.student_name || sid,
          classPosition: Number(row.class_position) || 0,
          totalStudents: Number(row.total_students) || 0,
          overallTotal: Number(row.overall_total) || 0,
          overallAverage: Number(row.overall_average) || 0,
          attendancePercent: Number(row.attendance_percent) || 0,
          subjects: {},
        }
      }

      studentMap[sid].subjects[row.subject] = {
        score: Number(row.total_score),
        grade: row.grade,
        position: Number(row.subject_position) || 0,
        remark: row.remark || '',
      }

      const status = row.status || 'compiled'
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
    }

    const subjects = Array.from(subjectSet).sort()
    const students = Object.values(studentMap).sort((a, b) => a.classPosition - b.classPosition)

    return {
      className,
      academicSession,
      term,
      subjects,
      students,
      statusBreakdown,
    }
  } catch (error) {
    console.error('Error fetching broadsheet:', error)
    return null
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
      result = await poolQuery(
        `UPDATE compiled_results
        SET status = 'published', compiled_at = NOW()
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND class = $4
          AND status = 'approved'
        RETURNING id`,
        [tenantId, academicSession, term, className]
      )
    } else {
      result = await poolQuery(
        `UPDATE compiled_results
        SET status = 'published', compiled_at = NOW()
        WHERE tenant_id = $1
          AND academic_session = $2
          AND term = $3
          AND status = 'approved'
        RETURNING id`,
        [tenantId, academicSession, term]
      )
    }
    return result.rows.length
  } catch (error) {
    console.error('Error publishing compiled results:', error)
    return 0
  }
}
