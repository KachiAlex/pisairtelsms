import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { teacherId } = req.query

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS timetable (
      id SERIAL PRIMARY KEY, staff_id TEXT, day TEXT, subject TEXT,
      class_name TEXT, room TEXT, start_time TEXT, end_time TEXT, created_at TIMESTAMP DEFAULT NOW()
    )`
    await sql`CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY, staff_id TEXT, name TEXT, department TEXT, role TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS subjects TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_hours NUMERIC`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS allocation_periods TEXT`
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active'`

    const teachersRes = await sql`
      SELECT id, name, COALESCE(subjects, '') AS subjects, status FROM staff
      WHERE role ILIKE '%teacher%' OR role ILIKE '%staff%' ORDER BY name
    `

    const studentCountsRes = await sql`
      SELECT class, COUNT(*) AS cnt FROM students WHERE deleted_at IS NULL GROUP BY class
    `
    const studentCounts = new Map(studentCountsRes.rows.map(r => [r.class, parseInt(r.cnt)]))

    if (teacherId && typeof teacherId === 'string') {
      const teacher = teachersRes.rows.find(t => t.id === teacherId)
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' })
      }

      const ttRes = await sql`
        SELECT subject, class_name, COUNT(*) AS period_count
        FROM timetable WHERE staff_id = ${teacherId}
        GROUP BY subject, class_name
      `

      const classes = ttRes.rows.map(r => ({
        className: r.class_name,
        subject: r.subject,
        studentCount: studentCounts.get(r.class_name) || 0,
        periodCount: parseInt(r.period_count)
      }))

      const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
      const workloadPercentage = Math.min(100, Math.round((classes.length / 30) * 100))

      const workload: TeacherWorkload = {
        teacherId: teacher.id,
        teacherName: teacher.name,
        subjects: teacher.subjects ? teacher.subjects.split(',') : [],
        classes,
        totalStudents,
        workloadPercentage,
        status: teacher.status || 'Active'
      }

      return res.status(200).json({ data: workload })
    } else {
      const workloads: TeacherWorkload[] = []
      for (const teacher of teachersRes.rows) {
        const ttRes = await sql`
          SELECT subject, class_name, COUNT(*) AS period_count
          FROM timetable WHERE staff_id = ${teacher.id}
          GROUP BY subject, class_name
        `
        const classes = ttRes.rows.map(r => ({
          className: r.class_name,
          subject: r.subject,
          studentCount: studentCounts.get(r.class_name) || 0,
          periodCount: parseInt(r.period_count)
        }))

        const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
        const workloadPercentage = Math.min(100, Math.round((classes.length / 30) * 100))

        workloads.push({
          teacherId: teacher.id,
          teacherName: teacher.name,
          subjects: teacher.subjects ? teacher.subjects.split(',') : [],
          classes,
          totalStudents,
          workloadPercentage,
          status: teacher.status || 'Active'
        })
      }

      return res.status(200).json({ data: workloads })
    }
  } catch (error) {
    console.error('Error fetching teacher workloads:', error)
    return res.status(500).json({ error: 'Failed to fetch teacher workloads' })
  }
}
