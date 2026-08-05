import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';
import { getTenantCAConfig } from '../tenant/_lib/ca-config.js';

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
}

interface GradeBand {
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
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
];

async function getGradeBands(tenantId: string): Promise<GradeBand[]> {
  try {
    const scaleRes = await sql`
      SELECT id FROM grading_scales
      WHERE tenant_id = ${tenantId} AND status = 'live'
      ORDER BY updated_at DESC LIMIT 1
    `;
    if (!scaleRes.rows[0]) return DEFAULT_BANDS;
    const scaleId = scaleRes.rows[0].id;
    const bandsRes = await sql`
      SELECT grade, min_score, max_score, remark
      FROM grading_scale_bands
      WHERE scale_id = ${scaleId}
      ORDER BY min_score DESC
    `;
    if (bandsRes.rows.length === 0) return DEFAULT_BANDS;
    return bandsRes.rows.map((r: any) => ({
      grade: r.grade,
      minScore: Number(r.min_score),
      maxScore: Number(r.max_score),
      remark: r.remark || '',
    }));
  } catch {
    return DEFAULT_BANDS;
  }
}

function assignGrade(score: number, bands: GradeBand[]): { grade: string; remark: string } {
  for (const band of bands) {
    if (score >= band.minScore && score <= band.maxScore) {
      return { grade: band.grade, remark: band.remark };
    }
  }
  for (const band of bands) {
    if (score >= band.minScore) {
      return { grade: band.grade, remark: band.remark };
    }
  }
  return { grade: 'F9', remark: 'Fail' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { academicSession = '2025/2026', term = 'First' } = req.query;

    // Get tenant_id for grading scale lookup
    const tenantRes = await sql`SELECT tenant_id, class FROM students WHERE id = ${studentId} LIMIT 1`;
    const tenantId = tenantRes.rows[0]?.tenant_id || 'default-tenant';
    const studentClass = tenantRes.rows[0]?.class || '';
    const bands = await getGradeBands(tenantId);

    // Get CA weights for this student's class level
    let caWeights: CAWeights = { tests: 20, assignments: 15, projects: 15, exams: 50 };
    try {
      const config = await getTenantCAConfig(tenantId);
      const level = studentClass.toUpperCase().includes('SS') ? 'sss'
        : studentClass.toUpperCase().includes('JSS') ? 'jss' : 'primary';
      caWeights = config.published[level];
    } catch { /* use defaults */ }

    const dbResult = await sql`
      SELECT subject, ca_score, exam_score, total_score,
             tests_score, assignments_score, projects_score, exams_score,
             attendance_percentage,
             class, submitted_by_name
      FROM student_scores
      WHERE student_id = ${studentId}
        AND academic_session = ${academicSession as string}
        AND term = ${term as string}
      ORDER BY subject ASC
    `;

    const results: StudentResult[] = dbResult.rows.map(r => ({
      subject: r.subject,
      caScore: Number(r.ca_score),
      examScore: Number(r.exam_score),
      totalScore: Number(r.total_score),
      testsScore: r.tests_score !== null ? Number(r.tests_score) : 0,
      assignmentsScore: r.assignments_score !== null ? Number(r.assignments_score) : 0,
      projectsScore: r.projects_score !== null ? Number(r.projects_score) : 0,
      examsScore: r.exams_score !== null ? Number(r.exams_score) : 0,
      attendancePercent: Number(r.attendance_percentage),
      grade: '',
      remark: '',
      teacher: r.submitted_by_name || '',
    }));

    for (const r of results) {
      const { grade, remark } = assignGrade(r.totalScore, bands);
      r.grade = grade;
      r.remark = remark;
    }

    const averageScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length)
      : 0;

    // Class average from student_scores
    const studentClass = dbResult.rows[0]?.class;
    let classAverage = 0;
    if (studentClass) {
      const classAvgResult = await sql`
        SELECT ROUND(AVG(total_score)) AS avg
        FROM student_scores
        WHERE academic_session = ${academicSession as string}
          AND term = ${term as string}
          AND class = ${studentClass}
          AND tenant_id = ${tenantId}
      `;
      classAverage = Number(classAvgResult.rows[0]?.avg ?? 0);
    }

    return res.status(200).json({ results, averageScore, classAverage, academicSession, term, caWeights });
  } catch (error) {
    console.error('Error fetching student results:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
}
