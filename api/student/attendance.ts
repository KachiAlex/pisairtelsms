import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { requireCSRF } from '../_lib/csrf.js';

interface AttendanceRecord {
  date: string;
  subject: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  reason?: string;
  excuseStatus?: 'pending' | 'approved' | 'rejected';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student']);
  if (!decoded) return;

  const studentId = decoded.studentId || decoded.userId;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }
  const tenantId = decoded.tenantId || 'default-tenant';

  // POST — submit an excuse request for an absent/late day
  if (req.method === 'POST') {
    if (requireCSRF(req, res, studentId)) return;
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { date, reason } = body;
      if (!date || !reason || !String(reason).trim()) {
        return res.status(400).json({ error: 'date and reason are required' });
      }

      // Only for a day actually marked absent or late
      const day = await sql`
        SELECT id FROM attendance_records
        WHERE student_id = ${studentId} AND tenant_id = ${tenantId}
          AND date = ${date}::date AND status IN ('absent', 'late')
        LIMIT 1
      `;
      if (!day.rows[0]) {
        return res.status(400).json({ error: 'No absence recorded for that date' });
      }

      const name = (await sql`SELECT name FROM students WHERE id = ${studentId} LIMIT 1`.catch(() => ({ rows: [] as any[] }))).rows[0]?.name || 'Student';

      const result = await sql`
        INSERT INTO attendance_excuse_requests
          (tenant_id, student_id, attendance_date, reason, submitted_by, submitted_by_role, submitted_by_name)
        VALUES (${tenantId}, ${studentId}, ${date}::date, ${String(reason).trim()}, ${studentId}, 'student', ${name})
        ON CONFLICT (tenant_id, student_id, attendance_date)
        DO UPDATE SET reason = EXCLUDED.reason, status = 'pending',
                      submitted_by = EXCLUDED.submitted_by,
                      submitted_by_role = EXCLUDED.submitted_by_role,
                      submitted_by_name = EXCLUDED.submitted_by_name,
                      reviewed_by = NULL, reviewed_by_name = NULL,
                      review_note = NULL, reviewed_at = NULL, updated_at = NOW()
        RETURNING id, status
      `;
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error submitting excuse:', error);
      return res.status(500).json({ error: 'Failed to submit excuse' });
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    const { startDate, endDate } = req.query;

    let result;
    if (startDate && endDate) {
      result = await sql`
        SELECT a.date::text, a.status, ar.reason_name AS reason,
               e.status AS excuse_status,
               COALESCE(tt.subject, 'General') AS subject
        FROM attendance_records a
        LEFT JOIN absence_reasons ar ON ar.id = a.absence_reason_id
        LEFT JOIN attendance_excuse_requests e
          ON e.student_id = a.student_id AND e.tenant_id = a.tenant_id AND e.attendance_date = a.date
        LEFT JOIN timetable tt ON tt.class_name = a.class AND tt.day = TO_CHAR(a.date, 'Day')
        WHERE a.student_id = ${studentId} AND a.tenant_id = ${tenantId}
          AND a.date BETWEEN ${startDate as string} AND ${endDate as string}
        ORDER BY a.date DESC
      `;
    } else {
      result = await sql`
        SELECT a.date::text, a.status, ar.reason_name AS reason,
               e.status AS excuse_status,
               COALESCE(tt.subject, 'General') AS subject
        FROM attendance_records a
        LEFT JOIN absence_reasons ar ON ar.id = a.absence_reason_id
        LEFT JOIN attendance_excuse_requests e
          ON e.student_id = a.student_id AND e.tenant_id = a.tenant_id AND e.attendance_date = a.date
        LEFT JOIN timetable tt ON tt.class_name = a.class AND tt.day = TO_CHAR(a.date, 'Day')
        WHERE a.student_id = ${studentId} AND a.tenant_id = ${tenantId}
        ORDER BY a.date DESC
        LIMIT 100
      `;
    }

    const records: AttendanceRecord[] = result.rows.map(r => ({
      date: r.date,
      subject: r.subject,
      status: r.status as AttendanceRecord['status'],
      ...(r.reason ? { reason: r.reason } : {}),
      ...(r.excuse_status ? { excuseStatus: r.excuse_status } : {}),
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
