import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchStudents } from './_lib/students.js'
import { requireRole } from '../_lib/auth-middleware.js'

// Mock exam data - in real app this would come from exam API
interface Exam {
  id: string
  title: string
  subject: string
  class: string
  status: 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed'
  date: string
  duration: string
  questions: any[] // From recent changes
  passMark: number
}

interface StudentDTO {
  id: string
  admissionNo: string
  name: string
  class: string
  arm: string
  gender: string
  status: 'Active' | 'Suspended' | 'Graduated'
  guardian: string
  phone: string
  created_at?: string
  updated_at?: string
}

interface ExamAssignment {
  examId: string
  examTitle: string
  class: string
  subject: string
  eligibleStudents: StudentDTO[]
  totalStudents: number
  assignedStudents: number
  unassignedStudents: number
}

// Mock exam data - replace with real exam API
const mockExams: Exam[] = []

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant exam assignments
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { examId } = req.query

  if (method === 'GET') {
    try {
      if (examId && typeof examId === 'string') {
        // Get specific exam assignment
        const exam = mockExams.find(e => e.id === examId)
        if (!exam) {
          return res.status(404).json({
            error: 'Exam not found',
            message: 'No exam data available. Please implement exam API endpoint.'
          })
        }

        // Call students API to get eligible students
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
        const studentsRes = await fetch(`${baseUrl}/api/tenant/students`)

        if (!studentsRes.ok) {
          return res.status(503).json({
            error: 'Students API unavailable',
            message: 'Cannot retrieve eligible students for exam assignment'
          })
        }

        const studentsData = await studentsRes.json()
        const allStudents = studentsData.data || []
        const eligibleStudents = allStudents.filter((student: any) =>
          student.class === exam.class && student.status === 'Active'
        )

        if (eligibleStudents.length === 0) {
          return res.status(404).json({
            error: 'No eligible students found',
            message: `No active students found for class ${exam.class}`
          })
        }

        const assignment: ExamAssignment = {
          examId: exam.id,
          examTitle: exam.title,
          class: exam.class,
          subject: exam.subject,
          eligibleStudents,
          totalStudents: eligibleStudents.length,
          assignedStudents: Math.floor(eligibleStudents.length * 0.9), // Mock assigned count
          unassignedStudents: Math.ceil(eligibleStudents.length * 0.1)
        }

        return res.status(200).json({
          data: assignment,
          message: `Exam assignment data for ${exam.title} retrieved successfully`,
          integrations: {
            studentsApi: '/api/tenant/students'
          }
        })
      } else {
        // Get all exam assignments
        if (mockExams.length === 0) {
          return res.status(200).json({
            data: [],
            message: 'No exam data available. Please implement exam API endpoint.',
            integrations: {
              studentsApi: '/api/tenant/students'
            }
          })
        }

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
        const studentsRes = await fetch(`${baseUrl}/api/tenant/students`)

        let allStudents: any[] = []
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json()
          allStudents = studentsData.data || []
        }

        const assignments: ExamAssignment[] = mockExams.map(exam => {
          const eligibleStudents = allStudents.filter((student: any) =>
            student.class === exam.class && student.status === 'Active'
          )

          return {
            examId: exam.id,
            examTitle: exam.title,
            class: exam.class,
            subject: exam.subject,
            eligibleStudents: eligibleStudents.slice(0, 5), // Return first 5 for summary
            totalStudents: eligibleStudents.length,
            assignedStudents: Math.floor(eligibleStudents.length * 0.9),
            unassignedStudents: Math.ceil(eligibleStudents.length * 0.1)
          }
        })

        return res.status(200).json({
          data: assignments,
          message: 'All exam assignments retrieved successfully',
          integrations: {
            studentsApi: '/api/tenant/students'
          }
        })
      }
    } catch (error) {
      console.error('Error fetching exam assignments:', error)
      return res.status(500).json({ error: 'Failed to fetch exam assignments' })
    }
  }

  if (method === 'POST') {
    try {
      const body = req.body
      if (!body || !body.examId || !body.studentIds) {
        return res.status(400).json({ error: 'Exam ID and student IDs are required' })
      }

      const { examId, studentIds } = body

      // In real implementation, this would update exam assignments in database
      // For now, just return success
      return res.status(200).json({
        message: `Successfully assigned ${studentIds.length} students to exam ${examId}`,
        data: { examId, assignedStudents: studentIds.length }
      })

    } catch (error) {
      console.error('Error assigning students to exam:', error)
      return res.status(500).json({ error: 'Failed to assign students to exam' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
