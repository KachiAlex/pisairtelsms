import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { getTenantCAConfig } from './_lib/ca-config.js';
import { getGradeBands, assignGradeFromBands, getLevelForClass, type GradeBand } from './_lib/grade-bands.js';

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
  student: { id: string; name: string; admissionNumber: string; class: string; arm: string; gender: string; dateOfBirth?: string };
  sessions: TermResult[];
  cumulativeGPA: number; totalSubjectsTaken: number;
  caWeights: CAWeights;
  academicStanding?: string;
  verificationHash?: string;
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
    const studentRes = await sql`SELECT id, name, admission_no, class, arm, gender, date_of_birth FROM students WHERE id = ${studentId as string} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1`;
    if (!studentRes.rows[0]) return res.status(404).json({ error: 'Student not found' });

    const s = studentRes.rows[0];
    const student = {
      id: s.id, name: s.name, admissionNumber: s.admission_no || '',
      class: s.class || '', arm: s.arm || '', gender: s.gender || '',
      dateOfBirth: s.date_of_birth || '',
    };

    // Load grade bands for this student's class level
    const studentClassLevel = getLevelForClass(s.class || '');
    const bands = await getGradeBands(tenantId, studentClassLevel);

    let caWeights: CAWeights = { tests: 20, assignments: 15, projects: 15, exams: 50 };
    try {
      const config = await getTenantCAConfig(tenantId);
      caWeights = config.published[studentClassLevel];
    } catch { /* use defaults */ }

    // Fetch compiled results (any status) joined with student_scores for breakdown.
    // Staff/admin can see all terms, including unpublished ones. We prefer
    // compiled_results because they contain the official grades/positions from
    // the compile → approve → publish workflow.
    const compiledRes = await sql`
      SELECT cr.subject, cr.class, cr.academic_session, cr.term,
             cr.total_score, cr.grade, cr.remark,
             cr.class_average, cr.highest_score, cr.lowest_score,
             cr.subject_position, cr.class_position, cr.total_students,
             cr.attendance_percent, cr.principal_comment, cr.status,
             cr.gpa_weight, cr.credit_hours,
             ss.ca_score, ss.exam_score,
             ss.tests_score, ss.assignments_score, ss.projects_score, ss.exams_score,
             ss.submitted_by_name
      FROM compiled_results cr
      LEFT JOIN student_scores ss
        ON ss.student_id = cr.student_id
        AND ss.subject = cr.subject
        AND ss.academic_session = cr.academic_session
        AND ss.term = cr.term
        AND ss.tenant_id = cr.tenant_id
      WHERE cr.tenant_id = ${tenantId}
        AND cr.student_id = ${studentId as string}
      ORDER BY cr.academic_session, cr.term, cr.subject
    `;

    // Also fetch raw student_scores for terms that have no compiled_results yet
    const rawScoresRes = await sql`
      SELECT subject, ca_score, exam_score, total_score,
             tests_score, assignments_score, projects_score, exams_score,
             attendance_percentage, term, academic_session, class,
             submitted_by_name
      FROM student_scores
      WHERE student_id = ${studentId as string}
        AND tenant_id = ${tenantId}
      ORDER BY academic_session, term, subject
    `;

    if (compiledRes.rows.length === 0 && rawScoresRes.rows.length === 0) {
      return res.status(200).json({
        data: { student, sessions: [], cumulativeGPA: 0, totalSubjectsTaken: 0, caWeights },
      });
    }

    // Build term groups from compiled_results
    const termGroups: Record<string, { subjects: any[]; academicSession: string; term: string; class: string; hasCompiled: boolean }> = {};
    const compiledTermKeys = new Set<string>();
    for (const r of compiledRes.rows) {
      const key = `${r.academic_session || ''}|${r.term || 'Unknown'}`;
      compiledTermKeys.add(key);
      if (!termGroups[key]) {
        termGroups[key] = { subjects: [], academicSession: r.academic_session || '', term: r.term || 'Unknown', class: r.class || '', hasCompiled: true };
      }
      termGroups[key].subjects.push({
        subject: r.subject,
        caScore: Number(r.ca_score || 0), examScore: Number(r.exam_score || 0), totalScore: Number(r.total_score),
        testsScore: r.tests_score !== null ? Number(r.tests_score) : 0,
        assignmentsScore: r.assignments_score !== null ? Number(r.assignments_score) : 0,
        projectsScore: r.projects_score !== null ? Number(r.projects_score) : 0,
        examsScore: r.exams_score !== null ? Number(r.exams_score) : 0,
        grade: r.grade || '', remark: r.remark || '',
        classAverage: Number(r.class_average || 0), highestScore: Number(r.highest_score || 0),
        lowestScore: Number(r.lowest_score || 0), position: Number(r.subject_position || 0),
        classPosition: Number(r.class_position || 0), totalStudents: Number(r.total_students || 0),
        attendancePercent: Number(r.attendance_percent || 0),
        principalComment: r.principal_comment || '',
        teacher: r.submitted_by_name || '',
      });
    }

    // Add raw scores for terms that don't have compiled_results (recompute grades)
    for (const r of rawScoresRes.rows) {
      const key = `${r.academic_session || ''}|${r.term || 'Unknown'}`;
      if (compiledTermKeys.has(key)) continue; // skip terms that already have compiled results
      if (!termGroups[key]) {
        termGroups[key] = { subjects: [], academicSession: r.academic_session || '', term: r.term || 'Unknown', class: r.class || '', hasCompiled: false };
      }
      termGroups[key].subjects.push({
        subject: r.subject,
        caScore: Number(r.ca_score), examScore: Number(r.exam_score), totalScore: Number(r.total_score),
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
          AND tenant_id = ${tenantId}
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
    let cumulativeGpaWeighted = 0;
    let cumulativeCreditHours = 0;

    for (const key of Object.keys(termGroups)) {
      const group = termGroups[key];
      let subjects: SubjectResult[];

      if (group.hasCompiled) {
        // Use pre-computed values from compiled_results
        subjects = group.subjects.map((subj: any) => ({
          subject: subj.subject,
          teacher: subj.teacher || '',
          caScore: subj.caScore,
          examScore: subj.examScore,
          totalScore: subj.totalScore,
          grade: subj.grade,
          remark: subj.remark,
          classAverage: subj.classAverage,
          highestScore: subj.highestScore,
          lowestScore: subj.lowestScore,
          position: subj.position,
          testsScore: subj.testsScore,
          assignmentsScore: subj.assignmentsScore,
          projectsScore: subj.projectsScore,
          examsScore: subj.examsScore,
        }));
      } else {
        // Recompute grades from raw scores for terms without compiled_results
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

        subjects = group.subjects.map((subj: any) => {
          const { grade, remark } = assignGradeFromBands(subj.totalScore, bands);
          const stats = ourStatsMap[subj.subject] || { classAvg: 0, highest: 0, lowest: 0, position: 1 };
          return {
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
          };
        });
      }

      const totalScore = subjects.reduce((sum, sub) => sum + sub.totalScore, 0);
      const avgScore = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;
      cumulativeTotal += totalScore;
      cumulativeSubjectCount += subjects.length;

      // Track GPA components from compiled_results
      for (const subj of group.subjects) {
        const ch = subj.creditHours || 1;
        const gp = subj.gpaWeight || 0;
        cumulativeGpaWeighted += gp * ch;
        cumulativeCreditHours += ch;
      }

      let classPosition: string;
      let totalStudents: number;
      let attendancePercent: number;
      let principalComment: string;

      if (group.hasCompiled) {
        classPosition = ordinalSuffix(Number(group.subjects[0]?.classPosition || 1));
        totalStudents = Number(group.subjects[0]?.totalStudents || 0);
        attendancePercent = Number(group.subjects[0]?.attendancePercent || 0);
        principalComment = group.subjects[0]?.principalComment || principalCommentFor(avgScore);
      } else {
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
        classPosition = ordinalSuffix(Number(classPosRes.rows[0]?.rank_pos || 1));
        totalStudents = Number(classPosRes.rows[0]?.total_students || 0);

        const attRes = await sql`
          SELECT ROUND(AVG(attendance_percentage)) AS avg_att
          FROM student_scores
          WHERE student_id = ${studentId as string}
            AND academic_session = ${group.academicSession}
            AND term = ${group.term}
            AND tenant_id = ${tenantId}
        `;
        attendancePercent = Number(attRes.rows[0]?.avg_att || 0);
        principalComment = principalCommentFor(avgScore);
      }

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
        principalComment,
      });
    }

    // Compute proper GPA: Σ(gpa_weight × credit_hours) / Σ(credit_hours)
    const cumulativeGPA = cumulativeCreditHours > 0
      ? Math.round((cumulativeGpaWeighted / cumulativeCreditHours) * 100) / 100
      : cumulativeSubjectCount > 0
        ? Math.round((cumulativeTotal / cumulativeSubjectCount) * 100) / 100
        : 0;
    const totalSubjectsTaken = cumulativeSubjectCount;

    // Academic standing based on GPA
    const academicStanding = cumulativeGPA >= 3.5 ? 'First Class'
      : cumulativeGPA >= 2.5 ? 'Second Class Upper'
      : cumulativeGPA >= 1.5 ? 'Second Class Lower'
      : cumulativeGPA >= 1.0 ? 'Pass'
      : cumulativeGPA > 0 ? 'Probation'
      : '';

    // Transcript verification hash
    const crypto = await import('crypto');
    const verificationHash = crypto
      .createHash('sha256')
      .update(`${studentId}|${tenantId}|${cumulativeGPA}|${totalSubjectsTaken}|${sessions.length}`)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    return res.status(200).json({
      data: {
        student, sessions, cumulativeGPA, totalSubjectsTaken, caWeights,
        academicStanding, verificationHash,
      } as TranscriptResponse,
    });
  } catch (error) {
    console.error('Error fetching tenant transcript:', error);
    return res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}
