import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;

  const staffId = decoded.staffId || decoded.userId;
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  const tenantId = decoded.tenantId || 'default-tenant';

  try {
    // Ensure dependent tables exist
    // Fetch staff record
    const staffResult = await sql`
      SELECT id, staff_id, name, department, role FROM staff
      WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1
    `;
    if (!staffResult.rows[0]) {
      return res.status(404).json({ error: 'Staff record not found' });
    }
    const st = staffResult.rows[0];

    // Today's sessions — real source is timetable_class_schedule_entries
    // (the legacy flat `timetable` table is empty and has no tenant_id).
    const dayNum = new Date().getDay(); // 1=Mon … 5=Fri
    const todayResult = await sql`
      SELECT e.id::text, e.subject_name AS subject, e.room_id AS room,
             t.start_time::text AS start_time, t.end_time::text AS end_time,
             COALESCE(c.name || COALESCE(' ' || NULLIF(c.arm, ''), ''), s.class_id) AS class_name
      FROM timetable_class_schedule_entries e
      JOIN timetable_class_schedules s ON s.id = e.schedule_id
      JOIN timetable_time_slots t ON t.id = e.time_slot_id
      LEFT JOIN classes c ON c.id::text = s.class_id::text
      WHERE e.teacher_id = ${staffId}
        AND s.tenant_id = ${tenantId}
        AND e.day_of_week = ${dayNum}
      ORDER BY t.sequence ASC
    `;

    // Pending leave count
    const leaveResult = await sql`
      SELECT COUNT(*) AS cnt FROM staff_leave
      WHERE staff_id = ${staffId} AND tenant_id = ${tenantId} AND status = 'pending'
    `;
    const pendingLeaveCount = parseInt(leaveResult.rows[0]?.cnt ?? '0');

    // Recent announcements (tenant-wide, sent, staff-audience only)
    const annResult = await sql`
      SELECT id::text, title, created_at::date::text AS date, LEFT(body, 120) AS preview
      FROM announcements WHERE tenant_id = ${tenantId}
        AND COALESCE(status, 'sent') = 'sent'
        AND COALESCE(audience, 'all') IN ('all', 'staff')
      ORDER BY created_at DESC LIMIT 5
    `;

    // Recent messages for this staff member
    const msgResult = await sql`
      SELECT id::text, sender_name AS sender, subject,
             created_at::date::text AS date, is_read
      FROM staff_messages
      WHERE staff_id = ${staffId} AND tenant_id = ${tenantId}
      ORDER BY created_at DESC LIMIT 5
    `;

    return res.status(200).json({
      staff: { id: st.id, name: st.name, staffId: st.staff_id, department: st.department, role: st.role },
      todaySchedule: todayResult.rows.map(r => ({
        id: r.id, subject: r.subject, className: r.class_name,
        timeSlot: `${String(r.start_time).slice(0, 5)} - ${String(r.end_time).slice(0, 5)}`,
        room: r.room, startTime: String(r.start_time).slice(0, 5), endTime: String(r.end_time).slice(0, 5),
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
