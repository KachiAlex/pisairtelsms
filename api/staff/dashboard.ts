import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireRole } from '../_lib/auth-middleware';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = requireRole(req, res, ['staff']);
  if (!decoded) return;

  const staffId = decoded.staffId || decoded.userId;
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  try {
    // Fetch staff record
    const staffResult = await sql`
      SELECT id, staff_id, name, department, role FROM staff
      WHERE id = ${staffId} LIMIT 1
    `;
    if (!staffResult.rows[0]) {
      return res.status(404).json({ error: 'Staff record not found' });
    }
    const st = staffResult.rows[0];

    // Today's timetable sessions
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayResult = await sql`
      SELECT id::text, subject, class_name, room,
             start_time, end_time,
             start_time || ' - ' || end_time AS time_slot
      FROM timetable
      WHERE staff_id = ${staffId} AND LOWER(day) = LOWER(${dayName})
      ORDER BY start_time ASC
    `;

    // Pending leave count
    const leaveResult = await sql`
      SELECT COUNT(*) AS cnt FROM staff_leave
      WHERE staff_id = ${staffId} AND status = 'pending'
    `;
    const pendingLeaveCount = parseInt(leaveResult.rows[0]?.cnt ?? '0');

    // Recent announcements (tenant-wide)
    const annResult = await sql`
      SELECT id::text, title, created_at::date::text AS date, LEFT(body, 120) AS preview
      FROM announcements ORDER BY created_at DESC LIMIT 5
    `;

    // Recent messages for this staff member
    const msgResult = await sql`
      SELECT id::text, sender_name AS sender, subject,
             created_at::date::text AS date, is_read
      FROM staff_messages
      WHERE staff_id = ${staffId}
      ORDER BY created_at DESC LIMIT 5
    `;

    return res.status(200).json({
      staff: { id: st.id, name: st.name, staffId: st.staff_id, department: st.department, role: st.role },
      todaySchedule: todayResult.rows.map(r => ({
        id: r.id, subject: r.subject, className: r.class_name,
        timeSlot: r.time_slot, room: r.room, startTime: r.start_time, endTime: r.end_time,
      })),
      pendingLeaveCount,
      recentAnnouncements: annResult.rows.map(r => ({ id: r.id, title: r.title, date: r.date, preview: r.preview })),
      recentMessages: msgResult.rows.map(r => ({ id: r.id, sender: r.sender, subject: r.subject, date: r.date, isRead: r.is_read })),
    });
  } catch (error) {
    console.error('Error fetching staff dashboard:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
