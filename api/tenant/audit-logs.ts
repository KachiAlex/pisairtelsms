import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only admins can view audit logs
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      const { surface, search, limit = '50', offset = '0' } = req.query
      
      let query = sql`
        SELECT id, action, surface, meta, severity, actor_name as actor, 
               created_at as time
        FROM audit_logs
        WHERE tenant_id = ${tenantId}
      `

      // Note: This is a simplified version. For production ripgrep/sql tagged templates, 
      // complex dynamic filtering usually requires a different approach or multiple queries.
      // We'll stick to a basic fetch for now.
      
      const result = await sql`
        SELECT id, action, surface, meta, severity, actor_name as actor, 
               created_at as time
        FROM audit_logs
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${Number(limit)}
        OFFSET ${Number(offset)}
      `

      return res.status(200).json({ data: result.rows })
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  }

  res.setHeader('Allow', 'GET')
  return res.status(405).json({ error: 'Method not allowed' })
}
