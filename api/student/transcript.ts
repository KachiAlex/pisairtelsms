import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SubjectResult {
  subject: string;
  teacher: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  remark: string;
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  position: number;
}

interface TermResult {
  term: string;
  academicSession: string;
  subjects: SubjectResult[];
  totalScore: number;
  averageScore: number;
  classPosition: string;
  totalStudents: number;
  attendancePercent: number;
  conduct: string;
  nextTermResumption: string;
  principalComment: string;
}

interface TranscriptResponse {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    class: string;
    arm: string;
    dateOfBirth: string;
    gender: string;
    passportPhoto?: string;
  };
  sessions: TermResult[];
  cumulativeGPA: number;
  totalSubjectsTaken: number;
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return xUserId.trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.studentId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  return token || null;
}

const mockTranscript: TranscriptResponse = {
  student: {
    id: 'stu-001',
    name: 'Chidi Okonkwo',
    admissionNumber: 'SCH/2022/001',
    class: 'Senior Secondary 2',
    arm: 'A',
    dateOfBirth: '2008-05-15',
    gender: 'Male',
  },
  sessions: [
    {
      term: 'First Term',
      academicSession: '2024/2025',
      subjects: [
        {
          subject: 'Mathematics',
          teacher: 'Mr. Okafor',
          caScore: 28,
          examScore: 58,
          totalScore: 86,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 62.5,
          highestScore: 95,
          lowestScore: 35,
          position: 3,
        },
        {
          subject: 'English Language',
          teacher: 'Mrs. Adeyemi',
          caScore: 25,
          examScore: 55,
          totalScore: 80,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 58.3,
          highestScore: 92,
          lowestScore: 30,
          position: 5,
        },
        {
          subject: 'Biology',
          teacher: 'Dr. Hassan',
          caScore: 22,
          examScore: 50,
          totalScore: 72,
          grade: 'B',
          remark: 'Very Good',
          classAverage: 55.0,
          highestScore: 88,
          lowestScore: 28,
          position: 8,
        },
        {
          subject: 'Chemistry',
          teacher: 'Mrs. Obi',
          caScore: 24,
          examScore: 48,
          totalScore: 72,
          grade: 'B',
          remark: 'Very Good',
          classAverage: 54.2,
          highestScore: 90,
          lowestScore: 25,
          position: 7,
        },
        {
          subject: 'Physics',
          teacher: 'Mr. Ibrahim',
          caScore: 20,
          examScore: 45,
          totalScore: 65,
          grade: 'C',
          remark: 'Good',
          classAverage: 50.8,
          highestScore: 85,
          lowestScore: 22,
          position: 12,
        },
        {
          subject: 'History',
          teacher: 'Mr. Chukwu',
          caScore: 26,
          examScore: 54,
          totalScore: 80,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 60.0,
          highestScore: 94,
          lowestScore: 32,
          position: 4,
        },
        {
          subject: 'Computer Science',
          teacher: 'Ms. Nwosu',
          caScore: 30,
          examScore: 60,
          totalScore: 90,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 65.5,
          highestScore: 96,
          lowestScore: 40,
          position: 2,
        },
        {
          subject: 'Agricultural Science',
          teacher: 'Mr. Mohammed',
          caScore: 23,
          examScore: 50,
          totalScore: 73,
          grade: 'B',
          remark: 'Very Good',
          classAverage: 56.0,
          highestScore: 89,
          lowestScore: 30,
          position: 9,
        },
        {
          subject: 'Fine Arts',
          teacher: 'Ms. Nwosu',
          caScore: 28,
          examScore: 62,
          totalScore: 90,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 68.0,
          highestScore: 95,
          lowestScore: 38,
          position: 3,
        },
      ],
      totalScore: 708,
      averageScore: 78.7,
      classPosition: '5th',
      totalStudents: 45,
      attendancePercent: 94.5,
      conduct: 'Very Good',
      nextTermResumption: '2025-01-13',
      principalComment: 'Chidi is a dedicated student with strong aptitude in Mathematics and Computer Science. He should continue to improve his performance in Physics.',
    },
    {
      term: 'Third Term',
      academicSession: '2023/2024',
      subjects: [
        {
          subject: 'Mathematics',
          teacher: 'Mr. Okafor',
          caScore: 25,
          examScore: 55,
          totalScore: 80,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 60.0,
          highestScore: 92,
          lowestScore: 32,
          position: 5,
        },
        {
          subject: 'English Language',
          teacher: 'Mrs. Adeyemi',
          caScore: 22,
          examScore: 52,
          totalScore: 74,
          grade: 'B',
          remark: 'Very Good',
          classAverage: 55.5,
          highestScore: 90,
          lowestScore: 28,
          position: 8,
        },
        {
          subject: 'Biology',
          teacher: 'Dr. Hassan',
          caScore: 20,
          examScore: 48,
          totalScore: 68,
          grade: 'C',
          remark: 'Good',
          classAverage: 52.0,
          highestScore: 86,
          lowestScore: 25,
          position: 11,
        },
        {
          subject: 'Chemistry',
          teacher: 'Mrs. Obi',
          caScore: 22,
          examScore: 46,
          totalScore: 68,
          grade: 'C',
          remark: 'Good',
          classAverage: 50.5,
          highestScore: 88,
          lowestScore: 22,
          position: 10,
        },
        {
          subject: 'Physics',
          teacher: 'Mr. Ibrahim',
          caScore: 18,
          examScore: 42,
          totalScore: 60,
          grade: 'C',
          remark: 'Good',
          classAverage: 48.0,
          highestScore: 82,
          lowestScore: 20,
          position: 15,
        },
        {
          subject: 'History',
          teacher: 'Mr. Chukwu',
          caScore: 24,
          examScore: 50,
          totalScore: 74,
          grade: 'B',
          remark: 'Very Good',
          classAverage: 58.0,
          highestScore: 90,
          lowestScore: 30,
          position: 7,
        },
        {
          subject: 'Computer Science',
          teacher: 'Ms. Nwosu',
          caScore: 28,
          examScore: 58,
          totalScore: 86,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 63.0,
          highestScore: 94,
          lowestScore: 35,
          position: 3,
        },
        {
          subject: 'Agricultural Science',
          teacher: 'Mr. Mohammed',
          caScore: 21,
          examScore: 48,
          totalScore: 69,
          grade: 'C',
          remark: 'Good',
          classAverage: 54.0,
          highestScore: 87,
          lowestScore: 28,
          position: 12,
        },
        {
          subject: 'Fine Arts',
          teacher: 'Ms. Nwosu',
          caScore: 26,
          examScore: 58,
          totalScore: 84,
          grade: 'A',
          remark: 'Excellent',
          classAverage: 65.0,
          highestScore: 93,
          lowestScore: 36,
          position: 4,
        },
      ],
      totalScore: 663,
      averageScore: 73.7,
      classPosition: '8th',
      totalStudents: 45,
      attendancePercent: 91.0,
      conduct: 'Good',
      nextTermResumption: '2024-09-09',
      principalComment: 'Chidi has shown improvement in his overall performance. He needs to devote more time to Physics and Chemistry.',
    },
  ],
  cumulativeGPA: 3.67,
  totalSubjectsTaken: 18,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      return res.status(200).json(mockTranscript);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return res.status(500).json({ error: 'Failed to fetch transcript' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
