import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * /api/tenant/behavioral
 * GET  ?class= or ?studentId= — incidents + recognition + teacher comments
 * POST { kind: 'incident'|'recognition'|'comment', studentId, type, description|comment,
 *        severity?, subject?, actionTaken?, date? }
 * PUT  { kind, id, actionTaken? } — record follow-up action on an incident
 *
 * Writers feed the parent Behavioral Reports page and the student transcript
 * conduct section. Staff are limited to students in classes they are
 * allocated to (teacher_allocation_slots) or form-teach; tenant_admin is
 * unrestricted.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const staffId = decoded.userId || decoded.staffId
  const isAdmin = decoded.role === 'tenant_admin'

  async function staffCanTouchStudent(studentId: string): Promise<boolean> {
    if (isAdmin) return true
    const stu = await sql`
      SELECT class FROM students WHERE id = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL LIMIT 1
    `
    const className = stu.rows[0]?.class
    if (!className) return false
    const me = await sql`SELECT name FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1`
    const myName = me.rows[0]?.name
    if (!myName) return false
    const base = className.replace(/\s+[A-Z]$/, '')
    const alloc = await sql`
      SELECT 1 FROM teacher_allocation_slots tas
      WHERE tas.tenant_id = ${tenantId} AND LOWER(tas.teacher) = LOWER(${myName})
        AND tas.coverage = 'Assigned'
        AND (tas.class = ${className} OR tas.class = ${base})
      LIMIT 1
    `.catch(() => ({ rows: [] as any[] }))
    if (alloc.rows.length) return true
    // Form teachers may record conduct for their whole class
    const ft = await sql`
      SELECT 1 FROM classes
      WHERE tenant_id = ${tenantId} AND form_teacher_id = ${staffId} AND deleted_at IS NULL
        AND (name || ' ' || COALESCE(arm, '')) IN (${className}, ${base}, ${className.replace(/\s+/g, '')})
      LIMIT 1
    `.catch(() => ({ rows: [] as any[] }))
    return ft.rows.length > 0
  }

  try {
    if (req.method === 'GET') {
      const { class: className, studentId } = req.query as { class?: string; studentId?: string }

      let studentFilter: string[] | null = null
      if (studentId) {
        if (!(await staffCanTouchStudent(studentId as string))) {
          return res.status(403).json({ error: 'You can only view conduct records for students in your classes' })
        }
        studentFilter = [studentId as string]
      } else if (className) {
        const stu = await sql`
          SELECT id::text FROM students
          WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
            AND (class = ${className} OR class LIKE ${className + ' %'})
        `
        studentFilter = stu.rows.map((r: any) => r.id)
        if (!isAdmin) {
          // require allocation or form-teacher for at least one — cheap check on first student
          if (studentFilter.length && !(await staffCanTouchStudent(studentFilter[0]))) {
            return res.status(403).json({ error: 'You are not allocated to this class' })
          }
        }
      } else {
        return res.status(400).json({ error: 'class or studentId is required' })
      }

      if (!studentFilter.length) {
        return res.status(200).json({ incidents: [], recognition: [], comments: [] })
      }

      const [inc, rec, com] = await Promise.all([
        sql`
          SELECT bi.id::text, bi.student_id::text, s.name AS student_name, bi.date::text,
                 bi.type, bi.description, bi.severity, COALESCE(bi.action_taken, '') AS action_taken,
                 COALESCE(st.name, bi.reported_by, '') AS reported_by, bi.created_at
          FROM behavioral_incidents bi
          LEFT JOIN students s ON s.id::text = bi.student_id
          LEFT JOIN staff st ON st.id::text = bi.reported_by
          WHERE bi.tenant_id = ${tenantId} AND bi.student_id::text = ANY(${studentFilter})
          ORDER BY bi.date DESC NULLS LAST, bi.created_at DESC
          LIMIT 200
        `,
        sql`
          SELECT br.id::text, br.student_id::text, s.name AS student_name, br.date::text,
                 br.type, br.description, COALESCE(st.name, br.awarded_by, '') AS awarded_by
          FROM behavioral_recognition br
          LEFT JOIN students s ON s.id::text = br.student_id
          LEFT JOIN staff st ON st.id::text = br.awarded_by
          WHERE br.tenant_id = ${tenantId} AND br.student_id::text = ANY(${studentFilter})
          ORDER BY br.date DESC NULLS LAST
          LIMIT 200
        `,
        sql`
          SELECT tc.id::text, tc.student_id::text, s.name AS student_name, tc.date::text,
                 tc.subject, tc.comment, COALESCE(st.name, '') AS teacher
          FROM teacher_comments tc
          LEFT JOIN students s ON s.id::text = tc.student_id
          LEFT JOIN staff st ON st.id::text = tc.staff_id
          WHERE tc.tenant_id = ${tenantId} AND tc.student_id::text = ANY(${studentFilter})
          ORDER BY tc.date DESC NULLS LAST
          LIMIT 200
        `,
      ])

      return res.status(200).json({
        incidents: inc.rows,
        recognition: rec.rows,
        comments: com.rows,
      })
    }

    if (req.method === 'POST') {
      const { kind, studentId, type, description, comment, severity, subject, actionTaken, date } =
        (req.body ?? {}) as Record<string, string | undefined>
      if (!kind || !studentId) {
        return res.status(400).json({ error: 'kind and studentId are required' })
      }
      if (!(await staffCanTouchStudent(studentId))) {
        return res.status(403).json({ error: 'You can only record conduct for students in your classes' })
      }
      const id = `beh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const recordDate = date || new Date().toISOString().slice(0, 10)
      const actorName = (await sql`SELECT name FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1`).rows[0]?.name || 'Staff'

      if (kind === 'incident') {
        if (!type || !description) {
          return res.status(400).json({ error: 'type and description are required for incidents' })
        }
        const sev = ['minor', 'moderate', 'severe'].includes((severity ?? '').toLowerCase())
          ? severity!.toLowerCase() : 'minor'
        const r = await sql`
          INSERT INTO behavioral_incidents (id, tenant_id, student_id, date, type, description, severity, action_taken, reported_by)
          VALUES (${id}, ${tenantId}, ${studentId}, ${recordDate}, ${type}, ${description}, ${sev},
                  ${actionTaken || null}, ${staffId})
          RETURNING id::text, date::text, type, description, severity, action_taken
        `
        return res.status(201).json({ success: true, record: { ...r.rows[0], reported_by: actorName } })
      }

      if (kind === 'recognition') {
        if (!type || !description) {
          return res.status(400).json({ error: 'type and description are required for recognition' })
        }
        const r = await sql`
          INSERT INTO behavioral_recognition (id, tenant_id, student_id, date, type, description, awarded_by)
          VALUES (${id}, ${tenantId}, ${studentId}, ${recordDate}, ${type}, ${description}, ${staffId})
          RETURNING id::text, date::text, type, description
        `
        return res.status(201).json({ success: true, record: { ...r.rows[0], awarded_by: actorName } })
      }

      if (kind === 'comment') {
        const body = (comment || description || '').trim()
        if (!body) return res.status(400).json({ error: 'comment is required' })
        const r = await sql`
          INSERT INTO teacher_comments (id, tenant_id, student_id, staff_id, date, subject, comment)
          VALUES (${id}, ${tenantId}, ${studentId}, ${staffId}, ${recordDate}, ${subject || null}, ${body})
          RETURNING id::text, date::text, subject, comment
        `
        return res.status(201).json({ success: true, record: { ...r.rows[0], teacher: actorName } })
      }

      return res.status(400).json({ error: "kind must be 'incident', 'recognition', or 'comment'" })
    }

    if (req.method === 'PUT') {
      const { kind, id, actionTaken } = (req.body ?? {}) as Record<string, string | undefined>
      if (kind !== 'incident' || !id) {
        return res.status(400).json({ error: 'kind=incident and id are required' })
      }
      const own = await sql`
        SELECT student_id::text FROM behavioral_incidents WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `
      if (!own.rows[0]) return res.status(404).json({ error: 'Incident not found' })
      if (!(await staffCanTouchStudent(own.rows[0].student_id))) {
        return res.status(403).json({ error: 'You can only update incidents for students in your classes' })
      }
      const r = await sql`
        UPDATE behavioral_incidents SET action_taken = ${actionTaken || null}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id::text, action_taken
      `
      return res.status(200).json({ success: true, record: r.rows[0] })
    }

    res.setHeader('Allow', 'GET, POST, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Behavioral records error:', error)
    return res.status(500).json({ error: 'Failed to process behavioral request' })
  }
}
