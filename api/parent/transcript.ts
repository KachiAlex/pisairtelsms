import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { verifyParentChildAccess } from './_lib/verify-child.js';
import { getTenantCAConfig } from '../tenant/_lib/ca-config.js';
import { getLevelForClass } from '../tenant/_lib/grade-bands.js';

interface SubjectResult {
  subject: string; teacher: string; caScore: number; examScore: number;
  totalScore: number; grade: string; remark: string;
  classAverage: number; highestScore: number; lowestScore: number; position: number;
}
interface TermResult {
  term: string; academicSession: string; subjects: SubjectResult[];
  totalScore: number; averageScore: number; classPosition: string; totalStudents: number;
  attendancePercent: number; conduct: string; nextTermResumption: string; principalComment: string;
}
interface TranscriptResponse {
  student: { id: string; name: string; admissionNumber: string; class: string; arm: string; dateOfBirth: string; gender: string };
  sessions: TermResult[];
  cumulativeGPA: number; totalSubjectsTaken: number;
  caWeights?: { tests: number; assignments: number; projects: number; exams: number };
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
  const decoded = await requireRole(req, res, ['parent']);
  if (!decoded) return;
  const parentId = decoded.parentId!;
  const childrenIds = decoded.childrenIds || [];

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { childId } = req.query;
    if (!childId) return res.status(400).json({ error: 'childId is required' });

    if (!await verifyParentChildAccess(parentId, childId as string, decoded.tenantId || 'default-tenant')) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this child' });
    }

    const studentRes = await sql`SELECT id, name, admission_no, class, arm, gender, date_of_birth, tenant_id FROM students WHERE id = ${childId as string} AND tenant_id = ${decoded.tenantId || 'default-tenant'} AND deleted_at IS NULL LIMIT 1`;
    if (!studentRes.rows[0]) return res.status(404).json({ error: 'Student not found' });
    const s = studentRes.rows[0];
    const tenantId = s.tenant_id || 'default-tenant';
    const student = {
      id: s.id, name: s.name, admissionNumber: s.admission_no || '',
      class: s.class || '', arm: s.arm || '', dateOfBirth: s.date_of_birth || '', gender: s.gender || '',
    };

    // Get CA weights for this student's class level
    let caWeights: { tests: number; assignments: number; projects: number; exams: number } | undefined;
    try {
      const config = await getTenantCAConfig(tenantId);
      const level = getLevelForClass(s.class || '');
      caWeights = config.published[level];
    } catch { /* use undefined */ }

    // Fetch published compiled results joined with student_scores for breakdown.
    // Using compiled_results ensures grades/positions match what was officially
    // approved and published, rather than recomputing from raw scores.
    const compiledRes = await sql`
      SELECT cr.subject, cr.class, cr.academic_session, cr.term,
             cr.total_score, cr.grade, cr.remark,
             cr.class_average, cr.highest_score, cr.lowest_score,
             cr.subject_position, cr.class_position, cr.total_students,
             cr.attendance_percent, cr.principal_comment,
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
        AND cr.student_id = ${childId as string}
        AND cr.status = 'published'
      ORDER BY cr.academic_session, cr.term, cr.subject
    `;

    const termGroups: Record<string, { subjects: any[]; academicSession: string; term: string; class: string }> = {};
    for (const r of compiledRes.rows) {
      const key = `${r.academic_session || ''}|${r.term || 'Unknown'}`;
      if (!termGroups[key]) {
        termGroups[key] = { subjects: [], academicSession: r.academic_session || '', term: r.term || 'Unknown', class: r.class || '' };
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

    const sessions: TermResult[] = [];
    let cumulativeTotal = 0;
    let cumulativeSubjectCount = 0;
    let cumulativeGpaWeighted = 0;
    let cumulativeCreditHours = 0;

    for (const key of Object.keys(termGroups)) {
      const group = termGroups[key];
      const subjects: SubjectResult[] = group.subjects.map((subj: any) => ({
        subject: subj.subject, teacher: subj.teacher || '',
        caScore: subj.caScore, examScore: subj.examScore, totalScore: subj.totalScore,
        grade: subj.grade, remark: subj.remark,
        classAverage: subj.classAverage, highestScore: subj.highestScore,
        lowestScore: subj.lowestScore, position: subj.position,
      }));

      const totalScore = subjects.reduce((sum, sub) => sum + sub.totalScore, 0);
      const avgScore = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;
      cumulativeTotal += totalScore;
      cumulativeSubjectCount += subjects.length;

      // Track GPA components
      for (const subj of group.subjects) {
        const ch = subj.creditHours || 1;
        const gp = subj.gpaWeight || 0;
        cumulativeGpaWeighted += gp * ch;
        cumulativeCreditHours += ch;
      }

      const classPosition = ordinalSuffix(Number(group.subjects[0]?.classPosition || 1));
      const totalStudents = Number(group.subjects[0]?.totalStudents || 0);
      const attendancePercent = Number(group.subjects[0]?.attendancePercent || 0);
      const principalComment = group.subjects[0]?.principalComment || principalCommentFor(avgScore);

      sessions.push({
        term: group.term, academicSession: group.academicSession, subjects,
        totalScore, averageScore: avgScore,
        classPosition: totalStudents > 0 ? `${classPosition}` : '',
        totalStudents, attendancePercent, conduct: '',
        nextTermResumption: '', principalComment,
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
      .update(`${childId}|${tenantId}|${cumulativeGPA}|${totalSubjectsTaken}|${sessions.length}`)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    return res.status(200).json({
      student, sessions, cumulativeGPA, totalSubjectsTaken, caWeights,
      academicStanding, verificationHash,
    } as TranscriptResponse);
  } catch (error) {
    console.error('Error fetching parent transcript:', error);
    return res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}
