import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // TODO: Fetch actual results from database filtered by studentId
    // For now, return mock data
    const results: StudentResult[] = [
      {
        subject: 'Mathematics',
        caScore: 18,
        examScore: 72,
        totalScore: 90,
        attendancePercent: 95,
        grade: 'A',
      },
      {
        subject: 'English Language',
        caScore: 16,
        examScore: 68,
        totalScore: 84,
        attendancePercent: 92,
        grade: 'B',
      },
      {
        subject: 'Physics',
        caScore: 17,
        examScore: 70,
        totalScore: 87,
        attendancePercent: 90,
        grade: 'A',
      },
      {
        subject: 'Chemistry',
        caScore: 15,
        examScore: 65,
        totalScore: 80,
        attendancePercent: 88,
        grade: 'B',
      },
      {
        subject: 'Biology',
        caScore: 16,
        examScore: 69,
        totalScore: 85,
        attendancePercent: 93,
        grade: 'B',
      },
    ];

    const averageScore = Math.round(
      results.reduce((sum, r) => sum + r.totalScore, 0) / results.length
    );

    const response: StudentResultsResponse = {
      results,
      averageScore,
      classAverage: 82,
      academicSession: academicSession as string,
      term: term as string,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching student results:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
}
