import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { requireAuth } from '../../_lib/auth-middleware.js';

interface StudentProfile {
  id: string;
  name: string;
  admissionNumber: string;
  gender: string;
  class: string;
  arm: string;
  email?: string;
  phone?: string;
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
    const { studentId } = req.query;

    const result = await sql`
      SELECT id, name, admission_no, gender, class, arm, guardian_email, phone
      FROM students
      WHERE id = ${studentId as string} AND tenant_id = ${tenantId} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const r = result.rows[0];
    const profile: StudentProfile = {
      id: r.id,
      name: r.name,
      admissionNumber: r.admission_no || '',
      gender: r.gender || '',
      class: r.class || '',
      arm: r.arm || '',
      email: r.guardian_email || undefined,
      phone: r.phone || undefined,
    };

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return res.status(500).json({ error: 'Failed to fetch student profile' });
  }
}
