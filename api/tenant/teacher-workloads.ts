import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

interface TeacherWorkload {
  teacherId: string
  teacherName: string
  subjects: string[]
  classes: { className: string; subject: string; studentCount: number; periodCount: number }[]
  totalStudents: number
  workloadPercentage: number
  status: string
}

// staff.subjects is a TEXT column holding a JSON array — parse it safely.
function parseSubjectList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { teacherId } = req.query
  const tenantId = decoded.tenantId || 'default-tenant'

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const teachersRes = await sql`
      SELECT id, name, COALESCE(subjects, '') AS subjects, status FROM staff
      WHERE tenant_id = ${tenantId} AND (role ILIKE '%teacher%' OR role ILIKE '%staff%') ORDER BY name
    `

    const studentCountsRes = await sql`
      SELECT class, COUNT(*) AS cnt FROM students
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL GROUP BY class
    `
    const studentCounts = new Map(studentCountsRes.rows.map(r => [r.class, parseInt(r.cnt)]))

    // Assigned teacher workloads come from teacher_allocation_slots — the
    // canonical class/subject → teacher map (teacher stored as staff.name).
    const slotsRes = await sql`
      SELECT teacher, class, subject, COUNT(*) AS period_count
      FROM teacher_allocation_slots
      WHERE tenant_id = ${tenantId} AND coverage = 'Assigned' AND teacher IS NOT NULL
      GROUP BY teacher, class, subject
    `
    const slotsByTeacher = new Map<string, { className: string; subject: string; periodCount: number }[]>()
    for (const r of slotsRes.rows) {
      const list = slotsByTeacher.get(r.teacher) || []
      list.push({ className: r.class, subject: r.subject, periodCount: parseInt(r.period_count) })
      slotsByTeacher.set(r.teacher, list)
    }

    const buildWorkload = (teacher: any): TeacherWorkload => {
      const classes = (slotsByTeacher.get(teacher.name) || []).map(c => ({
        ...c,
        studentCount: studentCounts.get(c.className) || 0,
      }))
      const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
      const totalPeriods = classes.reduce((sum, c) => sum + c.periodCount, 0)
      const workloadPercentage = Math.min(100, Math.round((totalPeriods / 30) * 100))
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        subjects: parseSubjectList(teacher.subjects),
        classes,
        totalStudents,
        workloadPercentage,
        status: teacher.status || 'Active',
      }
    }

    if (teacherId && typeof teacherId === 'string') {
      const teacher = teachersRes.rows.find(t => t.id === teacherId)
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' })
      }
      return res.status(200).json({ data: buildWorkload(teacher) })
    }

    return res.status(200).json({ data: teachersRes.rows.map(buildWorkload) })
  } catch (error) {
    console.error('Error fetching teacher workloads:', error)
    return res.status(500).json({ error: 'Failed to fetch teacher workloads' })
  }
}
