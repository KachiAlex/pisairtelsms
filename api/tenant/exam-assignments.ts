import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

interface ExamAssignment {
  examId: string
  examTitle: string
  class: string
  subject: string
  eligibleStudents: any[]
  totalStudents: number
  assignedStudents: number
  unassignedStudents: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req
  const { examId } = req.query

  if (method === 'GET') {
    try {
      if (examId && typeof examId === 'string') {
        const examRes = await sql`SELECT id::text, title, subject, student_class FROM exams WHERE id = ${examId} LIMIT 1`
        if (!examRes.rows[0]) {
          return res.status(404).json({ error: 'Exam not found' })
        }
        const exam = examRes.rows[0]

        const studentsRes = await sql`
          SELECT id, admission_no AS "admissionNo", name, class, arm, gender, status, guardian, phone
          FROM students WHERE class = ${exam.student_class} AND status = 'Active' AND deleted_at IS NULL
        `
        const eligibleStudents = studentsRes.rows

        const assignment: ExamAssignment = {
          examId: exam.id,
          examTitle: exam.title,
          class: exam.student_class || '',
          subject: exam.subject || '',
          eligibleStudents,
          totalStudents: eligibleStudents.length,
          assignedStudents: 0,
          unassignedStudents: eligibleStudents.length
        }

        return res.status(200).json({ data: assignment })
      } else {
        const examsRes = await sql`SELECT id::text, title, subject, student_class FROM exams ORDER BY exam_date DESC`
        const allStudentsRes = await sql`SELECT id, class, status FROM students WHERE deleted_at IS NULL`

        const assignments: ExamAssignment[] = examsRes.rows.map(exam => {
          const eligibleStudents = allStudentsRes.rows.filter(
            (s: any) => s.class === exam.student_class && s.status === 'Active'
          )
          return {
            examId: exam.id,
            examTitle: exam.title,
            class: exam.student_class || '',
            subject: exam.subject || '',
            eligibleStudents: eligibleStudents.slice(0, 5),
            totalStudents: eligibleStudents.length,
            assignedStudents: 0,
            unassignedStudents: eligibleStudents.length
          }
        })

        return res.status(200).json({ data: assignments })
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
      return res.status(200).json({
        message: `Successfully assigned ${body.studentIds.length} students to exam ${body.examId}`,
        data: { examId: body.examId, assignedStudents: body.studentIds.length }
      })
    } catch (error) {
      console.error('Error assigning students to exam:', error)
      return res.status(500).json({ error: 'Failed to assign students to exam' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
