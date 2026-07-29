import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth } from '../../../_lib/auth-middleware.js';

interface StudentInfo {
  id: string;
  name: string;
  admissionNumber: string;
  gender: string;
}

interface ClassStudentsResponse {
  students: StudentInfo[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireAuth(req, res);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId || null;
  const tenantId = decoded.tenantId || 'default-tenant';
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  try {
    const { classId } = req.query;

    const result = await sql`
      SELECT id, name, admission_no, gender
      FROM students
      WHERE tenant_id = ${tenantId}
        AND class = ${classId as string}
        AND deleted_at IS NULL
      ORDER BY name ASC
    `;

    const students = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      admissionNumber: r.admission_no || '',
      gender: r.gender || '',
    }));

    return res.status(200).json({ students });
  } catch (error) {
    console.error('Error fetching class students:', error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }
}
