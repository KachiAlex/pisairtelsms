import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StaffInfo {
  id: string;
  name: string;
  staffId: string;
  department: string;
  role: string;
}

interface ClassSession {
  id: string;
  subject: string;
  className: string;
  timeSlot: string;
  room: string;
  startTime: string;
  endTime: string;
}

interface Announcement {
  id: string;
  title: string;
  date: string;
  preview: string;
}

interface Message {
  id: string;
  sender: string;
  subject: string;
  date: string;
  isRead: boolean;
}

interface StaffDashboardResponse {
  staff: StaffInfo;
  todaySchedule: ClassSession[];
  pendingLeaveCount: number;
  recentAnnouncements: Announcement[];
  recentMessages: Message[];
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const staffId = extractStaffIdFromToken(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    // TODO: Fetch actual staff data from database filtered by staffId
    // For now, return mock data
    const response: StaffDashboardResponse = {
      staff: {
        id: staffId,
        name: 'Mr. Femi Okafor',
        staffId: 'STAFF-001',
        department: 'Mathematics',
        role: 'Teacher',
      },
      todaySchedule: [
        {
          id: '1',
          subject: 'Mathematics',
          className: 'SS 1A',
          timeSlot: '09:00 - 10:00',
          room: 'Room 101',
          startTime: '09:00',
          endTime: '10:00',
        },
        {
          id: '2',
          subject: 'Mathematics',
          className: 'SS 2B',
          timeSlot: '10:30 - 11:30',
          room: 'Room 102',
          startTime: '10:30',
          endTime: '11:30',
        },
      ],
      pendingLeaveCount: 1,
      recentAnnouncements: [
        {
          id: '1',
          title: 'Staff Meeting',
          date: '2025-01-20',
          preview: 'Staff meeting scheduled for Friday at 3 PM...',
        },
      ],
      recentMessages: [
        {
          id: '1',
          sender: 'Principal',
          subject: 'Welcome to Staff Portal',
          date: '2025-01-15',
          isRead: true,
        },
      ],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching staff dashboard:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
