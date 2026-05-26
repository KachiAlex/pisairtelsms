import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware'

function getTenantId(req: VercelRequest): string | null {
  return (req.headers['x-tenant-id'] as string) || (req.query['tenantId'] as string) || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(401).json({ success: false, error: 'Tenant context required' })

  const action = req.query['action'] as string

  try {
    if (action === 'release-plan' && req.method === 'GET') {
      const r = await sql`
        SELECT id, cohort, channel, release_window AS window, owner, status
        FROM result_release_plan WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 20`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'checklist' && req.method === 'GET') {
      const r = await sql`
        SELECT id, label, status, detail FROM result_readiness_checklist
        WHERE tenant_id = ${tenantId} ORDER BY sort_order ASC`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'channel-health' && req.method === 'GET') {
      const r = await sql`
        SELECT id, label, status, usage FROM result_channel_health
        WHERE tenant_id = ${tenantId} ORDER BY label ASC`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'incidents' && req.method === 'GET') {
      const r = await sql`
        SELECT id, label, severity, owner, eta FROM result_incidents
        WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 20`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'incidents' && req.method === 'POST') {
      const { label, severity, owner, eta } = req.body
      const r = await sql`
        INSERT INTO result_incidents (tenant_id, label, severity, owner, eta)
        VALUES (${tenantId}, ${label}, ${severity}, ${owner}, ${eta})
        RETURNING *`
      return res.status(201).json({ success: true, data: r.rows[0] })
    }

    if (action === 'adoption-stats' && req.method === 'GET') {
      const r = await sql`
        SELECT label, value FROM result_adoption_stats
        WHERE tenant_id = ${tenantId} ORDER BY sort_order ASC`
      return res.json({ success: true, data: r.rows })
    }

    if (action === 'stats' && req.method === 'GET') {
      const cohorts = await sql`SELECT COUNT(*)::int AS n FROM result_release_plan WHERE tenant_id = ${tenantId}`
      const channels = await sql`
        SELECT COUNT(*)::int AS total, SUM(CASE WHEN status='Operational' THEN 1 ELSE 0 END)::int AS healthy
        FROM result_channel_health WHERE tenant_id = ${tenantId}`
      return res.json({
        success: true,
        data: {
          cohortsStaged: cohorts.rows[0]?.n ?? 0,
          guardiansToNotify: null,
          channelsHealthy: channels.rows[0] ? `${channels.rows[0].healthy} / ${channels.rows[0].total}` : '0 / 0',
          nextReleaseWindow: null,
        },
      })
    }

    if (action === 'launch' && req.method === 'POST') {
      await sql`
        UPDATE result_release_plan SET status = 'Launched', launched_at = NOW()
        WHERE tenant_id = ${tenantId} AND status = 'Scheduled'`
      return res.json({ success: true, message: 'Release launched. Guardians are being notified.' })
    }

    if (action === 'pre-release' && req.method === 'POST') {
      await sql`
        INSERT INTO result_pre_release_config (tenant_id, enabled, updated_at)
        VALUES (${tenantId}, true, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET enabled = true, updated_at = NOW()`
      return res.json({ success: true, message: 'Pre-release access enabled.' })
    }

    return res.status(404).json({ success: false, error: 'Not found' })
  } catch (error) {
    console.error('result-publishing-handler error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
