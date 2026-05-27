import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchStudents } from './_lib/students.js'
import { requireRole } from '../_lib/auth-middleware.js'

// Mock exam result data - in real app this would come from exam results API
interface ExamResult {
  examId: string
  examTitle: string
  subject: string
  score: number
  grade: string
  status: 'Passed' | 'Failed' | 'Pending'
  date: string
}

interface StudentProgress {
  studentId: string
  studentName: string
  class: string
  overallGPA: number
  totalExams: number
  passedExams: number
  failedExams: number
  pendingExams: number
  recentResults: ExamResult[]
  subjectPerformance: SubjectPerformance[]
}

interface SubjectPerformance {
  subject: string
  averageScore: number
  examsTaken: number
  bestScore: number
  trend: 'improving' | 'declining' | 'stable'
}

// Mock exam results - replace with real exam results API
const mockExamResults: { [studentId: string]: ExamResult[] } = {}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { studentId } = req.query

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
        message: 'Cannot retrieve student data for progress calculations'
      })
    }

    if (studentId && typeof studentId === 'string') {
      // Get specific student progress
      const student = allStudents.find((s: any) => s.id === studentId)

      if (!student) {
        return res.status(404).json({ error: 'Student not found' })
      }

      const studentResults = mockExamResults[studentId] || []

      if (studentResults.length === 0) {
        return res.status(200).json({
          data: {
            studentId: student.id,
            studentName: student.name,
            class: `${student.class} ${student.arm}`,
            overallGPA: 0,
            totalExams: 0,
            passedExams: 0,
            failedExams: 0,
            pendingExams: 0,
            recentResults: [],
            subjectPerformance: []
          },
          message: `No exam results found for ${student.name}. Please implement exam results API endpoint.`,
          integrations: {
            studentsApi: '/api/tenant/students'
          }
        })
      }

      // Calculate subject performance
      const subjectMap = new Map<string, ExamResult[]>()
      studentResults.forEach(result => {
        if (!subjectMap.has(result.subject)) {
          subjectMap.set(result.subject, [])
        }
        subjectMap.get(result.subject)!.push(result)
      })

      const subjectPerformance: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, results]) => {
        const scores = results.map(r => r.score)
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
        const bestScore = Math.max(...scores)

        // Simple trend calculation (would be more sophisticated in real app)
        const recentResults = results.slice(-3)
        const trend = recentResults.length >= 2 ?
          (recentResults[recentResults.length - 1].score > recentResults[0].score ? 'improving' :
           recentResults[recentResults.length - 1].score < recentResults[0].score ? 'declining' : 'stable') : 'stable'

        return {
          subject,
          averageScore: Math.round(averageScore),
          examsTaken: results.length,
          bestScore,
          trend
        }
      })

      const passedExams = studentResults.filter(r => r.status === 'Passed').length
      const failedExams = studentResults.filter(r => r.status === 'Failed').length
      const pendingExams = studentResults.filter(r => r.status === 'Pending').length
      const overallGPA = studentResults.length > 0 ?
        studentResults.reduce((sum, r) => sum + r.score, 0) / studentResults.length : 0

      const progress: StudentProgress = {
        studentId: student.id,
        studentName: student.name,
        class: `${student.class} ${student.arm}`,
        overallGPA: Math.round(overallGPA),
        totalExams: studentResults.length,
        passedExams,
        failedExams,
        pendingExams,
        recentResults: studentResults.slice(-5), // Last 5 results
        subjectPerformance
      }

      return res.status(200).json({
        data: progress,
        message: `Progress data for ${student.name} retrieved successfully`,
        integrations: {
          studentsApi: '/api/tenant/students'
        }
      })
    } else {
      // Get all students progress summary
      const progressSummaries = allStudents.slice(0, 10).map((student: any) => { // Limit for performance
        const studentResults = mockExamResults[student.id] || []
        const passedExams = studentResults.filter((r: any) => r.status === 'Passed').length
        const failedExams = studentResults.filter((r: any) => r.status === 'Failed').length
        const overallGPA = studentResults.length > 0 ?
          studentResults.reduce((sum: number, r: any) => sum + r.score, 0) / studentResults.length : 0

        return {
          studentId: student.id,
          studentName: student.name,
          class: `${student.class} ${student.arm}`,
          overallGPA: Math.round(overallGPA),
          totalExams: studentResults.length,
          passedExams,
          failedExams,
          status: student.status
        }
      })

      if (progressSummaries.length === 0 || progressSummaries.every(p => p.totalExams === 0)) {
        return res.status(200).json({
          data: progressSummaries,
          message: 'No exam results data available. Please implement exam results API endpoint.',
          integrations: {
            studentsApi: '/api/tenant/students'
          }
        })
      }

      return res.status(200).json({
        data: progressSummaries,
        message: 'Student progress summaries retrieved successfully',
        integrations: {
          studentsApi: '/api/tenant/students'
        }
      })
    }
  } catch (error) {
    console.error('Error fetching student progress:', error)
    return res.status(500).json({ error: 'Failed to fetch student progress' })
  }
}
