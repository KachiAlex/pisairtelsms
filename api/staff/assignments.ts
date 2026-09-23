import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { requireCSRF } from '../_lib/csrf.js';
import { resolveClassroom } from './_lib/classroom.js';

function parseBody(req: ApiRequest): Promise<any> {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve(null); }
    });
    req.on('error', reject);
  });
}

async function ensureAssignmentColumns() {
  await sql`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homework'`.catch(() => {});
  await sql`ALTER TABLE virtual_classrooms ADD COLUMN IF NOT EXISTS class_level TEXT`.catch(() => {});
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin']);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId;
  const tenantId = decoded.tenantId || 'default-tenant';
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  await ensureAssignmentColumns();

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT a.id::text, a.title, a.instructions, a.points, a.type,
          a.due_date::text AS due_date, a.created_at::text AS created_at,
          a.is_published,
          vc.name AS classroom_name, vc.class_level,
          c.name AS class_name, c.arm AS class_arm,
          s.name AS subject_name,
          (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id AND sub.tenant_id = ${tenantId}) AS submission_count,
          (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id AND sub.tenant_id = ${tenantId} AND sub.status IN ('graded','returned')) AS graded_count
        FROM assignments a
        JOIN virtual_classrooms vc ON vc.id = a.classroom_id
        LEFT JOIN classes c ON c.id::text = vc.class_arm_id
        LEFT JOIN subjects s ON s.id::text = vc.subject_id
        WHERE a.tenant_id = ${tenantId}
          AND (a.created_by = ${staffId} OR vc.teacher_id = ${staffId} OR vc.co_teacher_id = ${staffId})
        ORDER BY a.created_at DESC
        LIMIT 100
      `;

      return res.status(200).json({
        assignments: result.rows.map(r => ({
          id: r.id,
          title: r.title,
          description: r.instructions || '',
          instructions: r.instructions || '',
          subject: r.subject_name || '',
          className: r.class_name ? `${r.class_name}${r.class_arm ? ` ${r.class_arm}` : ''}` : (r.class_level || ''),
          dueDate: r.due_date,
          maxScore: Number(r.points) || 100,
          type: r.type || 'homework',
          createdAt: r.created_at,
          isPublished: !!r.is_published,
          submissionCount: parseInt(r.submission_count || '0'),
          gradedCount: parseInt(r.graded_count || '0'),
        })),
      });
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }

  if (req.method === 'POST') {
    if (requireCSRF(req, res, staffId)) return;
    try {
      const body = await parseBody(req);
      const { title, description, subject, className, arm, dueDate, type, maxScore, instructions, attachments } = body || {};

      if (!title || !subject || !className || !dueDate) {
        return res.status(400).json({ error: 'Missing required fields: title, subject, className, dueDate' });
      }

      const resolved = await resolveClassroom(tenantId, staffId, subject, className, arm);
      if ('error' in resolved) {
        return res.status(resolved.status).json({ error: resolved.error });
      }

      const combinedInstructions = [description, instructions].filter(Boolean).join('\n\n') || null;
      const attachmentUrls = Array.isArray(attachments)
        ? attachments.map((a: any) => (typeof a === 'string' ? a : a?.url)).filter(Boolean)
        : null;

      const ins = await sql`
        INSERT INTO assignments (classroom_id, tenant_id, title, instructions, points, due_date, attachment_urls, created_by, is_published, type)
        VALUES (${resolved.classroomId}, ${tenantId}, ${title}, ${combinedInstructions}, ${maxScore || 100}, ${dueDate}, ${attachmentUrls}, ${staffId}, true, ${type || 'homework'})
        RETURNING id::text
      `;
      const assignmentId = ins.rows[0].id;

      // Notify parents of the students this assignment reaches.
      const studentsRes = arm
        ? await sql`
            SELECT id, name FROM students
            WHERE tenant_id = ${tenantId} AND LOWER(class) = LOWER(${className})
              AND LOWER(COALESCE(arm, '')) = LOWER(${arm})
              AND deleted_at IS NULL AND LOWER(status) = 'active'
          `
        : await sql`
            SELECT id, name FROM students
            WHERE tenant_id = ${tenantId} AND LOWER(class) = LOWER(${className})
              AND deleted_at IS NULL AND LOWER(status) = 'active'
          `;

      const now = new Date().toISOString();
      const assignmentType = type || 'homework';
      let notifiedCount = 0;
      for (const student of studentsRes.rows) {
        const parentsRes = await sql`
          SELECT parent_id FROM parent_students
          WHERE student_id = ${student.id} AND tenant_id = ${tenantId}
        `;
        for (const parent of parentsRes.rows) {
          const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${notifiedCount}`;
          await sql`
            INSERT INTO parent_notifications (
              id, parent_id, student_id, type, title, message, action_url, created_at
            ) VALUES (
              ${notifId}, ${parent.parent_id}, ${student.id}, 'academic',
              ${`New ${assignmentType}: ${title}`},
              ${`A new ${assignmentType} has been assigned in ${subject} for ${student.name}. Due: ${dueDate}.`},
              '/parent/assignments', ${now}
            )
          `;
          notifiedCount++;
        }
      }

      return res.status(201).json({
        success: true,
        id: assignmentId,
        message: `Assignment published to ${resolved.studentCount} students${notifiedCount ? ` and ${notifiedCount} parents notified` : ''}.`,
        studentCount: resolved.studentCount,
        notifiedParentsCount: notifiedCount,
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
