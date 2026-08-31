import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireAuth } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.sub || 'system'
  const userRole = decoded.role

  try {
    if (req.method === 'GET') {
      const { studentId } = req.query
      let result
      if (userRole === 'parent') {
        result = await sql`
          SELECT * FROM virtual_learning_consents
          WHERE parent_id = ${userId} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else if (studentId) {
        result = await sql`
          SELECT * FROM virtual_learning_consents
          WHERE student_id = ${studentId as string} AND tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else if (userRole === 'tenant_admin') {
        result = await sql`
          SELECT * FROM virtual_learning_consents
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `
      } else {
        return res.status(403).json({ error: 'Not authorized' })
      }
      return res.status(200).json({ data: result.rows })
    }

    if (req.method === 'POST') {
      const { studentId, consentType, status, notes } = req.body || {}
      if (!studentId || !consentType || !status) {
        return res.status(400).json({ error: 'studentId, consentType, and status are required' })
      }
      // Only parents or admins can set consent
      if (userRole !== 'parent' && userRole !== 'tenant_admin') {
        return res.status(403).json({ error: 'Only parents or admins can set consent' })
      }
      const parentId = userRole === 'parent' ? userId : req.body.parentId

      const result = await sql`
        INSERT INTO virtual_learning_consents (tenant_id, student_id, parent_id, consent_type, status, granted_at, denied_at, notes)
        VALUES (${tenantId}, ${studentId}, ${parentId}, ${consentType}, ${status},
          ${status === 'granted' ? new Date().toISOString() : null},
          ${status === 'denied' ? new Date().toISOString() : null},
          ${notes || null})
        ON CONFLICT (student_id, consent_type)
        DO UPDATE SET
          status = EXCLUDED.status,
          granted_at = CASE WHEN EXCLUDED.status = 'granted' THEN NOW() ELSE virtual_learning_consents.granted_at END,
          denied_at = CASE WHEN EXCLUDED.status = 'denied' THEN NOW() ELSE virtual_learning_consents.denied_at END,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `
      return res.status(200).json({ data: result.rows[0] })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[virtual-learning-consents]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
