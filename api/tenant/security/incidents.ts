import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { requireRole } from '../../_lib/auth-middleware.js'

const VALID_STATUSES = ['Active', 'Triage', 'Investigating', 'Resolved', 'Closed']
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low']

/**
 * /api/tenant/security/incidents
 * GET    ?status=&severity= — list security incidents (security_events) for this tenant
 * POST   — report a manual incident
 * PUT    { id, status?, assignee?, resolutionNotes? } — triage/assign/resolve
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(401).json({ success: false, error: 'Tenant context required' })
  }

  try {
    if (req.method === 'GET') {
      const { status, severity } = req.query as { status?: string; severity?: string }
      const rows = await sql`
        SELECT e.id::text, e.event_type, e.severity, e.description, e.status, e.assignee,
               e.resolution_notes, e.resolved_at, e.created_at,
               COALESCE(s.name, e.user_id::text, 'System') AS actor
        FROM security_events e
        LEFT JOIN staff s ON s.id::text = e.user_id::text AND s.tenant_id = e.tenant_id
        WHERE e.tenant_id = ${tenantId}
          AND (${status ?? null}::text IS NULL OR e.status = ${status ?? null})
          AND (${severity ?? null}::text IS NULL OR e.severity = ${severity ?? null})
        ORDER BY e.created_at DESC
        LIMIT 200
      `
      return res.status(200).json({ success: true, incidents: rows.rows })
    }

    if (req.method === 'POST') {
      const { title, description, severity, category } = (req.body ?? {}) as {
        title?: string; description?: string; severity?: string; category?: string
      }
      if (!title?.trim()) {
        return res.status(400).json({ success: false, error: 'title is required' })
      }
      const sev = VALID_SEVERITIES.includes((severity ?? '').toLowerCase()) ? severity!.toLowerCase() : 'medium'
      const eventType = category?.trim() ? `manual_${category.trim().toLowerCase()}` : 'manual_report'
      const r = await sql`
        INSERT INTO security_events (id, tenant_id, user_id, event_type, severity, description, status)
        VALUES (${`inc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`}, ${tenantId}, ${decoded.userId ?? null}, ${eventType}, ${sev},
                ${`${title.trim()} — ${(description ?? '').trim()}`.replace(/ —\s*$/, '')}, 'Active')
        RETURNING id::text, created_at
      `
      return res.status(201).json({ success: true, incident: r.rows[0] })
    }

    if (req.method === 'PUT') {
      const { id, status, assignee, resolutionNotes } = (req.body ?? {}) as {
        id?: string; status?: string; assignee?: string; resolutionNotes?: string
      }
      if (!id) return res.status(400).json({ success: false, error: 'id is required' })
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
      }
      const resolved = status === 'Resolved' || status === 'Closed'
      const r = await sql`
        UPDATE security_events
        SET status = COALESCE(${status ?? null}, status),
            assignee = COALESCE(${assignee ?? null}, assignee),
            resolution_notes = COALESCE(${resolutionNotes ?? null}, resolution_notes),
            resolved_at = CASE WHEN ${resolved} THEN NOW() ELSE resolved_at END
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id::text, status, assignee, resolved_at
      `
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Incident not found' })
      }
      return res.status(200).json({ success: true, incident: r.rows[0] })
    }

    res.setHeader('Allow', 'GET, POST, PUT')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('Security incidents error:', error)
    return res.status(500).json({ success: false, error: 'Failed to process incidents request' })
  }
}
