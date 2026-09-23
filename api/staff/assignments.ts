import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { requireCSRF } from '../_lib/csrf.js';

function parseBody(req: ApiRequest): Promise<any> {
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

/**
 * Resolve the classroom that targets the requested class audience.
 * A specific arm binds class_arm_id; a whole level binds class_level.
 * Creates the shell if none exists so assignments have a canonical home.
 */
async function resolveClassroom(
  tenantId: string,
  staffId: string,
  subjectName: string,
  className: string,
  arm: string | undefined,
): Promise<{ classroomId: string; studentCount: number } | { error: string; status: number }> {
  const subjectRes = await sql`
    SELECT id::text FROM subjects
    WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${subjectName}) AND deleted_at IS NULL
    LIMIT 1
  `.catch(() => ({ rows: [] as any[] }));
  const subjectId = subjectRes.rows[0]?.id || null;

  let classArmId: string | null = null;
  let classLevel: string | null = null;

  if (arm) {
    const classRes = await sql`
      SELECT id::text FROM classes
      WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${className})
        AND LOWER(COALESCE(arm, '')) = LOWER(${arm}) AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!classRes.rows[0]) {
      return { error: `Class "${className} ${arm}" not found`, status: 404 };
    }
    classArmId = classRes.rows[0].id;
  } else {
    const levelRes = await sql`
      SELECT 1 FROM classes
      WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${className}) AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!levelRes.rows[0]) {
      return { error: `Class "${className}" not found`, status: 404 };
    }
    classLevel = className;
  }

  // Reuse the teacher's classroom for this audience+subject, else create it.
  const existing = await sql`
    SELECT id::text FROM virtual_classrooms
    WHERE tenant_id = ${tenantId} AND teacher_id = ${staffId}
      AND COALESCE(subject_id::text, '') = COALESCE(${subjectId}, '')
      AND COALESCE(class_arm_id::text, '') = COALESCE(${classArmId}, '')
      AND COALESCE(class_level, '') = COALESCE(${classLevel}, '')
      AND status != 'archived'
    LIMIT 1
  `;

  let classroomId: string;
  if (existing.rows[0]) {
    classroomId = existing.rows[0].id;
  } else {
    const name = `${subjectName} — ${className}${arm ? ` ${arm}` : ''}`;
    const ins = await sql`
      INSERT INTO virtual_classrooms (tenant_id, subject_id, class_arm_id, class_level, teacher_id, name, status)
      VALUES (${tenantId}, ${subjectId}, ${classArmId}, ${classLevel}, ${staffId}, ${name}, 'active')
      RETURNING id::text
    `;
    classroomId = ins.rows[0].id;
  }

  // Count students this assignment will reach.
  const countRes = arm
    ? await sql`
        SELECT COUNT(*) AS n FROM students
        WHERE tenant_id = ${tenantId} AND LOWER(class) = LOWER(${className})
          AND LOWER(COALESCE(arm, '')) = LOWER(${arm})
          AND deleted_at IS NULL AND LOWER(status) = 'active'
      `
    : await sql`
        SELECT COUNT(*) AS n FROM students
        WHERE tenant_id = ${tenantId} AND LOWER(class) = LOWER(${className})
          AND deleted_at IS NULL AND LOWER(status) = 'active'
      `;

  return { classroomId, studentCount: parseInt(countRes.rows[0]?.n || '0') };
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
