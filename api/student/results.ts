import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface StudentResult {
  subject: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  attendancePercent: number;
  grade: string;
}

interface StudentResultsResponse {
  results: StudentResult[];
  averageScore: number;
  classAverage: number;
  academicSession: string;
  term: string;
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = extractStudentIdFromToken(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

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
