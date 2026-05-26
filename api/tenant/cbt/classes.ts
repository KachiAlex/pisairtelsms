import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../_lib/auth-middleware'
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} from './_lib/classes.js'
import { initializeDatabase } from './_lib/db.js'

/**
 * Classes API Endpoint
 * Handles CRUD operations for classes
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  let tenantId = req.headers['x-tenant-id'] as string

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }

  try {
    initializeDatabase()
  } catch (error: any) {
    return res.status(503).json({ success: false, error: 'Database initialization failed: ' + error.message })
  }

  const { id } = req.query

  // GET /api/tenant/cbt/classes - Get all classes
  if (req.method === 'GET') {
    try {
      const classes = await getClasses(tenantId)
      return res.status(200).json({ success: true, data: classes })
    } catch (error: any) {
      console.error('Error fetching classes:', error)
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch classes' })
    }
  }

  // POST /api/tenant/cbt/classes - Create a new class
  if (req.method === 'POST') {
    try {
      let body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }

      if (!body || !body.name || !body.arm) {
        return res.status(400).json({ 
          success: false, 
          error: 'Request body must include name and arm' 
        })
      }

      const newClass = await createClass(tenantId, body.name, body.arm, body.level || '')
      return res.status(201).json({ success: true, data: newClass })
    } catch (error: any) {
      console.error('Error creating class:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to create class' })
    }
  }

  // PUT /api/tenant/cbt/classes?id={id} - Update a class
  if (req.method === 'PUT') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Class id is required' })
    }

    try {
      let body = req.body
      if (typeof body === 'string') {
        try { body = JSON.parse(body) } catch { body = null }
      }

      const updated = await updateClass(tenantId, id, body || {})
      return res.status(200).json({ success: true, data: updated })
    } catch (error: any) {
      console.error('Error updating class:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to update class' })
    }
  }

  // DELETE /api/tenant/cbt/classes?id={id} - Delete a class
  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Class id is required' })
    }

    try {
      await deleteClass(tenantId, id)
      return res.status(200).json({ success: true, message: 'Class deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting class:', error)
      return res.status(400).json({ success: false, error: error.message || 'Failed to delete class' })
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
