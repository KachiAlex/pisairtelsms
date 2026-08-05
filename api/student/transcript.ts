import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

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

interface TranscriptResponse {
  student: { id: string; name: string; admissionNumber: string; class: string; arm: string; dateOfBirth: string; gender: string; passportPhoto?: string };
  sessions: TermResult[];
  cumulativeGPA: number; totalSubjectsTaken: number;
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) return xUserId.trim();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.studentId || payload.userId || payload.sub || null;
    }
  } catch {}
  return token || null;
}

function assignGrade(score: number): string {
  if (score >= 80) return 'A1';
  if (score >= 70) return 'B2';
  if (score >= 65) return 'B3';
  if (score >= 60) return 'C4';
  if (score >= 55) return 'C5';
  if (score >= 50) return 'C6';
  if (score >= 45) return 'D7';
  if (score >= 40) return 'E8';
  return 'F9';
}

function gradeRemark(grade: string): string {
  const remarks: Record<string, string> = {
    A1: 'Distinction', B2: 'Very Good', B3: 'Good',
    C4: 'Credit', C5: 'Credit', C6: 'Satisfactory',
    D7: 'Pass', E8: 'Marginal Pass', F9: 'Fail',
  };
  return remarks[grade] || '';
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const studentRes = await sql`SELECT id, name, admission_no, class, arm, gender FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1`;
    if (!studentRes.rows[0]) return res.status(404).json({ error: 'Student not found' });
    const s = studentRes.rows[0];
    const student = {
      id: s.id, name: s.name, admissionNumber: s.admission_no || '',
      class: s.class || '', arm: s.arm || '', dateOfBirth: '', gender: s.gender || '',
    };

    // Fetch all scores for this student from student_scores
    const resultsRes = await sql`
      SELECT subject, ca_score, exam_score, total_score,
             tests_score, assignments_score, projects_score, exams_score,
             attendance_percentage, term, academic_session, class
      FROM student_scores
      WHERE student_id = ${studentId}
      ORDER BY academic_session, term, subject
    `;

    // Group by term+session
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
      });
    }

    // For each term group, compute grades, class averages, ranks
    const sessions: TermResult[] = [];
    let cumulativeTotal = 0;
    let cumulativeSubjectCount = 0;

    for (const key of Object.keys(termGroups)) {
      const group = termGroups[key];
      const subjects: SubjectResult[] = [];

      for (const subj of group.subjects) {
        const grade = assignGrade(subj.totalScore);
        const remark = gradeRemark(grade);

        // Class statistics for this subject + term + session
        const statsRes = await sql`
          SELECT
            ROUND(AVG(total_score)) AS class_avg,
            MAX(total_score) AS highest,
            MIN(total_score) AS lowest,
            COUNT(*) AS total_entries
          FROM student_scores
          WHERE academic_session = ${group.academicSession}
            AND term = ${group.term}
            AND subject = ${subj.subject}
            AND class = ${group.class}
        `;
        const stats = statsRes.rows[0] || {};
        const classAverage = Number(stats.class_avg || 0);
        const highestScore = Number(stats.highest || 0);
        const lowestScore = Number(stats.lowest || 0);

        // Subject position: count students with higher total in same subject+class+term
        const posRes = await sql`
          SELECT COUNT(*) + 1 AS position
          FROM student_scores
          WHERE academic_session = ${group.academicSession}
            AND term = ${group.term}
            AND subject = ${subj.subject}
            AND class = ${group.class}
            AND total_score > ${subj.totalScore}
        `;
        const position = Number(posRes.rows[0]?.position || 1);

        subjects.push({
          subject: subj.subject,
          teacher: '',
          caScore: subj.caScore,
          examScore: subj.examScore,
          totalScore: subj.totalScore,
          grade,
          remark,
          classAverage,
          highestScore,
          lowestScore,
          position,
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

      // Class position: rank by total score across all students in same class
      const classPosRes = await sql`
        WITH student_totals AS (
          SELECT student_id, SUM(total_score) AS total
          FROM student_scores
          WHERE academic_session = ${group.academicSession}
            AND term = ${group.term}
            AND class = ${group.class}
          GROUP BY student_id
        )
        SELECT COUNT(*) + 1 AS position, COUNT(*) AS total_students
        FROM student_totals
        WHERE total > ${totalScore}
      `;
      const classPosition = ordinalSuffix(Number(classPosRes.rows[0]?.position || 1));
      // total_students from the above query is count of students above, so we need a separate query for actual total
      const totalStudentsRes = await sql`
        SELECT COUNT(DISTINCT student_id) AS total
        FROM student_scores
        WHERE academic_session = ${group.academicSession}
          AND term = ${group.term}
          AND class = ${group.class}
      `;
      const totalStudents = Number(totalStudentsRes.rows[0]?.total || 0);

      // Attendance average
      const attRes = await sql`
        SELECT ROUND(AVG(attendance_percentage)) AS avg_att
        FROM student_scores
        WHERE student_id = ${studentId}
          AND academic_session = ${group.academicSession}
          AND term = ${group.term}
      `;
      const attendancePercent = Number(attRes.rows[0]?.avg_att || 0);

      sessions.push({
        term: group.term,
        academicSession: group.academicSession,
        subjects,
        totalScore,
        averageScore: avgScore,
        classPosition: totalStudents > 0 ? `${classPosition}` : '',
        totalStudents,
        attendancePercent,
        conduct: '',
        nextTermResumption: '',
        principalComment: avgScore >= 70 ? 'Excellent performance. Keep it up.' : avgScore >= 50 ? 'Satisfactory performance. More effort needed.' : 'Below average. Requires significant improvement.',
      });
    }

    const cumulativeGPA = cumulativeSubjectCount > 0
      ? Math.round((cumulativeTotal / cumulativeSubjectCount) * 100) / 100
      : 0;
    const totalSubjectsTaken = cumulativeSubjectCount;

    return res.status(200).json({ student, sessions, cumulativeGPA, totalSubjectsTaken } as TranscriptResponse);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}
