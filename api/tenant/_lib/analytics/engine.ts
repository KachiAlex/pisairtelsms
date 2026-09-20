import { sql } from '../../../_lib/sql.js'
import { calculateSummaryStats, type SummaryStats } from '../attendance'

export interface AnalyticsFilters {
  academicSession?: string
  term?: string
  class?: string
  startDate?: string
  endDate?: string
}

interface FilterSqlParts {
  where: string[]
  params: (string | number | null)[]
}

function buildStudentScoreFilters(tenantId: string, filters: AnalyticsFilters): FilterSqlParts {
  const where: string[] = ['tenant_id = $1']
  const params: (string | number | null)[] = [tenantId]
  let p = 2

  if (filters.academicSession) {
    where.push(`academic_session = $${p++}`)
    params.push(filters.academicSession)
  }
  if (filters.term) {
    where.push(`term = $${p++}`)
    params.push(filters.term)
  }
  if (filters.class) {
    where.push(`class = $${p++}`)
    params.push(filters.class)
  }

  return { where, params }
}

function buildFeeRecordFilters(tenantId: string, filters: AnalyticsFilters): FilterSqlParts {
  const where: string[] = ['tenant_id = $1']
  const params: (string | number | null)[] = [tenantId]
  let p = 2

  if (filters.academicSession) {
    where.push(`academic_session = $${p++}`)
    params.push(filters.academicSession)
  }
  if (filters.term) {
    where.push(`term = $${p++}`)
    params.push(filters.term)
  }
  if (filters.class) {
    where.push(`class = $${p++}`)
    params.push(filters.class)
  }
  if (filters.startDate) {
    where.push(`created_at >= $${p++}`)
    params.push(filters.startDate)
  }
  if (filters.endDate) {
    where.push(`created_at <= $${p++}`)
    params.push(`${filters.endDate}T23:59:59.999Z`)
  }

  return { where, params }
}

function toWhereClause(parts: FilterSqlParts) {
  return parts.where.length ? `WHERE ${parts.where.join(' AND ')}` : ''
}

export interface AcademicAnalytics {
  totalStudents: number
  totalSubjects: number
  averageScore: number
  passRate: number
  termComparison: {
    currentTerm: string
    previousTerm: string
    currentAverage: number
    previousAverage: number
  }
  subjectPerformance: { subject: string; averageScore: number; passRate: number }[]
  classPerformance: { class: string; averageScore: number; passRate: number }[]
}

