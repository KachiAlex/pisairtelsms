import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { hashPasswordSecurely } from '../_lib/password-hashing.js'
import { logAuditEvent, extractAuditContext } from '../_lib/audit-logger.js'

function parseBody(req: ApiRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return
  const tenantId = decoded.tenantId || 'default-tenant'

  // GET /api/tenant/parents — list parent accounts for the tenant
  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT p.id::text, p.name, p.email, p.phone, p.created_at,
               (p.password_hash IS NOT NULL) AS has_password,
               COALESCE(json_agg(ps.student_id) FILTER (WHERE ps.student_id IS NOT NULL), '[]') AS children_ids
        FROM parents p
        LEFT JOIN parent_students ps ON ps.parent_id = p.id
        WHERE p.tenant_id = ${tenantId}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error fetching parents:', error)
      return res.status(500).json({ error: 'Failed to fetch parents' })
    }
  }

  // PUT /api/tenant/parents?id=X&action=reset-password — issue a fresh
  // temporary portal password; returned once and emailed to the parent.
  if (req.method === 'PUT' && req.query.action === 'reset-password') {
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Parent ID is required as query param' })
    }
    try {
      const parent = await sql<{ id: string; name: string; email: string }>`
        SELECT id::text, name, email FROM parents WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `
      const row = parent.rows[0]
      if (!row) return res.status(404).json({ error: 'Parent not found' })

      const tempPassword = `${(row.name || 'parent').split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'parent'}@${Date.now().toString().slice(-4)}`
      const passwordHash = await hashPasswordSecurely(tempPassword)
      await sql`UPDATE parents SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenantId}`

      try {
        const { sendEmail } = await import('../_lib/email.js')
        const { emailTemplates } = await import('../_lib/email-templates.js')
        const loginUrl = process.env.PARENT_PORTAL_URL || `${process.env.APP_URL || 'http://localhost:3000'}/parent-login`
        const { html, subject } = emailTemplates.parentCredentials({
          name: row.name, email: row.email, password: tempPassword, loginUrl,
        })
        await sendEmail({ to: row.email, subject, html })
      } catch (emailErr) {
        console.error('Parent credentials email failed:', emailErr)
      }

      await logAuditEvent('password_reset', {
        ...extractAuditContext(req),
        tenantId,
        userId: decoded.userId || decoded.staffId,
        role: decoded.role,
        resource: `parent:${id}`,
      })
      return res.status(200).json({ data: { name: row.name, email: row.email, tempPassword } })
    } catch (error) {
      console.error('Error resetting parent password:', error)
      return res.status(500).json({ error: 'Failed to reset password' })
    }
  }

  res.setHeader('Allow', 'GET,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
