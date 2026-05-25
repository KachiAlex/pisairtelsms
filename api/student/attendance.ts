import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = requireRole(req, res, ['student']);
  if (!decoded) return;

  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  try {

    const { startDate, endDate } = req.query;

    let result;
    if (startDate && endDate) {
      result = await sql`
        SELECT a.date::text, a.status, ar.reason_name AS reason,
               COALESCE(tt.subject, 'General') AS subject
        FROM attendance a
        LEFT JOIN absence_reasons ar ON ar.id = a.absence_reason_id
        LEFT JOIN timetable tt ON tt.class_name = a.class AND tt.day = TO_CHAR(a.date, 'Day')
        WHERE a.student_id = ${studentId}
          AND a.date BETWEEN ${startDate as string} AND ${endDate as string}
        ORDER BY a.date DESC
      `;
    } else {
      result = await sql`
        SELECT a.date::text, a.status, ar.reason_name AS reason,
               COALESCE(tt.subject, 'General') AS subject
        FROM attendance a
        LEFT JOIN absence_reasons ar ON ar.id = a.absence_reason_id
        LEFT JOIN timetable tt ON tt.class_name = a.class AND tt.day = TO_CHAR(a.date, 'Day')
        WHERE a.student_id = ${studentId}
        ORDER BY a.date DESC
        LIMIT 100
      `;
    }

    const records: AttendanceRecord[] = result.rows.map(r => ({
      date: r.date,
      subject: r.subject,
      status: r.status as AttendanceRecord['status'],
      ...(r.reason ? { reason: r.reason } : {}),
    }));

    const totalPresent = records.filter(r => r.status === 'present').length;
    const totalAbsent  = records.filter(r => r.status === 'absent').length;
    const totalLate    = records.filter(r => r.status === 'late').length;
    const totalExcused = records.filter(r => r.status === 'excused').length;
    const total = records.length;
    const attendancePercent = total > 0 ? Math.round(((totalPresent + totalExcused) / total) * 100) : 100;

    return res.status(200).json({ records, attendancePercent, totalPresent, totalAbsent, totalLate, totalExcused });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
}
