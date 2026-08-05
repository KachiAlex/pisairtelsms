import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';

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

    const dbResult = await sql`
      SELECT subject, ca_score, exam_score, total_score,
             tests_score, assignments_score, projects_score, exams_score,
             attendance_percentage,
             class
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
    }));

    // Assign grades based on standard Nigerian grade bands
    const assignGrade = (score: number): string => {
      if (score >= 80) return 'A1';
      if (score >= 70) return 'B2';
      if (score >= 65) return 'B3';
      if (score >= 60) return 'C4';
      if (score >= 55) return 'C5';
      if (score >= 50) return 'C6';
      if (score >= 45) return 'D7';
      if (score >= 40) return 'E8';
      return 'F9';
    };

    for (const r of results) {
      r.grade = assignGrade(r.totalScore);
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
          AND tenant_id = (SELECT tenant_id FROM students WHERE id = ${studentId} LIMIT 1)
      `;
      classAverage = Number(classAvgResult.rows[0]?.avg ?? 0);
    }

    return res.status(200).json({ results, averageScore, classAverage, academicSession, term });
  } catch (error) {
    console.error('Error fetching student results:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
}
