import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  source: 'biometric' | 'manual' | 'web';
  notes: string | null;
}

interface AttendanceSummary {
  month: string;
  year: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  total: number;
}

interface MyAttendanceResponse {
  records: StaffAttendanceRecord[];
  summary: AttendanceSummary;
  today: {
    checkedIn: boolean;
    checkedOut: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
  };
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

function getCurrentMonthDates(): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day));
  }
  return dates;
}

function generateMockAttendance(staffId: string): StaffAttendanceRecord[] {
  const dates = getCurrentMonthDates();
  const records: StaffAttendanceRecord[] = [];
  const now = new Date();

  dates.forEach((date, index) => {
    // Skip future dates
    if (date > now) return;
    // Skip Sundays
    if (date.getDay() === 0) return;

    const isWeekend = date.getDay() === 6;
    const dayOfMonth = date.getDate();

    // Simulate some variation in attendance
    let status: 'present' | 'absent' | 'late' | 'half_day' = 'present';
    let checkIn: string | null = '08:00:00';
    let checkOut: string | null = '16:00:00';

    if (dayOfMonth === 5 || dayOfMonth === 12) {
      status = 'late';
      checkIn = '09:15:00';
    } else if (dayOfMonth === 8) {
      status = 'absent';
      checkIn = null;
      checkOut = null;
    } else if (dayOfMonth === 20) {
      status = 'half_day';
      checkOut = '12:00:00';
    }

    // Weekend - no attendance expected
    if (isWeekend) {
      return;
    }

    records.push({
      id: `att-${staffId}-${date.toISOString().split('T')[0]}`,
      staffId,
      date: date.toISOString().split('T')[0],
      checkIn,
      checkOut,
      status,
      source: Math.random() > 0.3 ? 'biometric' : 'web',
      notes: status === 'absent' ? 'Sick leave' : status === 'late' ? 'Traffic delay' : null,
    });
  });

  return records.reverse();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

      // TODO: Fetch actual attendance records from database
      const records = generateMockAttendance(staffId);

      // Calculate summary
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const halfDay = records.filter(r => r.status === 'half_day').length;

      // Check today's status
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = records.find(r => r.date === today);

      const response: MyAttendanceResponse = {
        records,
        summary: {
          month: new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' }),
          year: targetYear,
          present,
          absent,
          late,
          halfDay,
          total: records.length,
        },
        today: {
          checkedIn: !!todayRecord?.checkIn,
          checkedOut: !!todayRecord?.checkOut,
          checkInTime: todayRecord?.checkIn || null,
          checkOutTime: todayRecord?.checkOut || null,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching staff attendance:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  } else if (req.method === 'POST') {
    try {
      const { action } = req.body || {};
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];

      if (action === 'check-in') {
        // TODO: Save check-in to database
        return res.status(200).json({
          success: true,
          checkInTime: time,
          message: 'Checked in successfully',
        });
      }

      if (action === 'check-out') {
        // TODO: Save check-out to database
        return res.status(200).json({
          success: true,
          checkOutTime: time,
          message: 'Checked out successfully',
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use check-in or check-out' });
    } catch (error) {
      console.error('Error recording attendance:', error);
      return res.status(500).json({ error: 'Failed to record attendance' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
