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
    const studentRes = await sql`SELECT class FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1`;
    const studentClass = studentRes.rows[0]?.class || '';

    let queryStr = `SELECT id::text, title, COALESCE(description, '') AS description, COALESCE(subject, '') AS subject,
      COALESCE(teacher, '') AS teacher, COALESCE(type, 'document') AS type,
      COALESCE(file_name, '') AS file_name, COALESCE(file_size, '') AS file_size,
      COALESCE(file_type, '') AS file_type, COALESCE(url, '') AS url,
      upload_date::text AS upload_date, COALESCE(academic_session, '') AS academic_session,
      COALESCE(term, '') AS term, COALESCE(class_level, '') AS class_level,
      COALESCE(tags, '[]'::jsonb) AS tags, is_required, view_count
      FROM course_materials
      WHERE class_level = ${studentClass} OR class_level IS NULL`;

    const result = await sql`SELECT id::text, title, COALESCE(description, '') AS description, COALESCE(subject, '') AS subject,
      COALESCE(teacher, '') AS teacher, COALESCE(type, 'document') AS type,
      COALESCE(file_name, '') AS file_name, COALESCE(file_size, '') AS file_size,
      COALESCE(file_type, '') AS file_type, COALESCE(url, '') AS url,
      upload_date::text AS upload_date, COALESCE(academic_session, '') AS academic_session,
      COALESCE(term, '') AS term, COALESCE(class_level, '') AS class_level,
      COALESCE(tags, '[]'::jsonb) AS tags, is_required, view_count
      FROM course_materials
      WHERE class_level = ${studentClass} OR class_level IS NULL
      ORDER BY upload_date DESC`;

    let materials: CourseMaterial[] = result.rows.map(r => ({
      id: r.id, title: r.title, description: r.description, subject: r.subject,
      teacher: r.teacher, type: r.type as CourseMaterial['type'], fileName: r.file_name,
      fileSize: r.file_size, fileType: r.file_type, url: r.url,
      uploadDate: r.upload_date || '', academicSession: r.academic_session,
      term: r.term, classLevel: r.class_level,
      tags: Array.isArray(r.tags) ? r.tags : [], isRequired: !!r.is_required,
      viewCount: Number(r.view_count) || 0,
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
    materials.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    const subjects = [...new Set(materials.map(m => m.subject))].sort();
    const types = [...new Set(materials.map(m => m.type))].sort();

    return res.status(200).json({ materials, subjects, types } as MaterialsListResponse);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return res.status(500).json({ error: 'Failed to fetch course materials' });
  }
}