export async function getAcademicAnalytics(
  tenantId: string,
  filters: AnalyticsFilters = {}
): Promise<AcademicAnalytics> {
  const baseFilter = buildStudentScoreFilters(tenantId, filters)
  const where = toWhereClause(baseFilter)

  const [studentsRes, subjectsRes, overallRes, subjectRes, classRes] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM students WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`,
    sql`SELECT COUNT(*) as count FROM subjects WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`,
    sql.query<{
      average_score: string
      pass_rate: string
    }>(
      `SELECT 
        AVG(total_score) as average_score,
        COUNT(CASE WHEN total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
      FROM student_scores
      ${where}`,
      baseFilter.params
    ),
    sql.query<{
      subject: string
      average_score: string
      pass_rate: string
    }>(
      `SELECT 
        subject,
        AVG(total_score) as average_score,
        COUNT(CASE WHEN total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
      FROM student_scores
      ${where}
      GROUP BY subject
      ORDER BY average_score DESC`,
      baseFilter.params
    ),
    sql.query<{
      class: string
      average_score: string
      pass_rate: string
    }>(
      `SELECT 
        class,
        AVG(total_score) as average_score,
        COUNT(CASE WHEN total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
      FROM student_scores
      ${where}
      GROUP BY class
      ORDER BY average_score DESC`,
      baseFilter.params
    ),
  ])

  const averageScore = parseFloat(overallRes.rows[0]?.average_score || '0')
  const passRate = parseFloat(overallRes.rows[0]?.pass_rate || '0')

  // Two most recent academic terms in the database
  const termsRes = await sql<{
    academic_session: string
    term: string
  }>`
    SELECT DISTINCT academic_session, term
    FROM student_scores
    WHERE tenant_id = ${tenantId}
    ORDER BY academic_session DESC, term DESC
    LIMIT 2
  `

  let currentTerm = 'Current Term'
  let previousTerm = 'Previous Term'
  let currentAverage = averageScore
  let previousAverage = averageScore

  if (filters.academicSession && filters.term) {
    currentTerm = `${filters.academicSession} - ${filters.term}`

    // Previous term: the most recent term before the selected one
    const previousRes = await sql.query<{
      average_score: string
    }>(
      `SELECT AVG(total_score) as average_score
       FROM student_scores
       WHERE tenant_id = $1
         AND NOT (academic_session = $2 AND term = $3)`,
      [tenantId, filters.academicSession, filters.term]
    )
    previousAverage = parseFloat(previousRes.rows[0]?.average_score || '0')
    previousTerm = previousRes.rows[0] ? `Previous` : 'Previous Term'
  } else if (termsRes.rows.length > 0) {
    currentTerm = `${termsRes.rows[0].academic_session} - ${termsRes.rows[0].term}`
    if (termsRes.rows.length > 1) {
      previousTerm = `${termsRes.rows[1].academic_session} - ${termsRes.rows[1].term}`
      const prevRes = await sql.query<{
        average_score: string
      }>(
        `SELECT AVG(total_score) as average_score
         FROM student_scores
         WHERE tenant_id = $1
           AND academic_session = $2
           AND term = $3`,
        [tenantId, termsRes.rows[1].academic_session, termsRes.rows[1].term]
      )
      previousAverage = parseFloat(prevRes.rows[0]?.average_score || '0')
    }
  }

  return {
    totalStudents: parseInt(studentsRes.rows[0]?.count || '0'),
    totalSubjects: parseInt(subjectsRes.rows[0]?.count || '0'),
    averageScore: Math.round(averageScore * 10) / 10,
    passRate: Math.round(passRate),
    termComparison: {
      currentTerm,
      previousTerm,
      currentAverage: Math.round(currentAverage * 10) / 10,
      previousAverage: Math.round(previousAverage * 10) / 10,
    },
    subjectPerformance: subjectRes.rows.map(row => ({
      subject: row.subject,
      averageScore: parseFloat(row.average_score || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
    })),
    classPerformance: classRes.rows.map(row => ({
      class: row.class,
      averageScore: parseFloat(row.average_score || '0'),
      passRate: parseFloat(row.pass_rate || '0'),
    })),
  }
}

export interface FinancialAnalytics {
  totalRevenue: number
  totalCollected: number
  outstandingBalance: number
  collectionRate: number
  monthlyRevenue: { month: string; revenue: number; collected: number }[]
  feeStructureBreakdown: { category: string; amount: number; percentage: number }[]
  paymentMethods: { method: string; amount: number; count: number }[]
  classOutstanding: { class: string; outstanding: number; collected: number }[]
}

export async function getFinancialAnalytics(
  tenantId: string,
  filters: AnalyticsFilters = {}
): Promise<FinancialAnalytics> {
  const feeFilter = buildFeeRecordFilters(tenantId, filters)
  const feeWhere = toWhereClause(feeFilter)

  const [revenueRes, collectedRes, monthlyRes, feeBreakdownRes, classOutstandingRes, paymentMethodsRes] = await Promise.all([
    sql.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM fee_records
       ${feeWhere}`,
      feeFilter.params
    ),
    sql.query<{ total: string }>(
      `SELECT COALESCE(SUM(paid), 0) as total
       FROM fee_records
       ${feeWhere}`,
      feeFilter.params
    ),
    sql.query<{
      month: string
      revenue: string
      collected: string
    }>(
      `SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(SUM(paid), 0) as collected
      FROM fee_records
      ${feeWhere}
      GROUP BY TO_CHAR(created_at, 'Mon YYYY')
      ORDER BY MIN(created_at)`,
      feeFilter.params
    ),
    sql.query<{
      fee_type: string
      total: string
    }>(
      `SELECT 
        fee_type,
        COALESCE(SUM(amount), 0) as total
      FROM fee_records
      ${feeWhere}
      GROUP BY fee_type`,
      feeFilter.params
    ),
    sql.query<{
      class: string
      outstanding: string
      collected: string
    }>(
      `SELECT 
        class,
        COALESCE(SUM(balance), 0) as outstanding,
        COALESCE(SUM(paid), 0) as collected
      FROM fee_records
      ${feeWhere}
      GROUP BY class
      ORDER BY outstanding DESC`,
      feeFilter.params
    ),
    sql.query<{
      method: string
      total: string
      count: string
    }>(
      `SELECT COALESCE(p.payment_method, 'unknown') as method, COALESCE(SUM(p.amount), 0) as total, COUNT(*) as count
       FROM payments p
       WHERE p.tenant_id = $1
         AND p.status IN ('success', 'verified', 'reconciled', 'paid')
         AND ($2::date IS NULL OR p.payment_date >= $2::date)
         AND ($3::date IS NULL OR p.payment_date <= $3::date)
       GROUP BY COALESCE(p.payment_method, 'unknown')
       ORDER BY total DESC`,
      [tenantId, filters.startDate || null, filters.endDate || null]
    ),
  ])

  const totalRevenue = parseFloat(revenueRes.rows[0]?.total || '0')
  const totalCollected = parseFloat(collectedRes.rows[0]?.total || '0')
  const outstandingBalance = totalRevenue - totalCollected
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0

  const totalFees = feeBreakdownRes.rows.reduce((sum, row) => sum + parseFloat(row.total || '0'), 0)

  return {
    totalRevenue,
    totalCollected,
    outstandingBalance,
    collectionRate,
    monthlyRevenue: monthlyRes.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue || '0'),
      collected: parseFloat(row.collected || '0'),
    })),
    feeStructureBreakdown: feeBreakdownRes.rows.map(row => ({
      category: row.fee_type,
      amount: parseFloat(row.total || '0'),
      percentage: totalFees > 0 ? Math.round((parseFloat(row.total || '0') / totalFees) * 100) : 0,
    })),
    paymentMethods: paymentMethodsRes.rows.map(row => ({
      method: row.method,
      amount: parseFloat(row.total || '0'),
      count: parseInt(row.count || '0'),
    })),
    classOutstanding: classOutstandingRes.rows.map(row => ({
      class: row.class,
      outstanding: parseFloat(row.outstanding || '0'),
      collected: parseFloat(row.collected || '0'),
    })),
  }
}

