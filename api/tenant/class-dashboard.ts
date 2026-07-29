import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { fetchStudents } from './_lib/students.js'
import { fetchApplications } from './_lib/applications.js'
import { requireRole } from '../_lib/auth-middleware.js'

interface ClassDashboard {
  className: string
  studentCount: number
  teacherCount: number
  examCount: number
  students: any[]
  upcomingExams: any[]
  recentApplications: any[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { className } = req.query

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!className || typeof className !== 'string') {
    return res.status(400).json({ error: 'Class name is required' })
  }

  try {
    // Fetch students for this class
    const allStudents = await fetchStudents()
    const classStudents = allStudents.filter((student: any) =>
      student.class === className || student.class.startsWith(className.split(' ')[0])
    )

    // Fetch recent applications for this class
    const allApplications = await fetchApplications()
    const classApplications = allApplications
      .filter((app: any) => app.class === className)
      .slice(0, 5)

    // Count teachers assigned to this class from timetable
    const teachersRes = await sql`
      SELECT DISTINCT staff_id FROM timetable
      WHERE class_name = ${className} OR class_name LIKE ${className + '%'}
    `

    // Count exams for this class
    const examsRes = await sql`
      SELECT id::text, title, exam_date::text AS date, status FROM exams
      WHERE student_class = ${className} OR student_class LIKE ${className + '%'}
      ORDER BY exam_date ASC
    `

    const dashboardData: ClassDashboard = {
      className,
      studentCount: classStudents.length,
      teacherCount: teachersRes.rows.length,
      examCount: examsRes.rows.length,
      students: classStudents,
      upcomingExams: examsRes.rows.filter((exam: any) => exam.status === 'Scheduled'),
      recentApplications: classApplications
    }

    return res.status(200).json({
      data: dashboardData,
      message: `Dashboard data for ${className} retrieved successfully`
    })

  } catch (error) {
    console.error('Error fetching class dashboard:', error)
    return res.status(500).json({ error: 'Failed to fetch class dashboard' })
  }
}
