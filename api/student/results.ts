import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { getTenantCAConfig } from '../tenant/_lib/ca-config.js';
import { getLevelForClass } from '../tenant/_lib/grade-bands.js';

interface CAWeights {
  tests: number;
  assignments: number;
  projects: number;
  exams: number;
}

interface StudentResult {
  subject: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  testsScore: number;
  assignmentsScore: number;
  projectsScore: number;
  examsScore: number;
  attendancePercent: number;
  grade: string;
  remark: string;
  teacher: string;
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  subjectPosition: number;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireRole(req, res, ['student']);
  if (!decoded) return;

  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  try {
    // Defaults come from Timetable & Scheduling — the single source of truth.
    const tenantId = decoded.tenantId || 'default-tenant';
    let defaultSession = '', defaultTerm = '';
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tr = await sql`
        SELECT name, academic_year FROM timetable_terms
        WHERE tenant_id = ${tenantId}
        ORDER BY (start_date <= ${today} AND ${today} <= end_date) DESC, start_date ASC
        LIMIT 1`;
      defaultTerm = tr.rows[0]?.name || '';
      defaultSession = tr.rows[0]?.academic_year || '';
      if (!defaultSession) {
        const yr = await sql`SELECT name FROM academic_years WHERE tenant_id = ${tenantId} ORDER BY is_current DESC, start_date ASC LIMIT 1`;
        defaultSession = yr.rows[0]?.name || '';
      }
    } catch { /* tables may not exist yet */ }

    const academicSession = (req.query.academicSession as string) || defaultSession;
    const term = (req.query.term as string) || defaultTerm;

    // Get tenant_id and class for the student (scoped to JWT tenant)
    const tenantRes = await sql`SELECT tenant_id, class FROM students WHERE id = ${studentId} AND tenant_id = ${tenantId} LIMIT 1`;
    const studentClass = tenantRes.rows[0]?.class || '';
    const classLevel = getLevelForClass(studentClass);

    // Check whether results have been published for this session/term
    const pubCheck = await sql`
      SELECT COUNT(*)::int AS n FROM compiled_results
      WHERE tenant_id = ${tenantId}
        AND student_id = ${studentId}
        AND academic_session = ${academicSession as string}
        AND term = ${term as string}
        AND status = 'published'
    `;
    const isPublished = (pubCheck.rows[0]?.n ?? 0) > 0;
    if (!isPublished) {
      return res.status(200).json({
        results: [],
        averageScore: 0,
        classAverage: 0,
        classPosition: 0,
        totalStudents: 0,
        academicSession: academicSession as string,
        term: term as string,
        caWeights: { tests: 20, assignments: 15, projects: 15, exams: 50 },
        published: false,
      });
    }

    // Get CA weights for this student's class level
    let caWeights: CAWeights = { tests: 20, assignments: 15, projects: 15, exams: 50 };
    try {
      const config = await getTenantCAConfig(tenantId);
      caWeights = config.published[classLevel];
    } catch { /* use defaults */ }

    // Fetch compiled results (official grades, positions, class stats)
    // joined with student_scores for component breakdown
    const dbResult = await sql`
      SELECT cr.subject, cr.total_score, cr.grade, cr.remark,
             cr.class_average, cr.highest_score, cr.lowest_score,
             cr.subject_position, cr.overall_total, cr.overall_average,
             cr.class_position, cr.total_students, cr.attendance_percent,
             cr.principal_comment,
             ss.ca_score, ss.exam_score, ss.tests_score, ss.assignments_score,
             ss.projects_score, ss.exams_score, ss.submitted_by_name
      FROM compiled_results cr
      LEFT JOIN student_scores ss
        ON ss.student_id = cr.student_id
        AND ss.subject = cr.subject
        AND ss.tenant_id = cr.tenant_id
        AND ss.academic_session = cr.academic_session
        AND ss.term = cr.term
      WHERE cr.tenant_id = ${tenantId}
        AND cr.student_id = ${studentId}
        AND cr.academic_session = ${academicSession as string}
        AND cr.term = ${term as string}
        AND cr.status = 'published'
      ORDER BY cr.subject ASC
    `;

    const results: StudentResult[] = dbResult.rows.map((r: any) => ({
      subject: r.subject,
      caScore: Number(r.ca_score || 0),
      examScore: Number(r.exam_score || 0),
      totalScore: Number(r.total_score),
      testsScore: r.tests_score !== null && r.tests_score !== undefined ? Number(r.tests_score) : 0,
      assignmentsScore: r.assignments_score !== null && r.assignments_score !== undefined ? Number(r.assignments_score) : 0,
      projectsScore: r.projects_score !== null && r.projects_score !== undefined ? Number(r.projects_score) : 0,
      examsScore: r.exams_score !== null && r.exams_score !== undefined ? Number(r.exams_score) : 0,
      attendancePercent: Number(r.attendance_percent || 0),
      grade: r.grade || '',
      remark: r.remark || '',
      teacher: r.submitted_by_name || '',
      classAverage: Number(r.class_average || 0),
      highestScore: Number(r.highest_score || 0),
      lowestScore: Number(r.lowest_score || 0),
      subjectPosition: Number(r.subject_position || 0),
    }));

    const averageScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length)
      : 0;

    // Class position and total students from the first compiled result
    // (all rows for the same student/class/term share these values)
    const classPosition = Number(dbResult.rows[0]?.class_position || 0);
    const totalStudents = Number(dbResult.rows[0]?.total_students || 0);
    const classAverage = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.classAverage, 0) / results.length)
      : 0;

    return res.status(200).json({
      results,
      averageScore,
      classAverage,
      classPosition,
      totalStudents,
      academicSession,
      term,
      caWeights,
      published: true,
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
}
