import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { requireCSRF } from '../_lib/csrf.js'

/**
 * /api/student/discussions
 * GET  ?classrooms=1            — classrooms the student belongs to
 * GET  ?classroomId=            — threads in that classroom (must be student's)
 * GET  ?id=                     — single thread with replies
 * POST {classroomId,title,content}                — start a thread
 * POST {discussionId,content,parentReplyId?}      — reply (thread must be unlocked)
 *
 * Classroom scoping mirrors /api/student/assignments: a classroom is the
 * student's when its class_level matches, or its class_arm_id resolves to a
 * classes row matching the student's class+arm.
 */

const CLASS_MATCH = `
  (
    (vc.class_arm_id IS NULL OR vc.class_arm_id = '')
      AND (vc.class_level IS NULL OR vc.class_level = '')
    OR (vc.class_level IS NOT NULL AND vc.class_level != ''
      AND LOWER(vc.class_level) = LOWER($2))
    OR EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id::text = vc.class_arm_id AND c.tenant_id = $1
        AND LOWER(c.name) = LOWER($2)
        AND (c.arm IS NULL OR c.arm = '' OR LOWER(c.arm) = LOWER($3))
    )
  )
`

const AUTHOR_JOIN = `
  LEFT JOIN staff sf ON sf.id = d.created_by AND sf.tenant_id = d.tenant_id
  LEFT JOIN students stu ON stu.id = d.created_by AND stu.tenant_id = d.tenant_id
  LEFT JOIN parents pa ON pa.id = d.created_by AND pa.tenant_id = d.tenant_id
`
const AUTHOR_NAME = `COALESCE(sf.name, stu.name, pa.name, d.created_by) AS author_name`
const REPLY_AUTHOR_JOIN = `
  LEFT JOIN staff sf ON sf.id = r.created_by AND sf.tenant_id = r.tenant_id
  LEFT JOIN students stu ON stu.id = r.created_by AND stu.tenant_id = r.tenant_id
  LEFT JOIN parents pa ON pa.id = r.created_by AND pa.tenant_id = r.tenant_id
`

async function getStudent(tenantId: string, studentId: string) {
  const r = await sql`
    SELECT class, arm, name FROM students
    WHERE id = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1
  `
  return r.rows[0] as { class: string; arm: string; name: string } | undefined
}

async function classroomBelongsToStudent(tenantId: string, studentClass: string, arm: string, classroomId: string) {
  const r = await sql.query(
    `SELECT vc.id FROM virtual_classrooms vc
     WHERE vc.id = $4 AND vc.tenant_id = $1 AND vc.status != 'archived' AND ${CLASS_MATCH}`,
    [tenantId, studentClass, arm, classroomId]
  )
  return r.rows.length > 0
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student'])
  if (!decoded) return
  const studentId = decoded.studentId || decoded.userId
  const tenantId = decoded.tenantId || 'default-tenant'
  if (!studentId) return res.status(401).json({ error: 'Invalid token payload' })

  try {
    const student = await getStudent(tenantId, studentId)
    if (!student) return res.status(404).json({ error: 'Student not found' })
    const studentClass = student.class || ''
    const arm = student.arm || ''

    if (req.method === 'GET') {
      const { classrooms, classroomId, id } = req.query as Record<string, string | undefined>

      if (classrooms === '1') {
        const r = await sql.query(
          `SELECT vc.id, vc.name, COALESCE(s.name, '') AS subject_name,
                  COALESCE(st.name, '') AS teacher_name
           FROM virtual_classrooms vc
           LEFT JOIN subjects s ON s.id::text = vc.subject_id
           LEFT JOIN staff st ON st.id = vc.teacher_id
           WHERE vc.tenant_id = $1 AND vc.status != 'archived' AND ${CLASS_MATCH}
           ORDER BY vc.name`,
          [tenantId, studentClass, arm]
        )
        return res.status(200).json({ classrooms: r.rows })
      }

      if (id) {
        // Single thread — must belong to one of the student's classrooms
        const d = await sql.query(
          `SELECT d.*, ${AUTHOR_NAME}
           FROM discussions d
           JOIN virtual_classrooms vc ON vc.id = d.classroom_id
           ${AUTHOR_JOIN}
           WHERE d.id = $4 AND d.tenant_id = $1 AND ${CLASS_MATCH}`,
          [tenantId, studentClass, arm, id]
        )
        if (!d.rows[0]) return res.status(404).json({ error: 'Discussion not found' })
        const replies = await sql.query(
          `SELECT r.*, COALESCE(sf.name, stu.name, pa.name, r.created_by) AS author_name
           FROM discussion_replies r ${REPLY_AUTHOR_JOIN}
           WHERE r.discussion_id = $1 AND r.tenant_id = $2
           ORDER BY r.created_at ASC`,
          [id, tenantId]
        )
        return res.status(200).json({ data: { ...d.rows[0], replies: replies.rows } })
      }

      if (!classroomId) {
        return res.status(400).json({ error: 'classroomId, id, or classrooms=1 is required' })
      }
      if (!(await classroomBelongsToStudent(tenantId, studentClass, arm, classroomId))) {
        return res.status(403).json({ error: 'Not your classroom' })
      }
      const result = await sql.query(
        `SELECT d.*, ${AUTHOR_NAME},
                (SELECT COUNT(*)::int FROM discussion_replies r WHERE r.discussion_id = d.id) AS reply_count
         FROM discussions d ${AUTHOR_JOIN}
         WHERE d.classroom_id = $1 AND d.tenant_id = $2
         ORDER BY d.is_pinned DESC, d.created_at DESC`,
        [classroomId, tenantId]
      )
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST') {
      if (requireCSRF(req, res, studentId)) return
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { classroomId, discussionId, title, content, parentReplyId } = body

      if (discussionId) {
        // Reply to a thread the student can see
        const thread = await sql.query(
          `SELECT d.id, d.is_locked FROM discussions d
           JOIN virtual_classrooms vc ON vc.id = d.classroom_id
           WHERE d.id = $4 AND d.tenant_id = $1 AND ${CLASS_MATCH}`,
          [tenantId, studentClass, arm, discussionId]
        )
        if (!thread.rows[0]) return res.status(404).json({ error: 'Discussion not found' })
        if (thread.rows[0].is_locked) {
          return res.status(403).json({ error: 'This discussion is locked' })
        }
        if (!content || !String(content).trim()) {
          return res.status(400).json({ error: 'content is required' })
        }
        const r = await sql`
          INSERT INTO discussion_replies (discussion_id, parent_reply_id, tenant_id, content, created_by, author_role)
          VALUES (${discussionId}, ${parentReplyId || null}, ${tenantId}, ${String(content).trim()}, ${studentId}, 'student')
          RETURNING *
        `
        return res.status(201).json({ data: r.rows[0] })
      }

      // New thread
      if (!classroomId || !title || !String(title).trim()) {
        return res.status(400).json({ error: 'classroomId and title are required' })
      }
      if (!(await classroomBelongsToStudent(tenantId, studentClass, arm, classroomId))) {
        return res.status(403).json({ error: 'Not your classroom' })
      }
      const r = await sql`
        INSERT INTO discussions (classroom_id, tenant_id, title, content, created_by, author_role)
        VALUES (${classroomId}, ${tenantId}, ${String(title).trim()}, ${content || null}, ${studentId}, 'student')
        RETURNING *
      `
      return res.status(201).json({ data: r.rows[0] })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in student discussions:', error)
    return res.status(500).json({ error: 'Failed to process discussion request' })
  }
}
