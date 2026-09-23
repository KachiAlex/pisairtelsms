import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface ClassInfo {
  id: string;
  name: string;
  arm: string;
  studentCount: number;
  subjects: string[];
  formTeacherId?: string | null;
  formTeacherName?: string | null;
  isFormTeacher?: boolean;
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
    const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
    if (!decoded) return;
    const staffId = decoded.staffId || decoded.userId;
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }
    const tenantId = decoded.tenantId || 'default-tenant';

    // Allocations are matched by teacher name — fetch it once.
    const staffResult = await sql`
      SELECT name FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1
    `;
    const staffName = staffResult.rows[0]?.name || '';

    // Distinct classes this teacher appears in, from the real schedule tables
    // (the legacy flat `timetable` table is empty and has no tenant_id).
    const result = await sql`
      SELECT DISTINCT s.class_id,
        COALESCE(c.name, s.class_id) AS class_name,
        COALESCE(c.arm, '') AS arm,
        c.form_teacher_id AS form_teacher_id,
        fs.name AS form_teacher_name,
        (SELECT COUNT(*) FROM students st
          WHERE st.tenant_id = ${tenantId} AND st.deleted_at IS NULL AND st.status = 'Active'
            AND LOWER(REPLACE(CONCAT_WS(' ', st.class, COALESCE(st.arm, '')), ' ', ''))
              = LOWER(REPLACE(CONCAT_WS(' ', c.name, COALESCE(c.arm, '')), ' ', ''))
        ) AS student_count
      FROM timetable_class_schedule_entries e
      JOIN timetable_class_schedules s ON s.id = e.schedule_id
      LEFT JOIN classes c ON c.id::text = s.class_id::text
      LEFT JOIN staff fs ON fs.id = c.form_teacher_id AND fs.tenant_id = ${tenantId}
      WHERE e.teacher_id = ${staffId} AND s.tenant_id = ${tenantId}
      ORDER BY class_name
    `;

    // Allocations from the teacher-allocation matrix also make a class "his",
    // even before it's placed on a timetable — otherwise an assigned teacher
    // sees an empty portal until someone runs Auto-Schedule.
    const allocResult = staffName
      ? await sql`
        SELECT c.id::text AS class_id, c.name AS class_name, COALESCE(c.arm, '') AS arm,
          c.form_teacher_id AS form_teacher_id,
          fs.name AS form_teacher_name,
          (SELECT COUNT(*) FROM students st
            WHERE st.tenant_id = ${tenantId} AND st.deleted_at IS NULL AND st.status = 'Active'
              AND LOWER(REPLACE(CONCAT_WS(' ', st.class, COALESCE(st.arm, '')), ' ', ''))
                = LOWER(REPLACE(CONCAT_WS(' ', c.name, COALESCE(c.arm, '')), ' ', ''))
          ) AS student_count,
          array_agg(DISTINCT tas.subject ORDER BY tas.subject) AS subjects
        FROM teacher_allocation_slots tas
        JOIN classes c ON c.tenant_id = ${tenantId}
          AND LOWER(REPLACE(c.name, ' ', '')) = LOWER(REPLACE(tas.class, ' ', ''))
        LEFT JOIN staff fs ON fs.id = c.form_teacher_id AND fs.tenant_id = ${tenantId}
        WHERE tas.tenant_id = ${tenantId}
          AND LOWER(tas.teacher) = LOWER(${staffName})
          AND tas.coverage = 'Assigned'
        GROUP BY c.id, c.name, c.arm, c.form_teacher_id, fs.name
      `
      : { rows: [] as any[] };

    const classes: ClassInfo[] = result.rows.map(r => ({
      id: String(r.class_id),
      name: r.class_name,
      arm: r.arm || '',
      studentCount: parseInt(r.student_count ?? '0'),
      subjects: [],
      formTeacherId: r.form_teacher_id || null,
      formTeacherName: r.form_teacher_name || null,
      isFormTeacher: !!r.form_teacher_id && r.form_teacher_id === staffId,
    }));

    for (const row of allocResult.rows) {
      const existing = classes.find(c => c.id === String(row.class_id));
      if (existing) {
        existing.subjects = row.subjects || [];
        if (row.form_teacher_id) {
          existing.formTeacherId = row.form_teacher_id;
          existing.formTeacherName = row.form_teacher_name || null;
          existing.isFormTeacher = row.form_teacher_id === staffId;
        }
      } else {
        classes.push({
          id: String(row.class_id),
          name: row.class_name,
          arm: row.arm || '',
          studentCount: parseInt(row.student_count ?? '0'),
          subjects: row.subjects || [],
          formTeacherId: row.form_teacher_id || null,
          formTeacherName: row.form_teacher_name || null,
          isFormTeacher: !!row.form_teacher_id && row.form_teacher_id === staffId,
        });
      }
    }
    classes.sort((a, b) => a.name.localeCompare(b.name) || a.arm.localeCompare(b.arm));

    return res.status(200).json({ classes });
  } catch (error) {
    console.error('Error fetching staff classes:', error);
    return res.status(500).json({ error: 'Failed to fetch classes' });
  }
}
