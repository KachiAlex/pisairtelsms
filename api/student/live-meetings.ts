import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'
  const studentId = decoded.studentId || decoded.userId

  await sql`ALTER TABLE virtual_classrooms ADD COLUMN IF NOT EXISTS class_level TEXT`.catch(() => {})

  try {
    // Resolve the student's class/arm once — used for enrollment scoping
    let student: { class: string | null; arm: string | null } | null = null
    if (decoded.role === 'student' && studentId) {
      const stuRes = await sql`
        SELECT class, arm FROM students WHERE id = ${studentId} AND tenant_id = ${tenantId}
      `
      student = stuRes.rows[0] || null
    }

    const { lessonId } = req.query

    // LIST MODE — no lessonId: return live lessons this student can access
    if (!lessonId) {
      if (decoded.role === 'student' && !student) {
        return res.status(403).json({ error: 'Student record not found for this account' })
      }
      const result = await sql`
        SELECT l.id::text,
               l.title,
               l.description,
               l.type,
               l.scheduled_at::text AS scheduled_at,
               l.duration_minutes,
               l.recording_url,
               l.meeting_url,
               l.status,
               COALESCE(vc.name, '') AS classroom_name,
               s.name AS subject_name
        FROM lessons l
        JOIN virtual_classrooms vc ON vc.id = l.classroom_id AND vc.tenant_id = l.tenant_id
        LEFT JOIN subjects s ON s.id::text = vc.subject_id
        WHERE l.tenant_id = ${tenantId}
          AND (
            (l.type = 'live' AND l.status IN ('scheduled', 'live', 'completed'))
            OR (l.type = 'async' AND l.status = 'published')
          )
          AND (
            ${decoded.role !== 'student'}
            OR (vc.class_arm_id IS NULL AND vc.class_level IS NULL)
            OR (vc.class_level IS NOT NULL AND LOWER(vc.class_level) = LOWER(${student?.class || ''}))
            OR EXISTS (
              SELECT 1 FROM classes c
              WHERE c.id::text = vc.class_arm_id AND c.tenant_id = ${tenantId}
                AND LOWER(c.name) = LOWER(${student?.class || ''})
                AND (c.arm IS NULL OR c.arm = '' OR LOWER(c.arm) = LOWER(${student?.arm || ''}))
            )
          )
        ORDER BY
          CASE l.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
          l.scheduled_at DESC NULLS LAST
        LIMIT 50
      `
      return res.status(200).json({ data: result.rows })
    }

    // SINGLE LESSON — enrollment check for students
    const result = await sql`
      SELECT l.id::text,
             l.title,
             l.description,
             l.type,
             l.scheduled_at::text AS scheduled_at,
             l.duration_minutes,
             l.meeting_url,
             l.recording_url,
             l.status,
             vc.class_arm_id,
             vc.class_level,
             COALESCE(vc.name, '') AS classroom_name
      FROM lessons l
      LEFT JOIN virtual_classrooms vc ON vc.id = l.classroom_id
      WHERE l.id = ${lessonId as string}
        AND l.tenant_id = ${tenantId}
        AND l.type = 'live'
    `

    const lesson = result.rows[0]
    if (!lesson) {
      return res.status(404).json({ error: 'Live class not found' })
    }

    if (decoded.role === 'student') {
      if (!student) {
        return res.status(403).json({ error: 'Student record not found for this account' })
      }
      if (lesson.class_arm_id) {
        const enroll = await sql`
          SELECT 1 FROM classes c
          WHERE c.id::text = ${lesson.class_arm_id} AND c.tenant_id = ${tenantId}
            AND LOWER(c.name) = LOWER(${student.class || ''})
            AND (c.arm IS NULL OR c.arm = '' OR LOWER(c.arm) = LOWER(${student.arm || ''}))
          LIMIT 1
        `
        if (!enroll.rows[0]) {
          return res.status(403).json({ error: 'You are not enrolled in the class for this lesson' })
        }
      } else if (lesson.class_level) {
        if ((student.class || '').toLowerCase() !== String(lesson.class_level).toLowerCase()) {
          return res.status(403).json({ error: 'This lesson is for a different class level' })
        }
      }
    }

    return res.status(200).json({ data: lesson })
  } catch (error) {
    console.error('[student/live-meetings]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