export interface PerformanceAnalytics {
  overallAverage: number
  overallPassRate: number
  atRiskStudents: number
  topPerformers: number
  termTrend: { term: string; average: number; passRate: number }[]
  gradeDistribution: { grade: string; count: number; percentage: number }[]
  subjectRanking: { subject: string; average: number; rank: number }[]
}

export async function getPerformanceAnalytics(
  tenantId: string,
  filters: AnalyticsFilters = {}
): Promise<PerformanceAnalytics> {
  const baseFilter = buildStudentScoreFilters(tenantId, filters)
  const where = toWhereClause(baseFilter)

  const [overallRes, atRiskRes, topRes, gradeRes, subjectRes] = await Promise.all([
    sql.query<{
      average_score: string
      pass_rate: string
    }>(
      `SELECT 
        AVG(total_score) as average_score,
        COUNT(CASE WHEN total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
      FROM student_scores
      ${where}`,
      baseFilter.params
    ),
    sql.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM (
         SELECT student_id
         FROM student_scores
         ${where}
         GROUP BY student_id
         HAVING AVG(total_score) < 50
       ) at_risk`,
      baseFilter.params
    ),
    sql.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM (
         SELECT student_id
         FROM student_scores
         ${where}
         GROUP BY student_id
         HAVING AVG(total_score) >= 75
       ) top_performers`,
      baseFilter.params
    ),
    sql.query<{
      grade: string
      count: string
    }>(
      `SELECT 
        CASE 
          WHEN total_score >= 70 THEN 'A'
          WHEN total_score >= 60 THEN 'B'
          WHEN total_score >= 50 THEN 'C'
          WHEN total_score >= 45 THEN 'D'
          WHEN total_score >= 40 THEN 'E'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
      FROM student_scores
      ${where}
      GROUP BY grade
      ORDER BY grade DESC`,
      baseFilter.params
    ),
    sql.query<{
      subject: string
      average: string
      rank: string
    }>(
      `SELECT 
        subject,
        AVG(total_score) as average,
        ROW_NUMBER() OVER (ORDER BY AVG(total_score) DESC) as rank
      FROM student_scores
      ${where}
      GROUP BY subject
      ORDER BY average DESC`,
      baseFilter.params
    ),
  ])

  const overallAverage = parseFloat(overallRes.rows[0]?.average_score || '0')
  const overallPassRate = parseFloat(overallRes.rows[0]?.pass_rate || '0')

  const trendRes = await sql.query<{
    academic_session: string
    term: string
    average: string
    pass_rate: string
  }>(
    `SELECT 
      academic_session,
      term,
      AVG(total_score) as average,
      COUNT(CASE WHEN total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
    FROM student_scores
    WHERE tenant_id = $1
    GROUP BY academic_session, term
    ORDER BY academic_session DESC, term DESC
    LIMIT 3`,
    [tenantId]
  )

  const termTrend = trendRes.rows
    .sort((a, b) => (a.academic_session > b.academic_session ? 1 : -1) || (a.term > b.term ? 1 : -1))
    .map(row => ({
      term: `${row.academic_session} - ${row.term}`,
      average: Math.round(parseFloat(row.average || '0') * 10) / 10,
      passRate: Math.round(parseFloat(row.pass_rate || '0')),
    }))

  const totalGrades = gradeRes.rows.reduce((sum, row) => sum + parseInt(row.count || '0'), 0)

  return {
    overallAverage: Math.round(overallAverage * 10) / 10,
    overallPassRate: Math.round(overallPassRate),
    atRiskStudents: parseInt(atRiskRes.rows[0]?.count || '0'),
    topPerformers: parseInt(topRes.rows[0]?.count || '0'),
    termTrend,
    gradeDistribution: gradeRes.rows.map(row => ({
      grade: row.grade,
      count: parseInt(row.count || '0'),
      percentage: totalGrades > 0 ? Math.round((parseInt(row.count || '0') / totalGrades) * 100) : 0,
    })),
    subjectRanking: subjectRes.rows.map(row => ({
      subject: row.subject,
      average: parseFloat(row.average || '0'),
      rank: parseInt(row.rank || '0'),
    })),
  }
}

