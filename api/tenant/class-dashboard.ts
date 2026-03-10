import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchStudents, type Student } from './_lib/students'
import { fetchApplications } from './_lib/applications'

// Mock exam data - in real app this would come from exam API
interface Exam {
  id: string
  title: string
  subject: string
  class: string
  status: 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed'
  date: string
  participants: number
}

interface ClassDashboard {
  className: string
  studentCount: number
  teacherCount: number
  examCount: number
  students: Student[]
  upcomingExams: Exam[]
  recentApplications: any[]
}

// Mock data for demonstration - replace with real API calls
const mockTeachers = []

const mockExams: Exam[] = []

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const classStudents = allStudents.filter(student =>
      student.class === className || student.class.startsWith(className.split(' ')[0])
    )

    // Fetch recent applications for this class
    const allApplications = await fetchApplications()
    const classApplications = allApplications
      .filter(app => app.class === className)
      .slice(0, 5) // Get recent 5

    // Filter teachers and exams for this class
    const classTeachers = mockTeachers.filter(teacher =>
      teacher.class === className || teacher.class.startsWith(className.split(' ')[0])
    )

    const classExams = mockExams.filter(exam =>
      exam.class === className || exam.class.startsWith(className.split(' ')[0])
    )

    const dashboardData: ClassDashboard = {
      className,
      studentCount: classStudents.length,
      teacherCount: classTeachers.length,
      examCount: classExams.length,
      students: classStudents,
      upcomingExams: classExams.filter(exam => exam.status === 'Scheduled'),
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
