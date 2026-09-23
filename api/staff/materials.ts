import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { requireCSRF } from '../_lib/csrf.js';
import { resolveClassroom } from './_lib/classroom.js';

function parseBody(req: ApiRequest): Promise<any> {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve(null); }
    });
  });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId;
  const tenantId = decoded.tenantId || 'default-tenant';
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  await sql`ALTER TABLE virtual_classrooms ADD COLUMN IF NOT EXISTS class_level TEXT`.catch(() => {});

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT cm.id::text, cm.title, COALESCE(cm.description, '') AS description,
          COALESCE(cm.type, 'document') AS type, COALESCE(cm.url, '') AS url,
          COALESCE(cm.file_name, '') AS file_name, COALESCE(cm.file_size::text, '') AS file_size,
          cm.is_published, cm.created_at::text AS created_at,
          vc.name AS classroom_name, vc.class_level,
          c.name AS class_name, c.arm AS class_arm,
          s.name AS subject_name
        FROM course_materials cm
        JOIN virtual_classrooms vc ON vc.id = cm.classroom_id
        LEFT JOIN classes c ON c.id::text = vc.class_arm_id
        LEFT JOIN subjects s ON s.id::text = vc.subject_id
        WHERE cm.tenant_id = ${tenantId}
          AND (cm.uploaded_by = ${staffId} OR vc.teacher_id = ${staffId} OR vc.co_teacher_id = ${staffId})
        ORDER BY cm.created_at DESC
        LIMIT 200
      `;

      return res.status(200).json({
        materials: result.rows.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          type: r.type,
          url: r.url,
          fileName: r.file_name,
          fileSize: r.file_size,
          isPublished: !!r.is_published,
          subject: r.subject_name || '',
          className: r.class_name ? `${r.class_name}${r.class_arm ? ` ${r.class_arm}` : ''}` : (r.class_level || ''),
          createdAt: r.created_at,
        })),
      });
    } catch (error) {
      console.error('Error fetching staff materials:', error);
      return res.status(500).json({ error: 'Failed to fetch materials' });
    }
  }

  if (req.method === 'POST') {
    if (requireCSRF(req, res, staffId)) return;
    try {
      const body = await parseBody(req);
      const { title, description, subject, className, arm, type, url, fileName, fileSize } = body || {};

      if (!title || !subject || !className || !url) {
        return res.status(400).json({ error: 'Missing required fields: title, subject, className, url' });
      }

      const resolved = await resolveClassroom(tenantId, staffId, subject, className, arm);
      if ('error' in resolved) {
        return res.status(resolved.status).json({ error: resolved.error });
      }

      const ins = await sql`
        INSERT INTO course_materials (classroom_id, tenant_id, title, description, type, url, file_name, file_size, uploaded_by, is_published, subject, class_level)
        VALUES (${resolved.classroomId}, ${tenantId}, ${title}, ${description || null},
          ${type || 'document'}, ${url}, ${fileName || null}, ${fileSize || null},
          ${staffId}, true, ${subject}, ${className})
        RETURNING id::text
      `;

      return res.status(201).json({
        success: true,
        id: ins.rows[0].id,
        message: `Material published to ${resolved.studentCount} students.`,
        studentCount: resolved.studentCount,
      });
    } catch (error) {
      console.error('Error creating material:', error);
      return res.status(500).json({ error: 'Failed to upload material' });
    }
  }

  if (req.method === 'PUT') {
    if (requireCSRF(req, res, staffId)) return;
    try {
      const body = await parseBody(req);
      const { id, title, description, type, url, isPublished } = body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });

      const result = await sql`
        UPDATE course_materials SET
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          type = COALESCE(${type || null}, type),
          url = COALESCE(${url || null}, url),
          is_published = COALESCE(${isPublished === undefined ? null : isPublished}, is_published),
          updated_at = NOW()
        WHERE id::text = ${id} AND tenant_id = ${tenantId} AND uploaded_by = ${staffId}
        RETURNING id::text
      `;
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Material not found' });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating material:', error);
      return res.status(500).json({ error: 'Failed to update material' });
    }
  }

  if (req.method === 'DELETE') {
    if (requireCSRF(req, res, staffId)) return;
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id query param is required' });

      const result = await sql`
        DELETE FROM course_materials
        WHERE id::text = ${id as string} AND tenant_id = ${tenantId} AND uploaded_by = ${staffId}
        RETURNING id
      `;
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Material not found' });
      }
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting material:', error);
      return res.status(500).json({ error: 'Failed to delete material' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
