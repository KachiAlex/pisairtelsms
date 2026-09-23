import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'
import { verifyParentChildAccess } from '../_lib/verify-child.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const decoded = await requireRole(req, res, ['parent'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const { childId } = req.query as { childId: string }

  if (!await verifyParentChildAccess(decoded.parentId, childId, tenantId)) {
    return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
  }

  try {
    await sql`DELETE FROM parent_students WHERE parent_id = ${decoded.parentId} AND student_id = ${childId} AND tenant_id = ${tenantId}`
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error removing child:', error)
    return res.status(500).json({ error: 'Failed to remove child' })
  }
}