export interface TeacherPerformanceAnalytics {
  totalTeachers: number
  teachersAssessed: number
  averageRating: number | null
  topPerformers: number
  needsImprovement: number
  teacherRanking: { teacher: string; subject: string; averageScore: number; passRate: number; rating: string }[]
  subjectComparison: { subject: string; subjectAverage: number; schoolAverage: number }[]
  termTrend: { term: string; averageScore: number; passRate: number }[]
}

export async function getTeacherPerformanceAnalytics(
  tenantId: string,
  filters: AnalyticsFilters = {}
): Promise<TeacherPerformanceAnalytics> {
  const baseFilter = buildStudentScoreFilters(tenantId, filters)
  const where = toWhereClause(baseFilter)

  const [teachersRes, deptRes, subjectRes, trendRes] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM staff WHERE tenant_id = ${tenantId}`,
    // Department-linked assessment: a teacher is assessed by the filtered scores
    // recorded for the subject matching their staff department.
    sql.query<{
      teacher: string
      subject: string
      average_score: string
      pass_rate: string
    }>(
      `SELECT
        s.name as teacher,
        s.department as subject,
        AVG(ss.total_score) as average_score,
        COUNT(CASE WHEN ss.total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
      FROM staff s
      JOIN (SELECT subject, total_score FROM student_scores ${where}) ss
        ON ss.subject = s.department
      WHERE s.tenant_id = $1
      GROUP BY s.id, s.name, s.department
      ORDER BY average_score DESC`,
      baseFilter.params
    ),
    sql.query<{
      subject: string
      subject_average: string
      count: string
    }>(
      `SELECT
        subject,
        AVG(total_score) as subject_average,
        COUNT(*) as count
      FROM student_scores
      ${where}
      GROUP BY subject
      ORDER BY subject_average DESC`,
      baseFilter.params
    ),
    sql.query<{
      academic_session: string
      term: string
      average: string
      pass_rate: string
    }>(
      `SELECT
        academic_session,
        term,
        AVG(total_score) as average,
        COUNT(CASE WHEN total_score >= 50 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as pass_rate
      FROM student_scores
      WHERE tenant_id = $1
      GROUP BY academic_session, term
      ORDER BY academic_session DESC, term DESC
      LIMIT 6`,
      [tenantId]
    ),
  ])

  const totalTeachers = parseInt(teachersRes.rows[0]?.count || '0')

  const deptStats = deptRes.rows.map(row => ({
    teacher: row.teacher,
    subject: row.subject,
    averageScore: Math.round(parseFloat(row.average_score || '0') * 10) / 10,
    passRate: Math.round(parseFloat(row.pass_rate || '0')),
  }))

  // Rating is derived from real student outcomes (avg score mapped to a 5-point scale)
  const ratingOf = (avg: number) => (avg / 20).toFixed(1)
  const teacherRanking = deptStats.slice(0, 5).map(row => ({
    ...row,
    rating: ratingOf(row.averageScore),
  }))

  const assessed = deptStats.filter(row => row.averageScore > 0)
  const averageRating = assessed.length > 0
    ? parseFloat((assessed.reduce((sum, row) => sum + row.averageScore, 0) / assessed.length / 20).toFixed(1))
    : null
  const topPerformers = deptStats.filter(row => row.averageScore >= 70).length
  const needsImprovement = deptStats.filter(row => row.averageScore > 0 && row.averageScore < 50).length

  const totalScoreCount = subjectRes.rows.reduce((sum, row) => sum + parseInt(row.count || '0'), 0)
  const schoolAverage = totalScoreCount > 0
    ? subjectRes.rows.reduce((sum, row) => sum + parseFloat(row.subject_average || '0') * parseInt(row.count || '0'), 0) / totalScoreCount
    : 0

  const subjectComparison = subjectRes.rows.map(row => ({
    subject: row.subject,
    subjectAverage: Math.round(parseFloat(row.subject_average || '0') * 10) / 10,
    schoolAverage: Math.round(schoolAverage * 10) / 10,
  }))

  const termTrend = trendRes.rows
    .slice()
    .sort((a, b) => (a.academic_session > b.academic_session ? 1 : -1) || (a.term > b.term ? 1 : -1))
    .map(row => ({
      term: `${row.academic_session} - ${row.term}`,
      averageScore: Math.round(parseFloat(row.average || '0') * 10) / 10,
      passRate: Math.round(parseFloat(row.pass_rate || '0')),
    }))

  return {
    totalTeachers,
    teachersAssessed: deptStats.length,
    averageRating,
    topPerformers,
    needsImprovement,
    teacherRanking,
    subjectComparison,
    termTrend,
  }
}

export interface StudentProgressAnalytics {
  totalStudents: number
  improvingStudents: number
  decliningStudents: number
  unassessedStudents: number
  progressByClass: {
    class: string
    totalStudents: number
    averageScore: string
    averageAttendance: string
    averageExamScore: string
    totalExamsTaken: number
    studentsOnTrack: number
    studentsBehind: number
  }[]
  subjectProgress: {
    subject: string
    studentsAttempted: number
    currentAverage: number
    averagePercentage: string
    totalExams: number
  }[]
  riskCategories: { category: string; count: number; percentage: number }[]
  attendanceImpact: { class: string; attendanceRate: string; averageScore: string }[]
  examParticipation: {
    class: string
    totalExams: number
    studentsStarted: number
    studentsCompleted: number
    completionRate: number
    avgQuestionsAnswered: string
  }[]
  financialImpact: {
    totalStudents: number
    fullyPaid: number
    partiallyPaid: number
    pendingPayment: number
  }
  promotionTrends: { toClass: string; action: string; count: number; averageScore: string }[]
  studentCategories: {
    studentId: string
    class: string
    totalScore: number
    attendancePercentage: number
    avgExamScore: number
    overallScore: number
    category: string
  }[]
}

export async function getStudentProgressAnalytics(
  tenantId: string,
  filters: AnalyticsFilters = {}
): Promise<StudentProgressAnalytics> {
  const studentsResult = await sql.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM students
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND ($2::text IS NULL OR class = $2)`,
    [tenantId, filters.class || null]
  )
  const totalStudents = parseInt(studentsResult.rows[0]?.count || '0')

  // exam_results has no tenant_id — it is scoped through exams.tenant_id,
  // and er.percentage (0-100) is used so exams with different total_marks
  // contribute comparable values.
  const academicPerformanceResult = await sql.query<{
    student_id: string
    class: string
    total_score: string
    attendance_percentage: string
    exams_taken: string
    avg_exam_score: string
  }>(
    `SELECT
      s.id as student_id,
      s.class,
      COALESCE(ss.total_score, 0) as total_score,
      COALESCE(ss.attendance_percentage, 0) as attendance_percentage,
      COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN er.id END) as exams_taken,
      AVG(CASE WHEN e.id IS NOT NULL THEN CAST(er.percentage AS NUMERIC) END) as avg_exam_score
    FROM students s
    LEFT JOIN student_scores ss ON s.id::text = ss.student_id
      AND ss.tenant_id = $1
      AND ss.academic_session = COALESCE($2, (SELECT MAX(academic_session) FROM student_scores WHERE tenant_id = $1))
      AND ($4::text IS NULL OR ss.term = $4)
    LEFT JOIN exam_results er ON er.student_id = s.id::text
    LEFT JOIN exams e ON e.id = er.exam_id AND e.tenant_id = $1 AND e.deleted_at IS NULL
    WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
      AND ($3::text IS NULL OR s.class = $3)
    GROUP BY s.id, s.class, ss.total_score, ss.attendance_percentage`,
    [tenantId, filters.academicSession || null, filters.class || null, filters.term || null]
  )

  let excelling = 0
  let onTrack = 0
  let atRisk = 0
  let critical = 0
  let unassessed = 0

  const classBuckets = new Map<string, {
    totalStudents: number
    sumScore: number
    scoredStudents: number
    sumAttendance: number
    sumExamScore: number
    examScoredStudents: number
    totalExamsTaken: number
    onTrack: number
    behind: number
  }>()

  const studentCategories = academicPerformanceResult.rows.map(row => {
    const totalScore = parseFloat(row.total_score || '0')
    const attendance = parseFloat(row.attendance_percentage || '0')
    const avgExamScore = parseFloat(row.avg_exam_score || '0')
    const examsTaken = parseInt(row.exams_taken || '0')
    const overallScore = totalScore * 0.4 + attendance * 0.3 + avgExamScore * 0.3

    let category: string
    if (totalScore === 0 && attendance === 0 && avgExamScore === 0 && examsTaken === 0) {
      category = 'unassessed'
      unassessed++
    } else if (overallScore >= 75 && attendance >= 75) {
      category = 'excelling'
      excelling++
    } else if (overallScore >= 50 && attendance >= 60) {
      category = 'on_track'
      onTrack++
    } else if (overallScore >= 40 && attendance >= 50) {
      category = 'at_risk'
      atRisk++
    } else {
      category = 'critical'
      critical++
    }

    const bucket = classBuckets.get(row.class) ?? {
      totalStudents: 0, sumScore: 0, scoredStudents: 0, sumAttendance: 0,
      sumExamScore: 0, examScoredStudents: 0, totalExamsTaken: 0, onTrack: 0, behind: 0,
    }
    bucket.totalStudents++
    if (totalScore > 0) { bucket.sumScore += totalScore; bucket.scoredStudents++ }
    bucket.sumAttendance += attendance
    if (avgExamScore > 0) { bucket.sumExamScore += avgExamScore; bucket.examScoredStudents++ }
    bucket.totalExamsTaken += examsTaken
    if (category === 'excelling' || category === 'on_track') bucket.onTrack++
    else if (category === 'at_risk' || category === 'critical') bucket.behind++
    classBuckets.set(row.class, bucket)

    return {
      studentId: row.student_id,
      class: row.class,
      totalScore,
      attendancePercentage: attendance,
      avgExamScore,
      overallScore,
      category,
    }
  })

  const improvingStudents = onTrack + excelling
  const decliningStudents = atRisk + critical

  const progressByClass = Array.from(classBuckets.entries())
    .map(([cls, b]) => ({
      class: cls,
      totalStudents: b.totalStudents,
      averageScore: (b.scoredStudents > 0 ? b.sumScore / b.scoredStudents : 0).toFixed(1),
      averageAttendance: (b.totalStudents > 0 ? b.sumAttendance / b.totalStudents : 0).toFixed(1),
      averageExamScore: (b.examScoredStudents > 0 ? b.sumExamScore / b.examScoredStudents : 0).toFixed(1),
      totalExamsTaken: b.totalExamsTaken,
      studentsOnTrack: b.onTrack,
      studentsBehind: b.behind,
    }))
    .sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore))

  const subjectProgressResult = await sql`
    SELECT
      e.subject,
      COUNT(DISTINCT er.student_id) as students_attempted,
      AVG(CAST(er.score AS NUMERIC)) as avg_score,
      AVG(CAST(er.percentage AS NUMERIC)) as avg_percentage,
      COUNT(DISTINCT e.id) as total_exams
    FROM exam_results er
    JOIN exams e ON er.exam_id = e.id
    WHERE e.tenant_id = ${tenantId} AND e.deleted_at IS NULL
    GROUP BY e.subject
    ORDER BY avg_score DESC NULLS LAST
  `
  const subjectProgress = subjectProgressResult.rows.map(row => ({
    subject: row.subject,
    studentsAttempted: parseInt(row.students_attempted || '0'),
    currentAverage: parseFloat(row.avg_score || '0'),
    averagePercentage: parseFloat(row.avg_percentage || '0').toFixed(1),
    totalExams: parseInt(row.total_exams || '0'),
  }))

  const attendanceImpactResult = await sql.query<{
    class: string
    total_students: string
    attendance_rate: string
    avg_score: string
  }>(
    `SELECT
      s.class,
      COUNT(DISTINCT s.id) as total_students,
      AVG(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) * 100 as attendance_rate,
      AVG(CAST(ss.total_score AS NUMERIC)) as avg_score
    FROM students s
    LEFT JOIN attendance_records ar ON s.id::text = ar.student_id
      AND ar.tenant_id = $1
      AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
    LEFT JOIN student_scores ss ON s.id::text = ss.student_id
      AND ss.tenant_id = $1
      AND ss.academic_session = COALESCE($2, (SELECT MAX(academic_session) FROM student_scores WHERE tenant_id = $1))
    WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
      AND ($3::text IS NULL OR s.class = $3)
    GROUP BY s.class
    ORDER BY attendance_rate DESC NULLS LAST`,
    [tenantId, filters.academicSession || null, filters.class || null]
  )
  const attendanceImpact = attendanceImpactResult.rows.map(row => ({
    class: row.class,
    attendanceRate: parseFloat(row.attendance_rate || '0').toFixed(1),
    averageScore: parseFloat(row.avg_score || '0').toFixed(1),
  }))

  const examParticipationResult = await sql.query<{
    class: string
    total_exams: string
    students_started: string
    students_completed: string
    avg_questions_answered: string
  }>(
    `SELECT
      e.class,
      COUNT(DISTINCT e.id) as total_exams,
      COUNT(DISTINCT sep.student_id) as students_started,
      COUNT(DISTINCT er.student_id) as students_completed,
      AVG(CAST(sep.questions_answered AS NUMERIC)) as avg_questions_answered
    FROM exams e
    LEFT JOIN student_exam_progress sep ON e.id = sep.exam_id
    LEFT JOIN exam_results er ON e.id = er.exam_id
    WHERE e.tenant_id = $1 AND e.deleted_at IS NULL
      AND ($2::text IS NULL OR e.class = $2)
    GROUP BY e.class
    ORDER BY students_completed DESC NULLS LAST`,
    [tenantId, filters.class || null]
  )
  const examParticipation = examParticipationResult.rows.map(row => {
    const studentsStarted = parseInt(row.students_started || '0')
    const studentsCompleted = parseInt(row.students_completed || '0')
    const completionRate = studentsStarted > 0 ? (studentsCompleted / studentsStarted) * 100 : 0
    return {
      class: row.class,
      totalExams: parseInt(row.total_exams || '0'),
      studentsStarted,
      studentsCompleted,
      completionRate: parseFloat(completionRate.toFixed(1)),
      avgQuestionsAnswered: parseFloat(row.avg_questions_answered || '0').toFixed(1),
    }
  })

  const financialImpactResult = await sql.query<{
    total_students: string
    fully_paid: string
    partially_paid: string
    pending_payment: string
  }>(
    `SELECT
      COUNT(DISTINCT s.id) as total_students,
      COUNT(DISTINCT CASE WHEN fa.status = 'paid' THEN s.id END) as fully_paid,
      COUNT(DISTINCT CASE WHEN fa.status = 'partial' THEN s.id END) as partially_paid,
      COUNT(DISTINCT CASE WHEN fa.status IN ('pending', 'overdue') THEN s.id END) as pending_payment
    FROM students s
    LEFT JOIN fee_assignments fa ON s.id::text = fa.student_id
    WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
      AND ($2::text IS NULL OR s.class = $2)`,
    [tenantId, filters.class || null]
  )
  const financialImpact = {
    totalStudents: parseInt(financialImpactResult.rows[0]?.total_students || '0'),
    fullyPaid: parseInt(financialImpactResult.rows[0]?.fully_paid || '0'),
    partiallyPaid: parseInt(financialImpactResult.rows[0]?.partially_paid || '0'),
    pendingPayment: parseInt(financialImpactResult.rows[0]?.pending_payment || '0'),
  }

  const promotionTrendsResult = await sql.query<{
    to_class: string
    action: string
    count: string
    avg_score: string
  }>(
    `SELECT
      to_class,
      action,
      COUNT(*) as count,
      AVG(CAST(average_score AS NUMERIC)) as avg_score
    FROM promotion_records
    WHERE tenant_id = $1
      AND academic_session = COALESCE($2, (SELECT MAX(academic_session) FROM promotion_records WHERE tenant_id = $1))
      AND ($3::text IS NULL OR to_class = $3)
    GROUP BY to_class, action
    ORDER BY to_class, action`,
    [tenantId, filters.academicSession || null, filters.class || null]
  )
  const promotionTrends = promotionTrendsResult.rows.map(row => ({
    toClass: row.to_class,
    action: row.action,
    count: parseInt(row.count || '0'),
    averageScore: parseFloat(row.avg_score || '0').toFixed(1),
  }))

  const riskCategories = [
    { category: 'On Track', count: onTrack, percentage: totalStudents > 0 ? Math.round((onTrack / totalStudents) * 100) : 0 },
    { category: 'At Risk', count: atRisk, percentage: totalStudents > 0 ? Math.round((atRisk / totalStudents) * 100) : 0 },
    { category: 'Critical', count: critical, percentage: totalStudents > 0 ? Math.round((critical / totalStudents) * 100) : 0 },
    { category: 'Excelling', count: excelling, percentage: totalStudents > 0 ? Math.round((excelling / totalStudents) * 100) : 0 },
    { category: 'Unassessed', count: unassessed, percentage: totalStudents > 0 ? Math.round((unassessed / totalStudents) * 100) : 0 },
  ]

  return {
    totalStudents,
    improvingStudents,
    decliningStudents,
    unassessedStudents: unassessed,
    progressByClass,
    subjectProgress,
    riskCategories,
    attendanceImpact,
    examParticipation,
    financialImpact,
    promotionTrends,
    studentCategories: studentCategories.slice(0, 20),
  }
}

