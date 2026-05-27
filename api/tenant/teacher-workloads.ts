import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchStudents } from './_lib/students.js'
import { requireRole } from '../_lib/auth-middleware.js'

// Mock teacher data - in real app this would come from teacher API
interface Teacher {
  id: string
  name: string
  subjects: string[]
  classes: string[]
  contractHours: number
  allocation: number
  status: 'Active' | 'Inactive'
}

interface TeacherWorkload {
  teacherId: string
  teacherName: string
  subjects: string[]
  classes: TeacherClass[]
  totalStudents: number
  workloadPercentage: number
  status: string
}

interface TeacherClass {
  className: string
  subject: string
  studentCount: number
  periodCount: number
}

// Mock teacher data - replace with real teacher API
const mockTeachers: Teacher[] = []

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant teacher workloads
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { teacherId } = req.query

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Call students API to get student data
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    const studentsRes = await fetch(`${baseUrl}/api/tenant/students`)

    let allStudents: any[] = []
    if (studentsRes.ok) {
      const studentsData = await studentsRes.json()
      allStudents = studentsData.data || []
    } else {
      return res.status(503).json({
        error: 'Students API unavailable',
        message: 'Cannot retrieve student data for workload calculations'
      })
    }

    if (teacherId && typeof teacherId === 'string') {
      // Get specific teacher workload
      const teacher = mockTeachers.find(t => t.id === teacherId)
      if (!teacher) {
        return res.status(404).json({
          error: 'Teacher not found',
          message: 'No teacher data available. Please implement teacher API endpoint.'
        })
      }

      const teacherClasses: TeacherClass[] = teacher.classes.map(className => {
        const subject = teacher.subjects[0] // Simplified - in real app, map class to subject
        const classStudents = allStudents.filter(student =>
          student.class === className.split(' ')[0] && student.arm === className.split(' ')[1]
        )

        return {
          className,
          subject,
          studentCount: classStudents.length,
          periodCount: 5 // Mock periods per week
        }
      })

      const totalStudents = teacherClasses.reduce((sum, cls) => sum + cls.studentCount, 0)
      const workloadPercentage = (teacher.allocation / teacher.contractHours) * 100

      const workload: TeacherWorkload = {
        teacherId: teacher.id,
        teacherName: teacher.name,
        subjects: teacher.subjects,
        classes: teacherClasses,
        totalStudents,
        workloadPercentage: Math.round(workloadPercentage),
        status: teacher.status
      }

      return res.status(200).json({
        data: workload,
        message: `Workload data for ${teacher.name} retrieved successfully`,
        integrations: {
          studentsApi: '/api/tenant/students'
        }
      })
    } else {
      // Get all teacher workloads
      if (mockTeachers.length === 0) {
        return res.status(200).json({
          data: [],
          message: 'No teacher data available. Please implement teacher API endpoint.',
          integrations: {
            studentsApi: '/api/tenant/students'
          }
        })
      }

      const workloads: TeacherWorkload[] = mockTeachers.map(teacher => {
        const teacherClasses: TeacherClass[] = teacher.classes.map(className => {
          const subject = teacher.subjects[0]
          const classStudents = allStudents.filter((student: any) =>
            student.class === className.split(' ')[0] && student.arm === className.split(' ')[1]
          )

          return {
            className,
            subject,
            studentCount: classStudents.length,
            periodCount: 5
          }
        })

        const totalStudents = teacherClasses.reduce((sum, cls) => sum + cls.studentCount, 0)
        const workloadPercentage = (teacher.allocation / teacher.contractHours) * 100

        return {
          teacherId: teacher.id,
          teacherName: teacher.name,
          subjects: teacher.subjects,
          classes: teacherClasses,
          totalStudents,
          workloadPercentage: Math.round(workloadPercentage),
          status: teacher.status
        }
      })

      return res.status(200).json({
        data: workloads,
        message: 'All teacher workloads retrieved successfully',
        integrations: {
          studentsApi: '/api/tenant/students'
        }
      })
    }
  } catch (error) {
    console.error('Error fetching teacher workloads:', error)
    return res.status(500).json({ error: 'Failed to fetch teacher workloads' })
  }
}
