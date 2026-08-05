import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';
import { getTenantCAConfig } from './_lib/ca-config.js';

interface SubjectResult {
  subject: string; teacher: string; caScore: number; examScore: number;
  totalScore: number; grade: string; remark: string;
  classAverage: number; highestScore: number; lowestScore: number; position: number;
  testsScore: number; assignmentsScore: number; projectsScore: number; examsScore: number;
}

interface TermResult {
  term: string; academicSession: string; subjects: SubjectResult[];
  totalScore: number; averageScore: number; classPosition: string; totalStudents: number;
  attendancePercent: number; conduct: string; nextTermResumption: string; principalComment: string;
}

interface CAWeights {
  tests: number;
  assignments: number;
  projects: number;
  exams: number;
}

interface TranscriptResponse {
  student: { id: string; name: string; admissionNumber: string; class: string; arm: string; gender: string };
  sessions: TermResult[];
  cumulativeGPA: number; totalSubjectsTaken: number;
  caWeights: CAWeights;
}

interface GradeBand {
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
  gpaWeight: number;
}

const DEFAULT_BANDS: GradeBand[] = [
  { grade: 'A1', minScore: 80, maxScore: 100, remark: 'Distinction', gpaWeight: 4.0 },
  { grade: 'B2', minScore: 70, maxScore: 79, remark: 'Very Good', gpaWeight: 3.5 },
  { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good', gpaWeight: 3.0 },
  { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit', gpaWeight: 2.5 },
  { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit', gpaWeight: 2.0 },
  { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Satisfactory', gpaWeight: 1.5 },
  { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass', gpaWeight: 1.0 },
  { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Marginal Pass', gpaWeight: 0.5 },
  { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail', gpaWeight: 0.0 },
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
      SELECT grade, min_score, max_score, remark, gpa_weight
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
      gpaWeight: Number(r.gpa_weight) || 0,
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

function principalCommentFor(avg: number): string {
  if (avg >= 75) return 'Excellent performance. Keep up the outstanding work.';
  if (avg >= 60) return 'Very good performance. Continue to work hard.';
  if (avg >= 50) return 'Satisfactory performance. There is room for improvement.';
  if (avg >= 40) return 'Below average performance. More effort is required.';
  return 'Poor performance. Urgent intervention needed.';
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const tenantId = decoded.tenantId || 'default-tenant';

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { studentId } = req.query;
  if (!studentId || typeof studentId !== 'string') {
    return res.status(400).json({ error: 'studentId query parameter is required' });
  }

  try {
    const studentRes = await sql`SELECT id, name, admission_no, class, arm, gender FROM students WHERE id = ${studentId as string} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1`;
    if (!studentRes.rows[0]) return res.status(404).json({ error: 'Student not found' });

    const s = studentRes.rows[0];
    const student = {
      id: s.id, name: s.name, admissionNumber: s.admission_no || '',
      class: s.class || '', arm: s.arm || '', gender: s.gender || '',
    };

    const bands = await getGradeBands(tenantId);

    let caWeights: CAWeights = { tests: 20, assignments: 15, projects: 15, exams: 50 };
    try {
      const config = await getTenantCAConfig(tenantId);
      const level = (s.class || '').toUpperCase().includes('SS') ? 'sss'
        : (s.class || '').toUpperCase().includes('JSS') ? 'jss' : 'primary';
      caWeights = config.published[level];
    } catch { /* use defaults */ }

    const resultsRes = await sql`
      SELECT subject, ca_score, exam_score, total_score,
             tests_score, assignments_score, projects_score, exams_score,
             attendance_percentage, term, academic_session, class,
             submitted_by_name
      FROM student_scores
      WHERE student_id = ${studentId as string}
        AND tenant_id = ${tenantId}
      ORDER BY academic_session, term, subject
    `;

    if (resultsRes.rows.length === 0) {
      return res.status(200).json({
        data: { student, sessions: [], cumulativeGPA: 0, totalSubjectsTaken: 0, caWeights },
      });
    }

    const termGroups: Record<string, { subjects: any[]; academicSession: string; term: string; class: string }> = {};
    for (const r of resultsRes.rows) {
      const key = `${r.academic_session || ''}|${r.term || 'Unknown'}`;
      if (!termGroups[key]) {
        termGroups[key] = { subjects: [], academicSession: r.academic_session || '', term: r.term || 'Unknown', class: r.class || '' };
      }
      termGroups[key].subjects.push({
        subject: r.subject,
        caScore: Number(r.ca_score),
        examScore: Number(r.exam_score),
        totalScore: Number(r.total_score),
        testsScore: r.tests_score !== null ? Number(r.tests_score) : 0,
        assignmentsScore: r.assignments_score !== null ? Number(r.assignments_score) : 0,
        projectsScore: r.projects_score !== null ? Number(r.projects_score) : 0,
        examsScore: r.exams_score !== null ? Number(r.exams_score) : 0,
        attendancePercent: Number(r.attendance_percentage),
        teacher: r.submitted_by_name || '',
      });
    }

    let conductGrade = 'A';
    try {
      const conductRes = await sql`
        SELECT COUNT(*) AS incident_count
        FROM behavioral_incidents
        WHERE student_id = ${studentId as string}
      `;
      const incidentCount = Number(conductRes.rows[0]?.incident_count || 0);
      conductGrade = incidentCount === 0 ? 'A' : incidentCount <= 2 ? 'B' : 'C';
    } catch { /* table may not exist */ }

    let termDates: { name: string; academicYear: string; startDate: string }[] = [];
    try {
      const termsRes = await sql`
        SELECT name, academic_year, start_date
        FROM timetable_terms
        WHERE tenant_id = ${tenantId}
        ORDER BY start_date ASC
      `;
      termDates = termsRes.rows.map((r: any) => ({
        name: r.name,
        academicYear: r.academic_year,
        startDate: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date),
      }));
    } catch { /* table may not exist */ }

    function findNextTermResumption(currentTerm: string, currentSession: string): string {
      const sorted = [...termDates].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const idx = sorted.findIndex(t => t.name === currentTerm && t.academicYear === currentSession);
      if (idx >= 0 && idx < sorted.length - 1) {
        return sorted[idx + 1].startDate;
      }
      return '';
    }

    const sessions: TermResult[] = [];
    let cumulativeTotal = 0;
    let cumulativeSubjectCount = 0;

    for (const key of Object.keys(termGroups)) {
      const group = termGroups[key];
      const subjects: SubjectResult[] = [];

      const ourStatsRes = await sql`
        WITH class_data AS (
          SELECT
            student_id,
            subject,
            total_score,
            AVG(total_score) OVER (PARTITION BY subject) AS class_avg,
            MAX(total_score) OVER (PARTITION BY subject) AS highest,
            MIN(total_score) OVER (PARTITION BY subject) AS lowest,
            RANK() OVER (PARTITION BY subject ORDER BY total_score DESC) AS subject_rank
          FROM student_scores
          WHERE academic_session = ${group.academicSession}
            AND term = ${group.term}
            AND class = ${group.class}
            AND tenant_id = ${tenantId}
        )
        SELECT subject, class_avg, highest, lowest, subject_rank
        FROM class_data
        WHERE student_id = ${studentId as string}
      `;

      const ourStatsMap: Record<string, { classAvg: number; highest: number; lowest: number; position: number }> = {};
      for (const row of ourStatsRes.rows) {
        ourStatsMap[row.subject] = {
          classAvg: Number(row.class_avg || 0),
          highest: Number(row.highest || 0),
          lowest: Number(row.lowest || 0),
          position: Number(row.subject_rank || 1),
        };
      }

      for (const subj of group.subjects) {
        const { grade, remark } = assignGrade(subj.totalScore, bands);
        const stats = ourStatsMap[subj.subject] || { classAvg: 0, highest: 0, lowest: 0, position: 1 };

        subjects.push({
          subject: subj.subject,
          teacher: subj.teacher || '',
          caScore: subj.caScore,
          examScore: subj.examScore,
          totalScore: subj.totalScore,
          grade,
          remark,
          classAverage: stats.classAvg,
          highestScore: stats.highest,
          lowestScore: stats.lowest,
          position: stats.position,
          testsScore: subj.testsScore,
          assignmentsScore: subj.assignmentsScore,
          projectsScore: subj.projectsScore,
          examsScore: subj.examsScore,
        });
      }

      const totalScore = subjects.reduce((sum, sub) => sum + sub.totalScore, 0);
      const avgScore = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;
      cumulativeTotal += totalScore;
      cumulativeSubjectCount += subjects.length;

      const classPosRes = await sql`
        WITH student_totals AS (
          SELECT student_id, SUM(total_score) AS total
          FROM student_scores
          WHERE academic_session = ${group.academicSession}
            AND term = ${group.term}
            AND class = ${group.class}
            AND tenant_id = ${tenantId}
          GROUP BY student_id
        ),
        ranked AS (
          SELECT student_id, total, RANK() OVER (ORDER BY total DESC) AS rank_pos, COUNT(*) OVER () AS total_students
          FROM student_totals
        )
        SELECT rank_pos, total_students FROM ranked WHERE student_id = ${studentId as string}
      `;
      const classPosition = ordinalSuffix(Number(classPosRes.rows[0]?.rank_pos || 1));
      const totalStudents = Number(classPosRes.rows[0]?.total_students || 0);

      const attRes = await sql`
        SELECT ROUND(AVG(attendance_percentage)) AS avg_att
        FROM student_scores
        WHERE student_id = ${studentId as string}
          AND academic_session = ${group.academicSession}
          AND term = ${group.term}
          AND tenant_id = ${tenantId}
      `;
      const attendancePercent = Number(attRes.rows[0]?.avg_att || 0);

      const nextTermResumption = findNextTermResumption(group.term, group.academicSession);

      sessions.push({
        term: group.term,
        academicSession: group.academicSession,
        subjects,
        totalScore,
        averageScore: avgScore,
        classPosition: totalStudents > 0 ? `${classPosition}` : '',
        totalStudents,
        attendancePercent,
        conduct: conductGrade,
        nextTermResumption,
        principalComment: principalCommentFor(avgScore),
      });
    }

    const cumulativeGPA = cumulativeSubjectCount > 0
      ? Math.round((cumulativeTotal / cumulativeSubjectCount) * 100) / 100
      : 0;
    const totalSubjectsTaken = cumulativeSubjectCount;

    return res.status(200).json({
      data: { student, sessions, cumulativeGPA, totalSubjectsTaken, caWeights } as TranscriptResponse,
    });
  } catch (error) {
    console.error('Error fetching tenant transcript:', error);
    return res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}
