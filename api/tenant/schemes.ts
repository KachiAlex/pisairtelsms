import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * /api/tenant/schemes — scheme of work management.
 *
 *   GET    ?subject&class&session&term            — list topics (staff + admin)
 *   GET    ?coverage=1&subject&class&session&term — week-by-week coverage vs notes
 *   POST   {subject,class,session,term,week,topic,description?}   — admin only
 *   PUT    {id, topic?, description?, week?}                      — admin only
 *   DELETE ?id                                                   — admin only
 *
 * The scheme is the backbone that lesson_notes attach to and coverage is
 * measured against. Unique per (tenant, subject, class, session, term, week).
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return
  const tenantId = decoded.tenantId || 'default-tenant'
  const isAdmin = decoded.role === 'tenant_admin'

  try {
    if (req.method === 'GET') {
      const { subject, class: className, session, term, coverage } = req.query as Record<string, string | undefined>
      if (!subject || !className || !session || !term) {
        return res.status(400).json({ error: 'subject, class, session, and term are required' })
      }
      const topics = await sql`
        SELECT id::text, subject, class, session, term, week, topic, description
        FROM scheme_topics
        WHERE tenant_id = ${tenantId} AND subject = ${subject} AND class = ${className}
          AND session = ${session} AND term = ${term}
        ORDER BY week ASC`

      if (coverage === '1') {
        const notes = await sql`
          SELECT week, status, taught_at IS NOT NULL AS taught, COUNT(*)::int AS n
          FROM lesson_notes
          WHERE tenant_id = ${tenantId} AND subject = ${subject} AND class = ${className}
            AND session = ${session} AND term = ${term}
          GROUP BY week, status, taught_at IS NOT NULL`
        return res.status(200).json({ data: { topics: topics.rows, notes: notes.rows } })
      }
      return res.status(200).json({ data: topics.rows })
    }

    if (req.method === 'POST') {
      if (!isAdmin) return res.status(403).json({ error: 'Only admins can manage the scheme of work' })
      const { subject, class: className, session, term, week, topic, description, items } = req.body || {}
      if (!subject || !className || !session || !term) {
        return res.status(400).json({ error: 'subject, class, session, and term are required' })
      }

      // Bulk import: { items: [{ week, topic, description? }, ...] }
      if (Array.isArray(items)) {
        if (items.length === 0 || items.length > 40) {
          return res.status(400).json({ error: 'items must contain 1-40 entries' })
        }
        const bad = items.findIndex(
          (it: any) => !it.topic || !Number.isInteger(Number(it.week)) || Number(it.week) < 1 || Number(it.week) > 20
        )
        if (bad >= 0) {
          return res.status(400).json({ error: `items[${bad}]: week (1-20) and topic are required` })
        }
        let created = 0
        for (const it of items as any[]) {
          await sql`
            INSERT INTO scheme_topics (tenant_id, subject, class, session, term, week, topic, description, created_by)
            VALUES (${tenantId}, ${subject}, ${className}, ${session}, ${term}, ${Number(it.week)},
                    ${it.topic}, ${it.description || null}, ${decoded.userId || 'admin'})
            ON CONFLICT (tenant_id, subject, class, session, term, week)
            DO UPDATE SET topic = EXCLUDED.topic, description = EXCLUDED.description, updated_at = now()`
          created++
        }
        return res.status(201).json({ success: true, imported: created })
      }

      const wk = Number(week)
      if (!topic || !Number.isInteger(wk) || wk < 1 || wk > 20) {
        return res.status(400).json({ error: 'topic and week (1-20) are required' })
      }
      const r = await sql`
        INSERT INTO scheme_topics (tenant_id, subject, class, session, term, week, topic, description, created_by)
        VALUES (${tenantId}, ${subject}, ${className}, ${session}, ${term}, ${wk}, ${topic}, ${description || null}, ${decoded.userId || 'admin'})
        ON CONFLICT (tenant_id, subject, class, session, term, week)
        DO UPDATE SET topic = EXCLUDED.topic, description = EXCLUDED.description, updated_at = now()
        RETURNING id::text, subject, class, session, term, week, topic, description`
      return res.status(201).json({ data: r.rows[0] })
    }

    if (req.method === 'PUT') {
      if (!isAdmin) return res.status(403).json({ error: 'Only admins can manage the scheme of work' })
      const { id, topic, description, week } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id is required' })
      const wk = week === undefined ? null : Number(week)
      if (wk !== null && (!Number.isInteger(wk) || wk < 1 || wk > 20)) {
        return res.status(400).json({ error: 'week must be 1-20' })
      }
      const r = await sql`
        UPDATE scheme_topics
        SET topic = COALESCE(${topic ?? null}, topic),
            description = COALESCE(${description ?? null}, description),
            week = COALESCE(${wk}, week),
            updated_at = now()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id::text, week, topic, description`
      if (!r.rows[0]) return res.status(404).json({ error: 'Topic not found' })
      return res.status(200).json({ data: r.rows[0] })
    }

    if (req.method === 'DELETE') {
      if (!isAdmin) return res.status(403).json({ error: 'Only admins can manage the scheme of work' })
      const { id } = req.query as { id?: string }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const r = await sql`DELETE FROM scheme_topics WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING id`
      if (!r.rows[0]) return res.status(404).json({ error: 'Topic not found' })
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Schemes error:', error)
    return res.status(500).json({ error: 'Failed to process scheme request' })
  }
}
