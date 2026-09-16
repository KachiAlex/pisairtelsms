import type { ApiRequest, ApiResponse } from './_lib/http-types.js'
import { runMigrations, initializeDatabase } from './tenant/cbt/_lib/db.js'
import { fetchStudentDocuments, updateStudentDocumentStatus, deleteStudentDocument } from './tenant/_lib/studentDocuments.js'
import { requireRole } from './_lib/auth-middleware.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
      const documents = await fetchStudentDocuments(tenantId)
      return res.status(200).json(documents)
    } catch (error) {
      console.error('Error fetching student documents:', error)
      return res.status(500).json({ error: 'Failed to fetch student documents' })
    }
  }

  if (req.method === 'PUT') {
    const { id, status } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Document ID is required' })
    }
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'status field is required' })
    }

    try {
      const updated = await updateStudentDocumentStatus(id, tenantId, status)
      if (!updated) {
        return res.status(404).json({ error: 'Document not found' })
      }
      return res.status(200).json(updated)
    } catch (error) {
      console.error('Error updating student document:', error)
      return res.status(500).json({ error: 'Failed to update student document' })
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Document ID is required' })
    }

    try {
      const deleted = await deleteStudentDocument(id, tenantId)
      if (!deleted) {
        return res.status(404).json({ error: 'Document not found' })
      }
      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting student document:', error)
      return res.status(500).json({ error: 'Failed to delete student document' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
