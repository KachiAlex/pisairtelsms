import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { studentId } = req.query

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY, student_id TEXT, subject TEXT, ca_score NUMERIC, exam_score NUMERIC, updated_at TIMESTAMP DEFAULT NOW()
    )`

    if (studentId && typeof studentId === 'string') {
      const studentRes = await sql`
        SELECT id, name, class, arm FROM students WHERE id = ${studentId} AND deleted_at IS NULL LIMIT 1
      `
      if (!studentRes.rows[0]) {
        return res.status(404).json({ error: 'Student not found' })
      }
      const student = studentRes.rows[0]

      const resultsRes = await sql`
        SELECT id::text AS exam_id, subject,
               (COALESCE(ca_score,0) + COALESCE(exam_score,0)) AS score,
               updated_at::text AS date
        FROM results WHERE student_id = ${studentId} ORDER BY updated_at DESC
      `
      const studentResults: ExamResult[] = resultsRes.rows.map(r => ({
        examId: r.exam_id,
        examTitle: r.subject,
        subject: r.subject,
        score: Number(r.score),
        grade: Number(r.score) >= 50 ? 'C' : 'F',
        status: Number(r.score) >= 40 ? 'Passed' : 'Failed',
        date: r.date
      }))

      const subjectMap = new Map<string, ExamResult[]>()
      studentResults.forEach(result => {
        if (!subjectMap.has(result.subject)) subjectMap.set(result.subject, [])
        subjectMap.get(result.subject)!.push(result)
      })

      const subjectPerformance: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, results]) => {
        const scores = results.map(r => r.score)
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
        const bestScore = Math.max(...scores)
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
      const pendingExams = 0
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
        recentResults: studentResults.slice(0, 5),
        subjectPerformance
      }

      return res.status(200).json({ data: progress })
    } else {
      const studentsRes = await sql`
        SELECT id, name, class, arm, status FROM students WHERE deleted_at IS NULL
      `
      const progressSummaries = []
      for (const student of studentsRes.rows) {
        const resultsRes = await sql`
          SELECT (COALESCE(ca_score,0) + COALESCE(exam_score,0)) AS score
          FROM results WHERE student_id = ${student.id}
        `
        const studentResults = resultsRes.rows
        const passedExams = studentResults.filter((r: any) => Number(r.score) >= 40).length
        const failedExams = studentResults.filter((r: any) => Number(r.score) < 40).length
        const overallGPA = studentResults.length > 0 ?
          studentResults.reduce((sum: number, r: any) => sum + Number(r.score), 0) / studentResults.length : 0

        progressSummaries.push({
          studentId: student.id,
          studentName: student.name,
          class: `${student.class} ${student.arm}`,
          overallGPA: Math.round(overallGPA),
          totalExams: studentResults.length,
          passedExams,
          failedExams,
          status: student.status
        })
      }

      return res.status(200).json({ data: progressSummaries })
    }
  } catch (error) {
    console.error('Error fetching student progress:', error)
    return res.status(500).json({ error: 'Failed to fetch student progress' })
  }
}
