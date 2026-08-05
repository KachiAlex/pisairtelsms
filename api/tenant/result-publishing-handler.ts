import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'
import { publishCompiledResults } from './_lib/results.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  if (!tenantId) return res.status(401).json({ success: false, error: 'Tenant context required' })

  const action = req.query['action'] as string
  const academicSession = req.query['academicSession'] as string | undefined
  const term = req.query['term'] as string | undefined
  const className = req.query['class'] as string | undefined

  try {
    // ── Stats: summary counts by status ──────────────────────────────
    if (action === 'stats' && req.method === 'GET') {
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required' })
      }
      let result
      if (className) {
        result = await sql`
          SELECT
            COUNT(*)::int AS total,
            SUM(CASE WHEN status = 'compiled' THEN 1 ELSE 0 END)::int AS compiled,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::int AS approved,
            SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)::int AS published
          FROM compiled_results
          WHERE tenant_id = ${tenantId}
            AND academic_session = ${academicSession}
            AND term = ${term}
            AND class = ${className}
        `
      } else {
        result = await sql`
          SELECT
            COUNT(*)::int AS total,
            SUM(CASE WHEN status = 'compiled' THEN 1 ELSE 0 END)::int AS compiled,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::int AS approved,
            SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)::int AS published
          FROM compiled_results
          WHERE tenant_id = ${tenantId}
            AND academic_session = ${academicSession}
            AND term = ${term}
        `
      }
      const row = result.rows[0] || { total: 0, compiled: 0, approved: 0, published: 0 }
      return res.json({
        success: true,
        data: {
          total: row.total,
          compiled: row.compiled,
          approved: row.approved,
          published: row.published,
          studentsNotified: row.published,
        },
      })
    }

    // ── Class summaries: per-class breakdown ─────────────────────────
    if (action === 'class-summaries' && req.method === 'GET') {
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required' })
      }
      const result = await sql`
        SELECT
          class,
          COUNT(*)::int AS total,
          SUM(CASE WHEN status = 'compiled' THEN 1 ELSE 0 END)::int AS compiled,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::int AS approved,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)::int AS published,
          COUNT(DISTINCT student_id)::int AS students
        FROM compiled_results
        WHERE tenant_id = ${tenantId}
          AND academic_session = ${academicSession}
          AND term = ${term}
        GROUP BY class
        ORDER BY class
      `
      return res.json({ success: true, data: result.rows })
    }

    // ── Published results: list of published results ─────────────────
    if (action === 'published-list' && req.method === 'GET') {
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required' })
      }
      let result
      if (className) {
        result = await sql`
          SELECT DISTINCT class, student_id,
            MAX(compiled_at) AS published_at,
            COUNT(*)::int AS subjects,
            MAX(overall_total) AS overall_total,
            MAX(overall_average) AS overall_average,
            MAX(class_position) AS class_position,
            MAX(attendance_percent) AS attendance_percent
          FROM compiled_results
          WHERE tenant_id = ${tenantId}
            AND academic_session = ${academicSession}
            AND term = ${term}
            AND class = ${className}
            AND status = 'published'
          GROUP BY class, student_id
          ORDER BY class, class_position
        `
      } else {
        result = await sql`
          SELECT DISTINCT class, student_id,
            MAX(compiled_at) AS published_at,
            COUNT(*)::int AS subjects,
            MAX(overall_total) AS overall_total,
            MAX(overall_average) AS overall_average,
            MAX(class_position) AS class_position,
            MAX(attendance_percent) AS attendance_percent
          FROM compiled_results
          WHERE tenant_id = ${tenantId}
            AND academic_session = ${academicSession}
            AND term = ${term}
            AND status = 'published'
          GROUP BY class, student_id
          ORDER BY class, class_position
        `
      }
      return res.json({ success: true, data: result.rows })
    }

    // ── Publish: publish approved results ────────────────────────────
    if (action === 'publish' && req.method === 'POST') {
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required' })
      }
      const published = await publishCompiledResults(
        tenantId,
        academicSession,
        term,
        className || undefined
      )
      return res.json({
        success: true,
        published,
        message: `${published} result(s) published successfully. Students and parents can now view results.`,
      })
    }

    // ── Unpublish: revert published results back to approved ─────────
    if (action === 'unpublish' && req.method === 'POST') {
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required' })
      }
      let result
      if (className) {
        result = await sql`
          UPDATE compiled_results
          SET status = 'approved', compiled_at = NOW()
          WHERE tenant_id = ${tenantId}
            AND academic_session = ${academicSession}
            AND term = ${term}
            AND class = ${className}
            AND status = 'published'
          RETURNING id
        `
      } else {
        result = await sql`
          UPDATE compiled_results
          SET status = 'approved', compiled_at = NOW()
          WHERE tenant_id = ${tenantId}
            AND academic_session = ${academicSession}
            AND term = ${term}
            AND status = 'published'
          RETURNING id
        `
      }
      return res.json({
        success: true,
        unpublished: result.rows.length,
        message: `${result.rows.length} result(s) reverted to approved status.`,
      })
    }

    return res.status(404).json({ success: false, error: 'Not found' })
  } catch (error) {
    console.error('result-publishing-handler error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
