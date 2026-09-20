import { poolQuery } from '../../_lib/pg-pool.js'
import { getTenantCAConfig, type CAConfig } from './ca-config.js'
import { normalizeClassName } from './class-names.js'
import {
  getGradeBands,
  assignGradeFromBands,
  getLevelForClass,
  type GradeBand,
} from './grade-bands.js'

/**
 * Fetch a class/subject-specific CA config override if one exists.
 * Returns null if no override is found.
 */
async function getCAConfigOverride(
  tenantId: string,
  className: string,
  subject?: string
): Promise<CAConfig | null> {
  try {
    // Try class+subject override first, then class-only override
    if (subject) {
      const result = await poolQuery(
        `SELECT config FROM ca_config_overrides
         WHERE tenant_id = $1 AND class_name = $2 AND subject_name = $3
         LIMIT 1`,
        [tenantId, className, subject]
      )
      if (result.rows[0]) return result.rows[0].config as CAConfig
    }
    // Fall back to class-level override (subject_name IS NULL)
    const result = await poolQuery(
      `SELECT config FROM ca_config_overrides
       WHERE tenant_id = $1 AND class_name = $2 AND subject_name IS NULL
       LIMIT 1`,
      [tenantId, className]
    )
    if (result.rows[0]) return result.rows[0].config as CAConfig
    return null
  } catch {
    return null
  }
}

export interface StudentScore {
  id: string
  studentId: string
  studentName?: string
  admissionNo?: string
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
  testsMax: number | null
  assignmentsMax: number | null
  projectsMax: number | null
  examsMax: number | null
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
  testsMax?: number
  assignmentsMax?: number
  projectsMax?: number
  examsMax?: number
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
  tests_max: string | null
  assignments_max: string | null
  projects_max: string | null
  exams_max: string | null
  submitted_by: string | null
  submitted_by_name: string | null
  submission_status: string
  is_absent: boolean | null
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
    testsMax: row.tests_max !== null && row.tests_max !== undefined ? parseFloat(row.tests_max) : null,
    assignmentsMax: row.assignments_max !== null && row.assignments_max !== undefined ? parseFloat(row.assignments_max) : null,
    projectsMax: row.projects_max !== null && row.projects_max !== undefined ? parseFloat(row.projects_max) : null,
    examsMax: row.exams_max !== null && row.exams_max !== undefined ? parseFloat(row.exams_max) : null,
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
    // "Marked out of" per component — when set, the *_score column holds the
    // score normalized to 0-100 (raw/max*100) and *_max records the raw scale.
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS tests_max NUMERIC`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS assignments_max NUMERIC`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS projects_max NUMERIC`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS exams_max NUMERIC`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by TEXT`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submitted_by_name TEXT`, [])
    await poolQuery(`ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted'`, [])
    // Drop check constraint that limits ca_score to <=100 (breakdown scores can sum higher)
    await poolQuery(`ALTER TABLE student_scores DROP CONSTRAINT IF EXISTS student_scores_ca_score_check`, [])
    // Add unique constraint for ON CONFLICT upserts
    await poolQuery(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'student_scores_unique_composite'
            AND conrelid = 'student_scores'::regclass
        ) THEN
          ALTER TABLE student_scores
          ADD CONSTRAINT student_scores_unique_composite
          UNIQUE (tenant_id, student_id, subject, academic_session, term);
        END IF;
      END $$`,
      []
    )
  } catch (error) {
    console.error('Error ensuring student_scores table:', error)
  }
}

/**
 * Attach student name + admission number to score rows in one lookup.
 * Matches students by id within the tenant; leaves fields undefined when no match.
 */
async function enrichScoresWithStudents(tenantId: string, scores: StudentScore[]): Promise<StudentScore[]> {
  const ids = Array.from(new Set(scores.map(s => s.studentId)))
  if (ids.length === 0) return scores
  try {
    const result = await poolQuery<{ id: string; name: string; admission_no: string | null }>(
      `SELECT id::text AS id, name, admission_no FROM students
       WHERE tenant_id = $1 AND id::text = ANY($2)`,
      [tenantId, ids]
    )
    const byId: Record<string, { name: string; admission_no: string | null }> = {}
    for (const row of result.rows) byId[row.id] = row
    for (const score of scores) {
      const student = byId[score.studentId]
      if (student) {
        score.studentName = student.name
        score.admissionNo = student.admission_no || undefined
      }
    }
  } catch (error) {
    console.error('Error enriching scores with student names:', error)
  }
  return scores
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
      return enrichScoresWithStudents(tenantId, result.rows.map(rowToScore))
    } else if (studentId && academicSession) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND student_id = $2
          AND academic_session = $3
        ORDER BY created_at DESC`,
        [tenantId, studentId, academicSession]
      )
      return enrichScoresWithStudents(tenantId, result.rows.map(rowToScore))
    } else if (studentId) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND student_id = $2
        ORDER BY created_at DESC`,
        [tenantId, studentId]
      )
      return enrichScoresWithStudents(tenantId, result.rows.map(rowToScore))
    } else if (academicSession && term && className) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND academic_session = $2
          AND term = $3
          AND class = $4
        ORDER BY created_at DESC`,
        [tenantId, academicSession, term, className]
      )
      return enrichScoresWithStudents(tenantId, result.rows.map(rowToScore))
    } else if (academicSession && term) {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores
        WHERE tenant_id = $1 AND academic_session = $2
          AND term = $3
        ORDER BY created_at DESC`,
        [tenantId, academicSession, term]
      )
      return enrichScoresWithStudents(tenantId, result.rows.map(rowToScore))
    } else {
      const result = await poolQuery<ScoreRow>(
        `SELECT * FROM student_scores WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
      )
      return enrichScoresWithStudents(tenantId, result.rows.map(rowToScore))
    }
  } catch (error) {
    console.error('Error fetching scores:', error)
    throw new Error('Failed to fetch scores')
  }
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
    throw new Error('Failed to compute batch attendance')
  }
}

