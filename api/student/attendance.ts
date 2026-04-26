import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AttendanceRecord {
  date: string;
  subject: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  reason?: string;
}

interface StudentAttendanceResponse {
  records: AttendanceRecord[];
  attendancePercent: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
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

    const { startDate, endDate } = req.query;

    // TODO: Fetch actual attendance records from database filtered by studentId and date range
    // For now, return mock data
    const records: AttendanceRecord[] = [
      {
        date: '2025-01-20',
        subject: 'Mathematics',
        status: 'present',
      },
      {
        date: '2025-01-20',
        subject: 'English Language',
        status: 'present',
      },
      {
        date: '2025-01-21',
        subject: 'Physics',
        status: 'late',
        reason: 'Traffic',
      },
      {
        date: '2025-01-21',
        subject: 'Chemistry',
        status: 'present',
      },
      {
        date: '2025-01-22',
        subject: 'Biology',
        status: 'absent',
        reason: 'Sick',
      },
    ];

    const totalPresent = records.filter(r => r.status === 'present').length;
    const totalAbsent = records.filter(r => r.status === 'absent').length;
    const totalLate = records.filter(r => r.status === 'late').length;
    const totalExcused = records.filter(r => r.status === 'excused').length;
    const total = records.length;
    const attendancePercent = total > 0 ? Math.round(((totalPresent + totalExcused) / total) * 100) : 0;

    const response: StudentAttendanceResponse = {
      records,
      attendancePercent,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
}
