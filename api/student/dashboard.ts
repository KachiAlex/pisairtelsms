import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StudentMetrics {
  gpa: number;
  attendancePercent: number;
  nextExam: {
    subject: string;
    date: string;
    time: string;
  } | null;
  feeBalance: number;
}

interface RecentAnnouncement {
  id: string;
  title: string;
  date: string;
  preview: string;
}

interface RecentMessage {
  id: string;
  sender: string;
  subject: string;
  date: string;
  isRead: boolean;
}

interface StudentDashboardResponse {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    class: string;
    arm: string;
  };
  metrics: StudentMetrics;
  recentAnnouncements: RecentAnnouncement[];
  recentMessages: RecentMessage[];
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  // In a real implementation, decode JWT and extract userId
  // For now, return a placeholder
  try {
    // This is a simplified version - in production, use a JWT library
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

    // TODO: Fetch actual student data from database
    // For now, return mock data
    const response: StudentDashboardResponse = {
      student: {
        id: studentId,
        name: 'John Adewale',
        admissionNumber: 'ADM-2024-001',
        class: 'SS3',
        arm: 'A',
      },
      metrics: {
        gpa: 3.8,
        attendancePercent: 92,
        nextExam: {
          subject: 'Mathematics',
          date: '2025-02-15',
          time: '09:00 AM',
        },
        feeBalance: 0,
      },
      recentAnnouncements: [
        {
          id: '1',
          title: 'School Resumption Date',
          date: '2025-01-20',
          preview: 'School resumes on Monday, January 27, 2025...',
        },
      ],
      recentMessages: [
        {
          id: '1',
          sender: 'Principal',
          subject: 'Welcome to the Portal',
          date: '2025-01-15',
          isRead: true,
        },
      ],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
