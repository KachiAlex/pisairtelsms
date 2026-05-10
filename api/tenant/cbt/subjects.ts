import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSubjects,
  getSubjectNames,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from './_lib/subjects.js'
import { initializeDatabase } from './_lib/db.js'

/**
 * Subjects API Endpoint
 * Handles CRUD operations for subjects with multi-level support
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }

  try {
    initializeDatabase()
  } catch (error: any) {
    return res.status(503).json({ success: false, error: 'Database initialization failed: ' + error.message })
  }

  const { id } = req.query

  // GET /api/tenant/cbt/subjects - Get all subjects or subject names
  if (req.method === 'GET') {
    try {
      const { namesOnly } = req.query

      if (namesOnly === 'true') {
        // Return only subject names for dropdowns
        const subjectNames = await getSubjectNames(tenantId)
        return res.status(200).json({ success: true, data: subjectNames })
      }

      // Return all subjects
      const subjects = await getSubjects(tenantId)
      return res.status(200).json({ success: true, data: subjects })
    } catch (error: any) {
      console.error('Error fetching subjects:', error)
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch subjects' })
    }
  }

  // POST /api/tenant/cbt/subjects - Create a new subject
  if (req.method === 'POST') {
    // Use provided userId or generate a default one
    const createdBy = userId || 'system-user'

    try {
      const body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }

      if (!body || !body.code || !body.name || !body.levels || !Array.isArray(body.levels)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Request body must include code, name, and levels (array)' 
        })
      }

      const input = {
        code: body.code,
        name: body.name,
        levels: body.levels,
        type: body.type || 'Core',
        department: body.department || 'General',
        description: body.description,
        version: body.version,
      }

      const subject = await createSubject(tenantId, createdBy, input)
      return res.status(201).json({ success: true, data: subject })
    } catch (error: any) {
      console.error('Error creating subject:', error)
      return res.status(400).json({ 
        success: false, 
        error: error.message || 'Failed to create subject' 
      })
    }
  }

  // PUT /api/tenant/cbt/subjects?id={id} - Update a subject
  if (req.method === 'PUT') {
    const updatedBy = userId || 'system-user'

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Subject id is required' })
    }

    try {
      const body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }

      const subject = await updateSubject(tenantId, id, body)
      return res.status(200).json({ success: true, data: subject })
    } catch (error: any) {
      console.error('Error updating subject:', error)
      return res.status(400).json({ 
        success: false, 
        error: error.message || 'Failed to update subject' 
      })
    }
  }

  // DELETE /api/tenant/cbt/subjects?id={id} - Delete a subject
  if (req.method === 'DELETE') {
    const deletedBy = userId || 'system-user'

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Subject id is required' })
    }

    try {
      await deleteSubject(tenantId, id)
      return res.status(200).json({ success: true, message: 'Subject deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting subject:', error)
      return res.status(400).json({ 
        success: false, 
        error: error.message || 'Failed to delete subject' 
      })
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
