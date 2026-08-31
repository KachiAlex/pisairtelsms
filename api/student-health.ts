import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMigrations, initializeDatabase } from './tenant/cbt/_lib/db.js'
import { fetchStudentHealthData, createHealthRecord } from './tenant/_lib/studentHealth.js'
import { requireRole } from './_lib/auth-middleware.js'

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
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  try {
    initializeDatabase()
    await runMigrations()
  } catch (error) {
    console.error('Database initialization error:', error)
    return res.status(500).json({ error: 'Database initialization failed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      const data = await fetchStudentHealthData(tenantId)
      return res.status(200).json(data)
    } catch (error) {
      console.error('Error fetching student health:', error)
      return res.status(500).json({ error: 'Failed to fetch student health data' })
    }
  }

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    try {
      const record = await createHealthRecord(tenantId, {
        studentName: body.studentName || body.student || '',
        recordType: body.recordType || body.type || 'screening',
        details: body.details || body.notes || body.topic || '',
        owner: body.owner || '',
        status: body.status || 'pending',
        dueDate: body.dueDate || body.due || null,
        severity: body.severity || 'Low',
        location: body.location || '',
        cohort: body.cohort || '',
      })
      return res.status(201).json(record)
    } catch (error) {
      console.error('Error creating health record:', error)
      return res.status(500).json({ error: 'Failed to create health record' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
