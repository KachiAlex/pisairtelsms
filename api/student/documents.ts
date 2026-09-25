import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * /api/student/documents
 * GET — the student's own uploaded documents (metadata) and issued certificates.
 *       ?id=&download=1 streams the stored file bytes for a document the
 *       student owns.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student'])
  if (!decoded) return
  const studentId = decoded.studentId || decoded.userId
  const tenantId = decoded.tenantId || 'default-tenant'
  if (!studentId) return res.status(401).json({ error: 'Invalid token payload' })

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id, download } = req.query

    if (download === '1' && typeof id === 'string') {
      const file = await sql`
        SELECT doc_name, mime_type, file_data
        FROM student_documents
        WHERE id = ${id} AND student_id = ${studentId} AND tenant_id = ${tenantId}
        LIMIT 1
      `.catch(() => ({ rows: [] as any[] }))
      const row = file.rows[0]
      if (!row || !row.file_data) {
        return res.status(404).json({ error: 'No file stored for this document' })
      }
      res.setHeader('Content-Type', row.mime_type || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.doc_name)}"`)
      const buf = Buffer.isBuffer(row.file_data) ? row.file_data : Buffer.from(row.file_data, 'base64')
      return res.status(200).send(buf)
    }

    const [docs, certs] = await Promise.all([
      sql`
        SELECT id, doc_name, category, status, file_type, uploaded_at::text AS uploaded_at,
               last_updated::text AS last_updated, (file_data IS NOT NULL) AS has_file
        FROM student_documents
        WHERE student_id = ${studentId} AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `.catch(() => ({ rows: [] as any[] })),
      sql`
        SELECT id::text, certificate_code, issued_at::text AS issued_at, revoked
        FROM certificate_issuances
        WHERE student_id = ${studentId} AND tenant_id = ${tenantId}
        ORDER BY issued_at DESC
      `.catch(() => ({ rows: [] as any[] })),
    ])

    return res.status(200).json({
      documents: docs.rows.map(r => ({
        id: r.id,
        name: r.doc_name,
        category: r.category,
        status: r.status,
        fileType: r.file_type,
        uploadedAt: r.uploaded_at,
        updatedAt: r.last_updated,
        hasFile: r.has_file,
      })),
      certificates: certs.rows.map(r => ({
        id: r.id,
        code: r.certificate_code,
        issuedAt: r.issued_at,
        status: r.revoked ? 'revoked' : 'valid',
        verifyUrl: `/verify-certificate?code=${encodeURIComponent(r.certificate_code)}`,
      })),
    })
  } catch (error) {
    console.error('Error fetching student documents:', error)
    return res.status(500).json({ error: 'Failed to fetch documents' })
  }
}
