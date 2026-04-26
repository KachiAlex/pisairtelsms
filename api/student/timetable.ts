import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
}

interface ExamSchedule {
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  room: string;
}

interface StudentTimetableResponse {
  schedule: TimeSlot[];
  examSchedule: ExamSchedule[];
  termId: string;
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

    const { termId = 'term-1' } = req.query;

    // TODO: Fetch actual timetable from database filtered by studentId and class
    // For now, return mock data
    const schedule: TimeSlot[] = [
      {
        day: 'Monday',
        startTime: '08:00',
        endTime: '09:00',
        subject: 'Mathematics',
        teacher: 'Mr. Okafor',
        room: 'A1',
      },
      {
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        subject: 'English Language',
        teacher: 'Mrs. Adeyemi',
        room: 'A1',
      },
      {
        day: 'Monday',
        startTime: '10:30',
        endTime: '11:30',
        subject: 'Physics',
        teacher: 'Mr. Eze',
        room: 'Lab 1',
      },
      {
        day: 'Tuesday',
        startTime: '08:00',
        endTime: '09:00',
        subject: 'Chemistry',
        teacher: 'Dr. Nwosu',
        room: 'Lab 2',
      },
      {
        day: 'Tuesday',
        startTime: '09:00',
        endTime: '10:00',
        subject: 'Biology',
        teacher: 'Miss Obi',
        room: 'Lab 3',
      },
    ];

    const examSchedule: ExamSchedule[] = [
      {
        subject: 'Mathematics',
        date: '2025-02-15',
        startTime: '09:00',
        endTime: '11:00',
        duration: 120,
        room: 'Exam Hall A',
      },
      {
        subject: 'English Language',
        date: '2025-02-17',
        startTime: '09:00',
        endTime: '11:00',
        duration: 120,
        room: 'Exam Hall B',
      },
      {
        subject: 'Physics',
        date: '2025-02-19',
        startTime: '14:00',
        endTime: '16:00',
        duration: 120,
        room: 'Exam Hall A',
      },
    ];

    const response: StudentTimetableResponse = {
      schedule,
      examSchedule,
      termId: termId as string,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return res.status(500).json({ error: 'Failed to fetch timetable' });
  }
}
