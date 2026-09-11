import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { resolveTenantFromRequest, rootDomainFor } from '../_lib/tenant-resolver.js'

function parseSettings(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
}

/**
 * GET /api/public/meta
 * Public school identity card resolved from the Host header — powers the
 * brand-aware /apply, /inquiry, login pages and the "school not found"
 * fallback. No authentication required.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')

  try {
    const resolved = await resolveTenantFromRequest(req)

    // Unknown subdomain under one of our tenant roots = likely a typo or an
    // unprovisioned school; the SPA renders a "school not found" page with
    // onboarding CTAs instead of a confusing 404.
    if (!resolved.tenantId) {
      const notFound = resolved.slug !== null && resolved.rootDomain !== null
      return res.status(200).json({
        notFound,
        subdomain: resolved.slug,
        isApex: resolved.rootDomain !== null && resolved.slug === null,
        tenant: null,
      })
    }

    const row = await sql`
      SELECT id::text, name, subdomain, logo_url, settings
      FROM tenants
      WHERE id::text = ${resolved.tenantId}
      LIMIT 1
    `
    const t = row.rows[0]
    if (!t) {
      return res.status(200).json({ notFound: true, subdomain: resolved.slug, isApex: false, tenant: null })
    }

    const settings = parseSettings(t.settings)
    const subdomain = t.subdomain || resolved.slug || ''
    const application = (settings.customApplicationUrl as string) || `https://${subdomain}.${rootDomainFor()}`
    const inquiry = (settings.customInquiryUrl as string) || `${application}/inquiry`

    return res.status(200).json({
      notFound: false,
      subdomain,
      isApex: false,
      tenant: {
        id: t.id,
        name: t.name,
        logoUrl: t.logo_url || settings.logo || null,
        primaryColor: settings.primaryColor || null,
        applicationUrl: application,
        inquiryUrl: inquiry,
      },
    })
  } catch (error) {
    console.error('Error resolving public school meta:', error)
    return res.status(500).json({ error: 'Failed to resolve school' })
  }
}