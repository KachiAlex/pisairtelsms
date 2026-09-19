import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from './_lib/db.js'
import { detectConflicts } from './_lib/conflicts.js'
import { requireRole } from '../../_lib/auth-middleware.js'

function parseBody(req: ApiRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const { method, query } = req
  const termId = (query.termId as string | undefined) || (parseBody(req)?.termId as string | undefined)

  try {
    // GET /publish?termId= — publish state + live conflict check
    if (method === 'GET') {
      const counts = await sql`
        SELECT status, COUNT(*)::int AS n
        FROM timetable_class_schedules
        WHERE tenant_id = ${tenantId}
          AND (${termId ?? null}::text IS NULL OR term_id = ${termId ?? null})
        GROUP BY status`
      const published = counts.rows.find((r: any) => r.status === 'published')?.n ?? 0
      const drafts = counts.rows.find((r: any) => r.status === 'draft')?.n ?? 0
      const lastPub = await sql`
        SELECT MAX(published_at) AS last_at, MAX(published_by) AS last_by
        FROM timetable_class_schedules
        WHERE tenant_id = ${tenantId} AND status = 'published'
          AND (${termId ?? null}::text IS NULL OR term_id = ${termId ?? null})`

      const detected = await detectConflicts(tenantId, termId)
      const highConflicts = detected.filter(c => c.severity === 'high').length

      return res.status(200).json({
        data: {
          publishedCount: published,
          draftCount: drafts,
          lastPublishedAt: lastPub.rows[0]?.last_at ?? null,
          lastPublishedBy: lastPub.rows[0]?.last_by ?? null,
          conflicts: detected,
          highConflicts,
          canPublish: highConflicts === 0 && drafts > 0,
        },
      })
    }

    // POST /publish {termId, action: 'publish'|'unpublish', scheduleIds?}
    if (method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })

      const { termId: bodyTermId, action = 'publish', scheduleIds } = body as {
        termId?: string
        action?: 'publish' | 'unpublish'
        scheduleIds?: string[]
      }
      const effectiveTermId = bodyTermId || termId
      if (!effectiveTermId) return res.status(400).json({ error: 'termId is required' })

      const publishedBy = (decoded as any).name || (decoded as any).email || 'admin'

      if (action === 'unpublish') {
        await sql`
          UPDATE timetable_class_schedules
          SET status = 'draft', published_at = NULL, published_by = NULL, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND term_id = ${effectiveTermId}
            AND (${!scheduleIds?.length}::boolean OR id = ANY(${scheduleIds ?? []}::text[]))`
        return res.status(200).json({ data: { success: true, action: 'unpublished' } })
      }

      // Publish: block on high-severity live conflicts (teacher double-booked)
      const detected = await detectConflicts(tenantId, effectiveTermId)
      const blocking = detected.filter(c => c.severity === 'high')
      if (blocking.length > 0) {
        return res.status(400).json({
          error: `Cannot publish: ${blocking.length} teacher conflict(s) must be resolved first`,
          conflicts: detected,
        })
      }

      const result = await sql`
        UPDATE timetable_class_schedules
        SET status = 'published', published_at = NOW(), published_by = ${publishedBy}, updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND term_id = ${effectiveTermId}
          AND (${!scheduleIds?.length}::boolean OR id = ANY(${scheduleIds ?? []}::text[]))`
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: 'No schedules found for this term' })
      }
      return res.status(200).json({ data: { success: true, action: 'published', count: result.rowCount } })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Publish API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
