import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const result = await sql`
      SELECT DISTINCT tt.class_name,
        COUNT(s.id) AS student_count
      FROM timetable tt
      LEFT JOIN students s
        -- QUAL-05: normalize both sides (strip spaces, lowercase) and use
        -- CONCAT_WS so a NULL arm doesn't nullify the match.
        ON LOWER(REPLACE(CONCAT_WS(' ', s.class, COALESCE(s.arm, '')), ' ', ''))
           = LOWER(REPLACE(tt.class_name, ' ', ''))
        AND s.deleted_at IS NULL AND s.status = 'Active'
      WHERE tt.staff_id = ${staffId}
      GROUP BY tt.class_name
      ORDER BY tt.class_name
    `;

    const classes: ClassInfo[] = result.rows.map((r, i) => ({
      id: `class-${i + 1}`,
      name: r.class_name,
      arm: '',
      studentCount: parseInt(r.student_count ?? '0'),
    }));

    return res.status(200).json({ classes });
  } catch (error) {
    console.error('Error fetching staff classes:', error);
    return res.status(500).json({ error: 'Failed to fetch classes' });
  }
}
