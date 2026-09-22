import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface ClassInfo {
  id: string;
  name: string;
  arm: string;
  studentCount: number;
}

interface StaffClassesResponse {
  classes: ClassInfo[];
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = await requireRole(req, res, ['staff']);
    if (!decoded) return;
    const staffId = decoded.staffId || decoded.userId;
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }
    const tenantId = decoded.tenantId || 'default-tenant';

    // Distinct classes this teacher appears in, from the real schedule tables
    // (the legacy flat `timetable` table is empty and has no tenant_id).
    const result = await sql`
      SELECT DISTINCT s.class_id,
        COALESCE(c.name, s.class_id) AS class_name,
        COALESCE(c.arm, '') AS arm,
        (SELECT COUNT(*) FROM students st
          WHERE st.tenant_id = ${tenantId} AND st.deleted_at IS NULL AND st.status = 'Active'
            AND LOWER(REPLACE(CONCAT_WS(' ', st.class, COALESCE(st.arm, '')), ' ', ''))
              = LOWER(REPLACE(CONCAT_WS(' ', c.name, COALESCE(c.arm, '')), ' ', ''))
        ) AS student_count
      FROM timetable_class_schedule_entries e
      JOIN timetable_class_schedules s ON s.id = e.schedule_id
      LEFT JOIN classes c ON c.id::text = s.class_id::text
      WHERE e.teacher_id = ${staffId} AND s.tenant_id = ${tenantId}
      ORDER BY class_name
    `;

    const classes: ClassInfo[] = result.rows.map(r => ({
      id: String(r.class_id),
      name: r.class_name,
      arm: r.arm || '',
      studentCount: parseInt(r.student_count ?? '0'),
    }));

    return res.status(200).json({ classes });
  } catch (error) {
    console.error('Error fetching staff classes:', error);
    return res.status(500).json({ error: 'Failed to fetch classes' });
  }
}
