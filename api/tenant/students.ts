import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchStudents, createStudent, createStudents, updateStudent, deleteStudent, type Student, type StudentPayload } from './_lib/students'

interface ApiResponse<T> {
  data?: T
  error?: string
}

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (error) {
      console.error('Failed to parse request body', error)
      return null
    }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req

  if (method === 'GET') {
    try {
      const students = await fetchStudents()
      return res.status(200).json({ data: students })
    } catch (error) {
      console.error('Error fetching students:', error)
      return res.status(500).json({ error: 'Failed to fetch students' })
    }
  }

  if (method === 'POST') {
    try {
      const body = parseBody(req)
      if (!body) {
        return res.status(400).json({ error: 'Request body is required' })
      }

      // Check if this is a bulk create or single create
      if (Array.isArray(body.students)) {
        // Bulk create
        const studentsData: StudentPayload[] = body.students
        const createdStudents = await createStudents(studentsData)
        return res.status(201).json({ data: createdStudents })
      } else {
        // Single create
        const studentData: StudentPayload = body.student || body
        const createdStudent = await createStudent(studentData)
        return res.status(201).json({ data: createdStudent })
      }
    } catch (error) {
      console.error('Error creating student(s):', error)
      return res.status(500).json({ error: 'Failed to create student(s)' })
    }
  }

  if (method === 'PUT') {
    try {
      const body = parseBody(req)
      if (!body || !body.id) {
        return res.status(400).json({ error: 'Student ID and update data are required' })
      }

      const { id, ...updateData } = body
      const updatedStudent = await updateStudent(id, updateData)

      if (!updatedStudent) {
        return res.status(404).json({ error: 'Student not found' })
      }

      return res.status(200).json({ data: updatedStudent })
    } catch (error) {
      console.error('Error updating student:', error)
      return res.status(500).json({ error: 'Failed to update student' })
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Student ID is required' })
      }

      const deleted = await deleteStudent(id)
      if (!deleted) {
        return res.status(404).json({ error: 'Student not found' })
      }

      return res.status(200).json({ message: 'Student deleted successfully' })
    } catch (error) {
      console.error('Error deleting student:', error)
      return res.status(500).json({ error: 'Failed to delete student' })
    }
  }

  return methodNotAllowed(res)
}
