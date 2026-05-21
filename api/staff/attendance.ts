import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  name: string;
  admissionNumber: string;
  currentStatus: 'present' | 'absent' | 'late' | null;
}

interface AttendanceHistory {
  date: string;
  classId: string;
  recordCount: number;
}

interface AttendanceListResponse {
  classId: string;
  date: string;
  students: StudentAttendanceRecord[];
  history: AttendanceHistory[];
}

interface AttendanceSubmissionBody {
  classId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late';
  }>;
}

interface AttendanceSubmissionResponse {
  count: number;
  message: string;
}

function extractStaffIdFromToken(req: VercelRequest): string | null {
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
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  return token || null;
}

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { classId, date } = req.query;

      // TODO: Verify staff member is assigned teacher for this class
      // If not, return 403
      // For now, return mock data

      const response: AttendanceListResponse = {
        classId: classId as string,
        date: date as string,
        students: [
          {
            id: '1',
            studentId: 'stu-1',
            name: 'Chioma Adeyemi',
            admissionNumber: 'ADM-2024-001',
            currentStatus: 'present',
          },
          {
            id: '2',
            studentId: 'stu-2',
            name: 'Tunde Okafor',
            admissionNumber: 'ADM-2024-002',
            currentStatus: null,
          },
          {
            id: '3',
            studentId: 'stu-3',
            name: 'Zainab Hassan',
            admissionNumber: 'ADM-2024-003',
            currentStatus: 'absent',
          },
        ],
        history: [
          {
            date: '2025-01-20',
            classId: classId as string,
            recordCount: 45,
          },
          {
            date: '2025-01-19',
            classId: classId as string,
            recordCount: 44,
          },
        ],
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { classId, date, records } = body as AttendanceSubmissionBody;

      // TODO: Verify staff member is assigned teacher for this class
      // If not, return 403
      // TODO: Validate date is not in the future
      // TODO: Save attendance records to database

      const response: AttendanceSubmissionResponse = {
        count: records.length,
        message: `Attendance marked for ${records.length} students`,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error marking attendance:', error);
      return res.status(500).json({ error: 'Failed to mark attendance' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
