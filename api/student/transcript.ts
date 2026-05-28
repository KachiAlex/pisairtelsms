import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

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

    const resultsRes = await sql`SELECT id::text, subject, ca_score, exam_score,
      (ca_score+exam_score) AS total_score, grade, term, academic_session
      FROM results WHERE student_id = ${studentId} ORDER BY term, subject`;

    const termsMap: Record<string, SubjectResult[]> = {};
    const termMeta: Record<string, { academicSession: string }> = {};
    for (const r of resultsRes.rows) {
      const term = r.term || 'Unknown';
      if (!termsMap[term]) { termsMap[term] = []; termMeta[term] = { academicSession: r.academic_session || '' }; }
      termsMap[term].push({
        subject: r.subject, teacher: '', caScore: Number(r.ca_score), examScore: Number(r.exam_score),
        totalScore: Number(r.total_score), grade: r.grade || '', remark: '',
        classAverage: 0, highestScore: 0, lowestScore: 0, position: 0,
      });
    }

    const sessions: TermResult[] = Object.keys(termsMap).map(term => {
      const subjects = termsMap[term];
      const totalScore = subjects.reduce((sum, sub) => sum + sub.totalScore, 0);
      const avgScore = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;
      return {
        term, academicSession: termMeta[term].academicSession || '', subjects, totalScore, averageScore: avgScore,
        classPosition: '', totalStudents: 0, attendancePercent: 0, conduct: '',
        nextTermResumption: '', principalComment: '',
      };
    });

    const totalSubjectsTaken = Object.values(termsMap).reduce((sum, arr) => sum + arr.length, 0);
    return res.status(200).json({ student, sessions, cumulativeGPA: 0, totalSubjectsTaken } as TranscriptResponse);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return res.status(500).json({ error: 'Failed to fetch transcript' });
  }
}
