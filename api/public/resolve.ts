import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { resolveShortCode, rootDomainFor } from '../_lib/tenant-resolver.js'

/**
 * GET /api/public/resolve?alias=<school-slug-or-code>[&to=inquiry|apply|app][&format=json]
 *
 * Powers the printable "/join" links and QR codes:
 *   https://scholarx.io/join/lincolnhigh-4F9K
 *
 * Browsers/QR scanners get a 302 redirect to the school's canonical URL;
 * `format=json` returns { ok, redirectTo } for the SPA.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const alias = String(req.query['alias'] || req.query['code'] || req.query['school'] || '').trim().toLowerCase()
  const to = String(req.query['to'] || 'inquiry').trim().toLowerCase()
  const format = String(req.query['format'] || '').trim().toLowerCase()

  if (!alias) {
    return res.status(400).json({ error: 'alias is required', example: '/api/public/resolve?alias=lincolnhigh' })
  }

  try {
    const found = await resolveShortCode(alias)
    if (!found) {
      if (format === 'json') return res.status(200).json({ ok: false, error: 'School not found' })
      return res.status(302).setHeader('Location', `/?school=missing`).end()
    }

    const row = await sql`
      SELECT subdomain, settings FROM tenants WHERE id::text = ${found.tenantId} LIMIT 1
    `
    const t = row.rows[0]
    const settings = t?.settings ? (typeof t.settings === 'string' ? JSON.parse(t.settings) : t.settings) : {}
    const subdomain = t?.subdomain || found.slug
    const application = (settings.customApplicationUrl as string) || `https://${subdomain}.${rootDomainFor()}`
    const inquiry = (settings.customInquiryUrl as string) || `${application}/inquiry`

    const redirectTo = to === 'apply' ? application : inquiry

    if (format === 'json') {
      return res.status(200).json({ ok: true, redirectTo, applicationUrl: application, inquiryUrl: inquiry })
    }

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res.status(302).setHeader('Location', redirectTo).end()
  } catch (error) {
    console.error('Error resolving join link:', error)
    if (format === 'json') return res.status(500).json({ ok: false, error: 'Failed to resolve' })
    return res.status(302).setHeader('Location', '/').end()
  }
}