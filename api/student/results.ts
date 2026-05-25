import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = requireRole(req, res, ['student']);
  if (!decoded) return;

  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  try {

    const { academicSession = '2025/2026', term = 'First' } = req.query;

    const dbResult = await sql`
      SELECT subject, ca_score, exam_score,
             (ca_score + exam_score) AS total_score,
             grade,
             COALESCE(attendance_percent, 0) AS attendance_percent
      FROM results
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
      attendancePercent: Number(r.attendance_percent),
      grade: r.grade,
    }));

    const averageScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length)
      : 0;

    // Class average for the same session/term
    const classAvgResult = await sql`
      SELECT ROUND(AVG(ca_score + exam_score)) AS avg
      FROM results r
      JOIN students s ON s.id = r.student_id
      WHERE r.academic_session = ${academicSession as string}
        AND r.term = ${term as string}
        AND s.class = (SELECT class FROM students WHERE id = ${studentId} LIMIT 1)
    `;
    const classAverage = Number(classAvgResult.rows[0]?.avg ?? 0);

    return res.status(200).json({ results, averageScore, classAverage, academicSession, term });
  } catch (error) {
    console.error('Error fetching student results:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
}
