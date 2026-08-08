import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface CourseMaterial {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacher: string;
  type: 'document' | 'video' | 'audio' | 'link' | 'image';
  fileName: string;
  fileSize: string;
  fileType: string;
  url: string;
  uploadDate: string;
  academicSession: string;
  term: string;
  classLevel: string;
  tags: string[];
  isRequired: boolean;
  viewCount: number;
}

interface MaterialsListResponse {
  materials: CourseMaterial[];
  subjects: string[];
  types: string[];
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) return xUserId.trim();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.studentId || payload.userId || payload.sub || null;
    }
  } catch {}
  return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { subject, type, search, required } = req.query;
    const studentRes = await sql`SELECT tenant_id, class, arm FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1`;
    const tenantId = studentRes.rows[0]?.tenant_id || 'default-tenant';

    const result = await sql`
      SELECT cm.id::text, cm.title, COALESCE(cm.description, '') AS description,
        COALESCE(cm.type, 'document') AS type, COALESCE(cm.url, '') AS url,
        COALESCE(cm.file_name, '') AS file_name, COALESCE(cm.file_size::text, '') AS file_size,
        cm.created_at::text AS created_at,
        COALESCE(vc.name, '') AS classroom_name, COALESCE(s.name, '') AS subject_name,
        COALESCE(st.name, '') AS teacher_name
      FROM course_materials cm
      LEFT JOIN virtual_classrooms vc ON vc.id = cm.classroom_id
      LEFT JOIN subjects s ON s.id::text = vc.subject_id
      LEFT JOIN staff st ON st.id = vc.teacher_id
      WHERE cm.tenant_id = ${tenantId} AND cm.is_published = true
      ORDER BY cm.created_at DESC
    `;

    let materials: CourseMaterial[] = result.rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      subject: r.subject_name,
      teacher: r.teacher_name,
      type: r.type as CourseMaterial['type'],
      fileName: r.file_name,
      fileSize: r.file_size,
      fileType: '',
      url: r.url,
      uploadDate: r.created_at || '',
      academicSession: '',
      term: '',
      classLevel: r.classroom_name,
      tags: [],
      isRequired: false,
      viewCount: 0,
    }));

    if (subject) materials = materials.filter(m => m.subject.toLowerCase() === (subject as string).toLowerCase());
    if (type) materials = materials.filter(m => m.type === type);
    if (required === 'true') materials = materials.filter(m => m.isRequired);
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      materials = materials.filter(m =>
        m.title.toLowerCase().includes(searchTerm) ||
        m.description.toLowerCase().includes(searchTerm) ||
        m.subject.toLowerCase().includes(searchTerm) ||
        m.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    const subjects = [...new Set(materials.map(m => m.subject))].sort();
    const types = [...new Set(materials.map(m => m.type))].sort();

    return res.status(200).json({ materials, subjects, types } as MaterialsListResponse);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return res.status(500).json({ error: 'Failed to fetch course materials' });
  }
}
