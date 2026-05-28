import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { ensureStaffTables } from '../tenant/_lib/staff.js';

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

async function getStaffName(staffId: string): Promise<string> {
  try {
    const res = await sql`SELECT name FROM staff WHERE id = ${staffId} OR staff_id = ${staffId} LIMIT 1`;
    if (res.rows[0]?.name) return res.rows[0].name;
  } catch {
    // ignore
  }
  try {
    const res = await sql`SELECT name FROM users WHERE id = ${staffId} LIMIT 1`;
    if (res.rows[0]?.name) return res.rows[0].name;
  } catch {
    // ignore
  }
  return 'Unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  await ensureStaffTables();

  if (req.method === 'GET') {
    try {
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

      const result = await sql`
        SELECT id::text, staff_id, date::text, check_in, check_out, status, notes
        FROM staff_attendance
        WHERE staff_id = ${staffId}
          AND EXTRACT(MONTH FROM date) = ${targetMonth}
          AND EXTRACT(YEAR FROM date) = ${targetYear}
        ORDER BY date DESC
      `;

      const records: StaffAttendanceRecord[] = result.rows.map(r => ({
        id: r.id,
        staffId: r.staff_id,
        date: r.date,
        checkIn: r.check_in ?? null,
        checkOut: r.check_out ?? null,
        status: r.status as StaffAttendanceRecord['status'],
        source: 'web' as const,
        notes: r.notes ?? null,
      }));

      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const halfDay = records.filter(r => r.status === 'half_day').length;

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
      const today = now.toISOString().split('T')[0];

      if (action === 'check-in') {
        const staffName = await getStaffName(staffId);
        const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await sql`
          INSERT INTO staff_attendance (id, staff_id, staff_name, date, check_in, status)
          VALUES (${id}, ${staffId}, ${staffName}, ${today}, ${time}, 'present')
          ON CONFLICT (staff_id, date) DO UPDATE SET
            check_in = EXCLUDED.check_in,
            status = COALESCE(staff_attendance.status, 'present')
        `;
        return res.status(200).json({
          success: true,
          checkInTime: time,
          message: 'Checked in successfully',
        });
      }

      if (action === 'check-out') {
        await sql`
          UPDATE staff_attendance
          SET check_out = ${time}
          WHERE staff_id = ${staffId} AND date = ${today}
        `;
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
