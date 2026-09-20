import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { resolveTenantFromRequest, resolveShortCode, rootDomainFor } from '../_lib/tenant-resolver.js'

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
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')

  try {
    // Path-based school URLs (/apply/<slug>, /inquiry/<slug>) pass the slug
    // explicitly — resolve it through the same alias/short-code registry.
    const slugParam = String(req.query?.slug || '').trim().toLowerCase()
    let tenantId: string | null
    let resolvedSlug: string | null
    if (slugParam) {
      const found = await resolveShortCode(slugParam)
      tenantId = found?.tenantId ?? null
      resolvedSlug = slugParam
    } else {
      const resolved = await resolveTenantFromRequest(req)
      tenantId = resolved.tenantId
      resolvedSlug = resolved.slug
    }

    // Unknown subdomain under one of our tenant roots = likely a typo or an
    // unprovisioned school; the SPA renders a "school not found" page with
    // onboarding CTAs instead of a confusing 404. Any host that resolved to a
    // slug but no tenant counts — including via the edge-injected header path
    // (where rootDomain is not set).
    if (!tenantId) {
      const notFound = resolvedSlug !== null
      return res.status(200).json({
        notFound,
        subdomain: resolvedSlug,
        isApex: !notFound,
        tenant: null,
      })
    }

    const row = await sql`
      SELECT id::text, name, subdomain, logo_url, settings
      FROM tenants
      WHERE id::text = ${tenantId}
      LIMIT 1
    `
    const t = row.rows[0]
    if (!t) {
      return res.status(200).json({ notFound: true, subdomain: resolvedSlug, isApex: false, tenant: null })
    }

    const settings = parseSettings(t.settings)
    const subdomain = t.subdomain || resolvedSlug || ''
    const root = rootDomainFor()
    const application = (settings.customApplicationUrl as string)
      || (subdomain ? `https://${root}/apply/${subdomain}` : `https://${root}/apply`)
    const inquiry = (settings.customInquiryUrl as string)
      || (subdomain ? `https://${root}/inquiry/${subdomain}` : `https://${root}/inquiry`)

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