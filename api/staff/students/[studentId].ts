import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

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

function extractPayload(req: VercelRequest): { staffId: string | null; tenantId: string } {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return { staffId: xUserId.trim(), tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { staffId: null, tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };
  }

  const token = authHeader.substring(7);
  if (!token) return { staffId: null, tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return { staffId: payload.staffId || payload.userId || payload.sub || null, tenantId: payload.tenantId || (req.headers['x-tenant-id'] as string) || 'default-tenant' };
    }
  } catch {
    // not a JWT
  }

  return { staffId: token || null, tenantId: (req.headers['x-tenant-id'] as string) || 'default-tenant' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { staffId, tenantId } = extractPayload(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const { studentId } = req.query;

    await sql``
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        admission_no TEXT,
        name TEXT NOT NULL,
        class TEXT,
        arm TEXT,
        gender TEXT,
        status TEXT,
        guardian TEXT,
        phone TEXT,
        guardian_email TEXT,
        deleted_at TIMESTAMP WITH TIME ZONE
      )
    ``;

    const result = await sql``
      SELECT id, name, admission_no, gender, class, arm, guardian_email, phone
      FROM students
      WHERE id = ${studentId as string} AND tenant_id = ${tenantId} AND deleted_at IS NULL
      LIMIT 1
    ``;

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
