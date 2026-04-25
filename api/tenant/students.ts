import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchStudents, createStudent, updateStudent, deleteStudent, type StudentPayload } from './_lib/students'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req

  if (method === 'GET') {
    try {
      const { class: classFilter, status: statusFilter } = req.query
      const students = await fetchStudents()

      let filtered = students
      if (classFilter && typeof classFilter === 'string') {
        filtered = filtered.filter(s => s.class === classFilter)
      }
      if (statusFilter && typeof statusFilter === 'string') {
        filtered = filtered.filter(s => s.status === statusFilter)
      }

      return res.status(200).json({ data: filtered })
    } catch (error) {
      console.error('Error fetching students:', error)
      return res.status(500).json({ error: 'Failed to fetch students' })
    }
  }

  if (method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const required = ['admissionNo', 'name', 'class', 'arm', 'gender', 'status', 'guardian', 'phone']
    const missing = required.filter(f => !body[f])
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
    }

    try {
      const studentData: StudentPayload = {
        admissionNo: body.admissionNo,
        name: body.name,
        class: body.class,
        arm: body.arm,
        gender: body.gender,
        status: body.status,
        guardian: body.guardian,
        phone: body.phone,
      }
      const created = await createStudent(studentData)
      return res.status(201).json({ data: created })
    } catch (error) {
      console.error('Error creating student:', error)
      return res.status(500).json({ error: 'Failed to create student' })
    }
  }

  if (method === 'PUT') {
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Student ID is required as query param' })
    }

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    try {
      const updated = await updateStudent(id, body)
      if (!updated) {
        return res.status(404).json({ error: 'Student not found' })
      }
      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error updating student:', error)
      return res.status(500).json({ error: 'Failed to update student' })
    }
  }

  if (method === 'DELETE') {
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Student ID is required as query param' })
    }

    try {
      await deleteStudent(id)
      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting student:', error)
      return res.status(500).json({ error: 'Failed to delete student' })
    }
  }

  return methodNotAllowed(res)
}