export async function computeWeightedTotal(
  tenantId: string,
  className: string,
  scores: { testsScore: number; assignmentsScore: number; projectsScore: number; examsScore: number },
  subject?: string
): Promise<number> {
  try {
    const level = getLevelForClass(className)

    // Check for class/subject-specific override first
    const override = await getCAConfigOverride(tenantId, className, subject)
    const weights = override ? override[level] : (await getTenantCAConfig(tenantId)).published[level]

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
    throw new Error('Failed to fetch scores by class/subject')
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
    throw new Error('Failed to fetch teacher submissions')
  }
}

export async function createScore(tenantId: string, payload: ScorePayload): Promise<StudentScore> {
  await ensureResultsTable()
  payload.class = normalizeClassName(payload.class)
  const id = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Normalize each component: when a "marked out of" max is supplied the
  // payload carries the raw mark (e.g. 10 out of 20) and we store the
  // normalized 0-100 value so weighted totals stay consistent. Rows saved
  // without a max keep the legacy behaviour (value already normalized).
  const normalize = (raw: number | undefined, max: number | undefined): { score: number; max: number | null } => {
    const r = raw ?? 0
    if (max !== undefined && max !== null && max > 0) {
      return { score: Math.min(100, Math.round((r / max) * 10000) / 100), max }
    }
    return { score: r, max: null }
  }

  const tests = normalize(payload.testsScore, payload.testsMax)
  const assignments = normalize(payload.assignmentsScore, payload.assignmentsMax)
  const projects = normalize(payload.projectsScore, payload.projectsMax)
  const exams = normalize(payload.examsScore, payload.examsMax)

  const testsScore = tests.score
  const assignmentsScore = assignments.score
  const projectsScore = projects.score
  const examsScore = exams.score

  // Compute weighted total using CA config (with overrides), or fall back to simple sum
  const totalScore = await computeWeightedTotal(tenantId, payload.class, {
    testsScore, assignmentsScore, projectsScore, examsScore,
  }, payload.subject)

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
       tests_max, assignments_max, projects_max, exams_max,
       submitted_by, submitted_by_name, submission_status)
    VALUES
      ($1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11,
       $12, $13, $14, $15,
       $16, $17, $18, $19,
       $20, $21, $22)
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
      tests_max = EXCLUDED.tests_max,
      assignments_max = EXCLUDED.assignments_max,
      projects_max = EXCLUDED.projects_max,
      exams_max = EXCLUDED.exams_max,
      submitted_by = EXCLUDED.submitted_by,
      submitted_by_name = EXCLUDED.submitted_by_name,
      submission_status = EXCLUDED.submission_status,
      updated_at = NOW()
    RETURNING *`,
    [id, tenantId, payload.studentId, payload.subject, payload.academicSession, payload.term,
     caScore, examScore, totalScore, attendancePercentage, payload.class,
     testsScore, assignmentsScore, projectsScore, examsScore,
     tests.max, assignments.max, projects.max, exams.max,
     submittedBy, submittedByName, submissionStatus]
  )

  // Audit trail — log the score change (best-effort, non-blocking)
  try {
    await poolQuery(
      `INSERT INTO student_scores_audit
        (tenant_id, student_id, subject, academic_session, term, action, new_values, actor_id, actor_name)
       VALUES ($1, $2, $3, $4, $5, 'upsert', $6::jsonb, $7, $8)`,
      [tenantId, payload.studentId, payload.subject, payload.academicSession, payload.term,
       JSON.stringify(result.rows[0]), submittedBy, submittedByName]
    )
  } catch { /* audit table may not exist yet — non-critical */ }

  return rowToScore(result.rows[0])
}

export async function recomputeAllScores(
  tenantId: string,
  academicSession?: string,
  term?: string,
  className?: string
): Promise<{ recomputed: number; details: { studentId: string; studentName?: string; admissionNo?: string; subject: string; class: string; oldTotal: number; newTotal: number }[] }> {
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

    const details: { studentId: string; studentName?: string; admissionNo?: string; subject: string; class: string; oldTotal: number; newTotal: number }[] = []
    let recomputed = 0

    for (const row of query.rows) {
      const oldTotal = parseFloat(row.total_score)
      const newTotal = await computeWeightedTotal(tenantId, row.class, {
        testsScore: row.tests_score !== null ? parseFloat(row.tests_score) : 0,
        assignmentsScore: row.assignments_score !== null ? parseFloat(row.assignments_score) : 0,
        projectsScore: row.projects_score !== null ? parseFloat(row.projects_score) : 0,
        examsScore: row.exams_score !== null ? parseFloat(row.exams_score) : 0,
      }, row.subject)

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

    // Attach student names + admission numbers to the change log
    const detailIds = Array.from(new Set(details.map(d => d.studentId)))
    if (detailIds.length > 0) {
      try {
        const names = await poolQuery<{ id: string; name: string; admission_no: string | null }>(
          `SELECT id::text AS id, name, admission_no FROM students WHERE tenant_id = $1 AND id::text = ANY($2)`,
          [tenantId, detailIds]
        )
        const nameById: Record<string, { name: string; admission_no: string | null }> = {}
        for (const row of names.rows) nameById[row.id] = row
        for (const d of details) {
          const st = nameById[d.studentId]
          if (st) {
            d.studentName = st.name
            d.admissionNo = st.admission_no || undefined
          }
        }
      } catch { /* names are cosmetic — don't fail the recompute */ }
    }

    return { recomputed, details }
  } catch (error) {
    console.error('Error recomputing scores:', error)
    throw new Error('Failed to recompute scores')
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
  gpaWeight: number
  creditHours: number
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

      // Load grade bands for this class level (or fallback to defaults)
      const classLevel = getLevelForClass(cls)
      const bands = await getGradeBands(tenantId, classLevel)

      // Group by subject for subject-level stats
      const subjectGroups: Record<string, ScoreRow[]> = {}
      for (const row of classRows) {
        if (!subjectGroups[row.subject]) subjectGroups[row.subject] = []
        subjectGroups[row.subject].push(row)
      }

      // Compute subject-level stats (exclude absent students from averages)
      const subjectStats: Record<string, { avg: number; highest: number; lowest: number }> = {}
      for (const subject of Object.keys(subjectGroups)) {
        const subjRows = subjectGroups[subject]
        const presentRows = subjRows.filter(r => !r.is_absent)
        const totals = (presentRows.length > 0 ? presentRows : subjRows).map(r => parseFloat(r.total_score))
        subjectStats[subject] = {
          avg: totals.reduce((a, b) => a + b, 0) / totals.length,
          highest: Math.max(...totals),
          lowest: Math.min(...totals),
        }
      }

      // Compute overall totals per student for class ranking (exclude absent from ranking)
      const studentTotals: Record<string, { total: number; attendanceSum: number; count: number }> = {}
      for (const row of classRows) {
        if (row.is_absent) continue
        if (!studentTotals[row.student_id]) {
          studentTotals[row.student_id] = { total: 0, attendanceSum: 0, count: 0 }
        }
        studentTotals[row.student_id].total += parseFloat(row.total_score)
        studentTotals[row.student_id].attendanceSum += parseFloat(row.attendance_percentage)
        studentTotals[row.student_id].count++
      }

      // Sort students by total for class position (handle ties with proper ranking)
      const sortedStudents = Object.keys(studentTotals).sort((a, b) =>
        studentTotals[b].total - studentTotals[a].total
      )
      const classPositionMap: Record<string, number> = {}
      sortedStudents.forEach((sid, idx) => {
        if (idx > 0 && studentTotals[sid].total === studentTotals[sortedStudents[idx - 1]].total) {
          classPositionMap[sid] = classPositionMap[sortedStudents[idx - 1]]
        } else {
          classPositionMap[sid] = idx + 1
        }
      })
      const totalStudents = sortedStudents.length

      // Build compiled results
      for (const row of classRows) {
        const totalScore = parseFloat(row.total_score)
        const { grade, remark, gpaWeight } = assignGradeFromBands(totalScore, bands)
        const stats = subjectStats[row.subject] || { avg: 0, highest: 0, lowest: 0 }
        const creditHours = 1 // Default credit hours per subject; can be extended per-subject later

        // Subject position (exclude absent students)
        const subjRows = (subjectGroups[row.subject] || []).filter(r => !r.is_absent)
        const subjectPosition = subjRows
          .filter(r => parseFloat(r.total_score) > totalScore)
          .length + 1

        const studentData = studentTotals[row.student_id]
        const overallTotal = studentData?.total ?? 0
        const overallAverage = studentData && studentData.count > 0
          ? overallTotal / studentData.count
          : 0
        const attendancePercent = studentData && studentData.count > 0
          ? studentData.attendanceSum / studentData.count
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
          classPosition: classPositionMap[row.student_id] ?? 0,
          totalStudents,
          attendancePercent: Math.round(attendancePercent * 100) / 100,
          principalComment: principalCommentFor(overallAverage),
          gpaWeight,
          creditHours,
        }
        allResults.push(compiled)
        compiledCount++
        const id = `compiled_${tenantId}_${row.student_id}_${row.subject}_${academicSession}_${term}`.replace(/\s+/g, '_')
        await poolQuery(
          `INSERT INTO compiled_results (
            id, tenant_id, student_id, subject, class, academic_session, term,
            total_score, grade, remark, class_average, highest_score, lowest_score,
            subject_position, overall_total, overall_average, class_position,
            total_students, attendance_percent, principal_comment, gpa_weight, credit_hours,
            status, compiled_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19, $20, $21, $22,
            'compiled', NOW()
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
            gpa_weight = EXCLUDED.gpa_weight,
            credit_hours = EXCLUDED.credit_hours,
            status = CASE
              WHEN EXCLUDED.total_score IS DISTINCT FROM compiled_results.total_score
                OR EXCLUDED.grade IS DISTINCT FROM compiled_results.grade
                OR EXCLUDED.class_position IS DISTINCT FROM compiled_results.class_position
              THEN 'compiled'
              ELSE compiled_results.status
            END,
            compiled_at = NOW()`,
          [id, tenantId, row.student_id, row.subject, row.class,
            academicSession, term,
            totalScore, grade, remark,
            Math.round(stats.avg * 100) / 100, stats.highest, stats.lowest,
            subjectPosition, Math.round(overallTotal * 100) / 100,
            Math.round(overallAverage * 100) / 100, classPositionMap[row.student_id] ?? 0,
            totalStudents, Math.round(attendancePercent * 100) / 100,
            principalCommentFor(overallAverage), gpaWeight, creditHours]
        )
      }

    }

    return { compiled: compiledCount, results: allResults }
  } catch (error) {
    console.error('Error compiling results:', error)
    throw new Error('Failed to compile results')
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
        `SELECT cr.*, s.name AS student_name, s.admission_no
        FROM compiled_results cr
        LEFT JOIN students s ON s.id::text = cr.student_id AND s.tenant_id = $1
        WHERE cr.tenant_id = $1
          AND cr.academic_session = $2
          AND cr.term = $3
          AND cr.class = $4
        ORDER BY cr.class, cr.class_position, cr.subject`,
        [tenantId, academicSession, term, className]
      )
    } else {
      result = await poolQuery(
        `SELECT cr.*, s.name AS student_name, s.admission_no
        FROM compiled_results cr
        LEFT JOIN students s ON s.id::text = cr.student_id AND s.tenant_id = $1
        WHERE cr.tenant_id = $1
          AND cr.academic_session = $2
          AND cr.term = $3
        ORDER BY cr.class, cr.class_position, cr.subject`,
        [tenantId, academicSession, term]
      )
    }
    return result.rows
  } catch (error) {
    console.error('Error fetching compiled results:', error)
    throw new Error('Failed to fetch compiled results')
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
  admissionNo: string
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
             s.name AS student_name, s.admission_no
      FROM compiled_results cr
      LEFT JOIN students s ON s.id::text = cr.student_id AND s.tenant_id = $1
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
          admissionNo: row.admission_no || '',
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
