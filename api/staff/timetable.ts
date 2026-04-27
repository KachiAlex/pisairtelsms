import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ScheduleEntry {
  id: string;
  dayOfWeek: number;
  timeSlot: string;
  subject: string;
  className: string;
  room: string;
  startTime: string;
  endTime: string;
}

interface ExamEntry {
  id: string;
  subject: string;
  date: string;
  time: string;
  room: string;
  duration: number;
}

interface Term {
  id: string;
  name: string;
}

interface StaffTimetableResponse {
  schedule: ScheduleEntry[];
  examSchedule: ExamEntry[];
  currentTerm: string;
  availableTerms: Term[];
}

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.staffId || payload.userId || payload.sub || null;
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
    const staffId = extractStaffIdFromToken(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const { termId } = req.query;

    // TODO: Fetch actual timetable data from database filtered by staffId and termId
    // For now, return mock data
    const response: StaffTimetableResponse = {
      schedule: [
        {
          id: '1',
          dayOfWeek: 1,
          timeSlot: '09:00 - 10:00',
          subject: 'Mathematics',
          className: 'SS 1A',
          room: 'Room 101',
          startTime: '09:00',
          endTime: '10:00',
        },
        {
          id: '2',
          dayOfWeek: 1,
          timeSlot: '10:30 - 11:30',
          subject: 'Mathematics',
          className: 'SS 2B',
          room: 'Room 102',
          startTime: '10:30',
          endTime: '11:30',
        },
        {
          id: '3',
          dayOfWeek: 2,
          timeSlot: '09:00 - 10:00',
          subject: 'Mathematics',
          className: 'JSS 3C',
          room: 'Room 103',
          startTime: '09:00',
          endTime: '10:00',
        },
      ],
      examSchedule: [
        {
          id: '1',
          subject: 'Mathematics',
          date: '2025-02-15',
          time: '09:00',
          room: 'Exam Hall A',
          duration: 120,
        },
      ],
      currentTerm: 'term-1',
      availableTerms: [
        { id: 'term-1', name: 'Term 1' },
        { id: 'term-2', name: 'Term 2' },
        { id: 'term-3', name: 'Term 3' },
      ],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching staff timetable:', error);
    return res.status(500).json({ error: 'Failed to fetch timetable data' });
  }
}
