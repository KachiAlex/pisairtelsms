import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

// Auth/security event types that belong to the Access surface; everything else
// in security_events is Security.
const ACCESS_EVENTS = [
  'login_success', 'login_failure', 'logout', 'session_terminated',
  'password_change', 'password_reset',
]

/**
 * GET /api/tenant/audit-logs
 *
 * Normalizes the three tenant-scoped audit sources into one feed:
 *  - security_events           → Access/Security (auth, sessions, security ops)
 *  - audit_logs                → Examinations   (CBT exam audit trail)
 *  - academic_structure_audit  → Academics      (class/subject/student changes)
 *
 * Supports ?surface=, ?search=, ?limit=, ?offset= server-side.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(403).json({ error: 'No tenant associated with this account' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { surface, search, limit = '50', offset = '0' } = req.query
    const surfaceFilter = typeof surface === 'string' && surface !== 'all' ? surface : null
    const searchFilter = typeof search === 'string' && search.trim() ? `%${search.trim()}%` : null
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50))
    const offsetNum = Math.max(0, Number(offset) || 0)

    const result = await sql`
      SELECT * FROM (
        SELECT
          se.id::text AS id,
          se.event_type AS action,
          CASE WHEN se.event_type = ANY(${ACCESS_EVENTS}::text[]) THEN 'Access' ELSE 'Security' END AS surface,
          COALESCE(se.description, '') AS meta,
          CASE se.severity
            WHEN 'critical' THEN 'critical'
            WHEN 'high' THEN 'critical'
            WHEN 'medium' THEN 'warning'
            ELSE 'info'
          END AS severity,
          COALESCE(s.name, st.name, se.user_id, 'System') AS actor,
          se.created_at AS time
        FROM security_events se
        LEFT JOIN staff s ON s.id = se.user_id AND s.tenant_id::text = se.tenant_id
        LEFT JOIN students st ON st.id = se.user_id AND st.tenant_id::text = se.tenant_id
        WHERE se.tenant_id = ${tenantId}

        UNION ALL

        SELECT
          al.id::text,
          al.action || ' ' || al.entity_type,
          'Examinations',
          COALESCE(al.changes::text, ''),
          'info',
          COALESCE(s2.name, st2.name, al.user_id, 'System'),
          al.created_at
        FROM audit_logs al
        LEFT JOIN staff s2 ON s2.id = al.user_id AND s2.tenant_id::text = al.tenant_id::text
        LEFT JOIN students st2 ON st2.id = al.user_id AND st2.tenant_id::text = al.tenant_id::text
        WHERE al.tenant_id::text = ${tenantId}

        UNION ALL

        SELECT
          aa.id::text,
          aa.action || ' ' || aa.entity_type,
          'Academics',
          COALESCE(aa.new_values::text, aa.old_values::text, ''),
          'info',
          COALESCE(aa.actor_name, aa.actor_id, 'System'),
          aa.created_at
        FROM academic_structure_audit aa
        WHERE aa.tenant_id = ${tenantId}
      ) t
      WHERE (${surfaceFilter}::text IS NULL OR t.surface = ${surfaceFilter})
        AND (${searchFilter}::text IS NULL OR t.actor ILIKE ${searchFilter} OR t.action ILIKE ${searchFilter} OR t.meta ILIKE ${searchFilter})
      ORDER BY t.time DESC
      LIMIT ${limitNum}
      OFFSET ${offsetNum}
    `

    return res.status(200).json({ data: result.rows })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
}