export interface AttendanceAnalytics extends SummaryStats {
  overallAttendanceRate: number
  presentToday: number
  absentToday: number
  lateToday: number
  monthlyTrend: { month: string; attendanceRate: number }[]
  classAttendance: { class: string; attendanceRate: number; present: number; absent: number; late: number }[]
}

export async function getAttendanceAnalytics(
  tenantId: string,
  filters: AnalyticsFilters = {}
): Promise<AttendanceAnalytics> {
  const termConditions: string[] = ['tenant_id = $1']
  const termParams: any[] = [tenantId]
  if (filters.term) {
    termParams.push(filters.term)
    termConditions.push(`term = $${termParams.length}`)
  }
  if (filters.academicSession) {
    termParams.push(filters.academicSession)
    termConditions.push(`academic_session = $${termParams.length}`)
  }
  if (filters.class) {
    termParams.push(filters.class)
    termConditions.push(`class = $${termParams.length}`)
  }
  const termWhere = termConditions.join(' AND ')

  const [summary, todayRes, monthlyRes, classRes] = await Promise.all([
    calculateSummaryStats(tenantId, filters.term, filters.academicSession),
    sql.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM attendance_records
       WHERE tenant_id = $1 AND date = CURRENT_DATE
       GROUP BY status`,
      [tenantId]
    ),
    sql.query<{ month: string; attendance_rate: string }>(
      `SELECT
        TO_CHAR(date_trunc('month', date), 'Mon YYYY') as month,
        date_trunc('month', date) as month_start,
        COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as attendance_rate
       FROM attendance_records
       WHERE tenant_id = $1
       GROUP BY month_start
       ORDER BY month_start DESC
       LIMIT 6`,
      [tenantId]
    ),
    sql.query<{
      class: string
      attendance_rate: string
      present: string
      absent: string
      late: string
    }>(
      `SELECT
        class,
        COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as attendance_rate,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late
       FROM attendance_records
       WHERE ${termWhere}
       GROUP BY class
       ORDER BY class`,
      termParams
    ),
  ])

  const todayCount = (status: string) =>
    parseInt(todayRes.rows.find(r => r.status === status)?.count || '0', 10)

  return {
    ...summary,
    overallAttendanceRate: summary.presentRate,
    presentToday: todayCount('present'),
    absentToday: todayCount('absent'),
    lateToday: todayCount('late'),
    monthlyTrend: monthlyRes.rows
      .slice()
      .reverse()
      .map(row => ({
        month: row.month,
        attendanceRate: Math.round(parseFloat(row.attendance_rate || '0') * 10) / 10,
      })),
    classAttendance: classRes.rows.map(row => ({
      class: row.class,
      attendanceRate: Math.round(parseFloat(row.attendance_rate || '0') * 10) / 10,
      present: parseInt(row.present || '0', 10),
      absent: parseInt(row.absent || '0', 10),
      late: parseInt(row.late || '0', 10),
    })),
  }
}
