import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface ClassInfo {
  id: string;
  name: string;
  arm: string;
  studentCount: number;
}

interface StaffClassesResponse {
  classes: ClassInfo[];
}

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const parts = authHeader.substring(7).split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch { /* not a JWT */ }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const staffId = extractStaffIdFromToken(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const result = await sql`
      SELECT DISTINCT tt.class_name,
        COUNT(s.id) AS student_count
      FROM timetable tt
      LEFT JOIN students s
        ON s.class || s.arm = tt.class_name
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
