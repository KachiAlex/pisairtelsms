import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMigrations, initializeDatabase } from './cbt/_lib/db.js'
import { fetchStudents, createStudent, createStudents, updateStudent, deleteStudent, type StudentPayload } from './_lib/students.js'
import { requireRole } from '../_lib/auth-middleware.js'

// Get tenant ID from request (from auth context or headers)
function getTenantId(req: VercelRequest): string {
  // In a real app, this would come from the authenticated user's context
  // For now, we'll use a default or from headers
  const tenantId = (req.headers['x-tenant-id'] as string) || process.env.DEFAULT_TENANT_ID || 'default-tenant'
  return tenantId
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
    } catch {
      return null
    }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant student management
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  try {
    // Initialize database on first request
    initializeDatabase()
    await runMigrations()
  } catch (error) {
    console.error('Database initialization error:', error)
    return res.status(500).json({ error: 'Database initialization failed' })
  }

  const { method } = req
  const tenantId = getTenantId(req)

  if (method === 'GET') {
    try {
      const { class: classFilter, status: statusFilter } = req.query
      const students = await fetchStudents(tenantId)

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

    try {
      // Handle bulk import (students array)
      if (body.students && Array.isArray(body.students)) {
        const required = ['name', 'class', 'gender', 'status', 'guardian']
        
        // Validate all students
        for (const student of body.students) {
          const missing = required.filter(f => !student[f])
          if (missing.length > 0) {
            return res.status(400).json({ error: `Missing required fields in student: ${missing.join(', ')}` })
          }
        }

        const studentPayloads: StudentPayload[] = body.students.map((s: any) => ({
          admissionNo: s.admissionNo,
          name: s.name,
          class: s.class,
          arm: s.arm,
          gender: s.gender,
          status: s.status,
          guardian: s.guardian,
          phone: s.phone,
        }))

        const created = await createStudents(tenantId, studentPayloads)
        return res.status(201).json({ data: created })
      }

      // Handle single student creation (student object or direct fields)
      const studentData = body.student || body
      const required = ['name', 'class', 'gender', 'status', 'guardian']
      const missing = required.filter(f => !studentData[f])
      if (missing.length > 0) {
        return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
      }

      const payload: StudentPayload = {
        admissionNo: studentData.admissionNo || undefined,
        name: studentData.name,
        class: studentData.class,
        arm: studentData.arm,
        gender: studentData.gender,
        status: studentData.status,
        guardian: studentData.guardian,
        phone: studentData.phone,
      }
      const created = await createStudent(tenantId, payload)
      return res.status(201).json({ data: created })
    } catch (error) {
      console.error('Error creating student(s):', error)
      return res.status(500).json({ error: 'Failed to create student(s)' })
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
      const updated = await updateStudent(id, tenantId, body)
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
      const deleted = await deleteStudent(id, tenantId)
      if (!deleted) {
        return res.status(404).json({ error: 'Student not found' })
      }
      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting student:', error)
      return res.status(500).json({ error: 'Failed to delete student' })
    }
  }

  return methodNotAllowed(res)
}
