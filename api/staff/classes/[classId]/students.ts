import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface StudentInfo {
  id: string;
  name: string;
  admissionNumber: string;
  gender: string;
}

interface ClassStudentsResponse {
  students: StudentInfo[];
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

    const { classId } = req.query;

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
    await sql``CREATE INDEX IF NOT EXISTS idx_students_class ON students(class) WHERE deleted_at IS NULL``;

    const result = await sql``
      SELECT id, name, admission_no, gender
      FROM students
      WHERE tenant_id = ${tenantId}
        AND class = ${classId as string}
        AND deleted_at IS NULL
      ORDER BY name ASC
    ``;

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
