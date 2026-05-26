import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware.js';

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
    // Fetch student record
    const studentResult = await sql`
      SELECT id, admission_no, name, class, arm, status
      FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1
    `;
    if (!studentResult.rows[0]) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const s = studentResult.rows[0];

    // Attendance % (last 90 days)
    const attResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'present') AS present,
        COUNT(*) AS total
      FROM attendance
      WHERE student_id = ${studentId}
        AND date >= NOW() - INTERVAL '90 days'
    `;
    const present = parseInt(attResult.rows[0]?.present ?? '0');
    const total   = parseInt(attResult.rows[0]?.total ?? '0');
    const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 100;

    // Outstanding fee balance
    const feeResult = await sql`
      SELECT COALESCE(SUM(fa.amount - COALESCE(paid.paid,0)), 0) AS balance
      FROM fee_assignments fa
      LEFT JOIN (
        SELECT fee_assignment_id, SUM(amount) AS paid
        FROM payments WHERE status = 'confirmed'
        GROUP BY fee_assignment_id
      ) paid ON paid.fee_assignment_id = fa.id
      WHERE fa.student_id = ${studentId}
    `;
    const feeBalance = parseFloat(feeResult.rows[0]?.balance ?? '0');

    // Next exam
    const examResult = await sql`
      SELECT title AS subject, exam_date AS date, start_time AS time
      FROM exams
      WHERE (student_class = ${s.class} OR student_class IS NULL)
        AND exam_date >= CURRENT_DATE
      ORDER BY exam_date ASC, start_time ASC
      LIMIT 1
    `;
    const nextExam = examResult.rows[0]
      ? { subject: examResult.rows[0].subject, date: examResult.rows[0].date, time: examResult.rows[0].time ?? '' }
      : null;

    // Recent announcements (tenant-wide)
    const annResult = await sql`
      SELECT id::text, title, created_at::date::text AS date,
             LEFT(body, 120) AS preview
      FROM announcements
      ORDER BY created_at DESC LIMIT 5
    `;

    // Recent messages to this student
    const msgResult = await sql`
      SELECT id::text, sender_name AS sender, subject,
             created_at::date::text AS date, is_read
      FROM student_messages
      WHERE student_id = ${studentId}
      ORDER BY created_at DESC LIMIT 5
    `;

    return res.status(200).json({
      student: {
        id: s.id,
        name: s.name,
        admissionNumber: s.admission_no,
        class: s.class,
        arm: s.arm,
      },
      metrics: { gpa: 0, attendancePercent, nextExam, feeBalance },
      recentAnnouncements: annResult.rows.map(r => ({ id: r.id, title: r.title, date: r.date, preview: r.preview })),
      recentMessages: msgResult.rows.map(r => ({ id: r.id, sender: r.sender, subject: r.subject, date: r.date, isRead: r.is_read })),
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
