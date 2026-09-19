import type { ApiRequest, ApiResponse } from './_lib/http-types.js'
import { runMigrations, initializeDatabase } from './tenant/cbt/_lib/db.js'
import { fetchStudentDocuments, createStudentDocument, updateStudentDocumentStatus, deleteStudentDocument, fetchStudentDocumentFile } from './tenant/_lib/studentDocuments.js'
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
    const { id, download } = req.query

    // Download stored file bytes for a single document
    if (download === '1' && typeof id === 'string') {
      try {
        const file = await fetchStudentDocumentFile(id, tenantId)
        if (!file) {
          return res.status(404).json({ error: 'No file stored for this document' })
        }
        res.setHeader('Content-Type', file.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.docName)}"`)
        return res.status(200).send(file.data)
      } catch (error) {
        console.error('Error downloading student document:', error)
        return res.status(500).json({ error: 'Failed to download document' })
      }
    }

    try {
      const documents = await fetchStudentDocuments(tenantId)
      return res.status(200).json(documents)
    } catch (error) {
      console.error('Error fetching student documents:', error)
      return res.status(500).json({ error: 'Failed to fetch student documents' })
    }
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { docName, studentName, studentId, cohort, category, fileType, fileData, fileSize, mimeType, notes } = body

    if (!docName || typeof docName !== 'string') {
      return res.status(400).json({ error: 'docName is required' })
    }

    try {
      const owner = decoded.email || decoded.userId || ''
      const created = await createStudentDocument(tenantId, {
        docName,
        studentName: studentName || '',
        studentId: typeof studentId === 'string' ? studentId : undefined,
        cohort: typeof cohort === 'string' ? cohort : undefined,
        category: typeof category === 'string' ? category : undefined,
        fileType: typeof fileType === 'string' ? fileType : undefined,
        fileDataBase64: typeof fileData === 'string' ? fileData : undefined,
        fileSize: typeof fileSize === 'number' ? fileSize : undefined,
        mimeType: typeof mimeType === 'string' ? mimeType : undefined,
        notes: typeof notes === 'string' ? notes : undefined,
        owner,
        status: 'Pending review',
      })
      return res.status(201).json(created)
    } catch (error) {
      console.error('Error creating student document:', error)
      return res.status(500).json({ error: 'Failed to create student document' })
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
