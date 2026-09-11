import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'
import { rootDomainFor } from '../_lib/tenant-resolver.js'

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
const DOMAIN_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9-]+)+$/

interface TenantDomainPayload {
  subdomain?: string
  customApplicationUrl?: string
  customInquiryUrl?: string
  domain?: string
  enableCustomDomain?: boolean
  enableSubdomain?: boolean
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

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

function buildResponse(
  t: { id: string; name: string; subdomain: string | null; settings: Record<string, unknown> },
  aliases: { alias: string; kind: string; is_primary: boolean; status: string }[]
): { domainConfig: Record<string, unknown> } {
  const customDomains = aliases.filter(a => a.kind === 'custom_domain').map(a => a.alias)
  const primaryDomain = customDomains[0]
  const subdomain = t.subdomain
  const application = (t.settings.customApplicationUrl as string) || `https://${subdomain}.${rootDomainFor()}`
  const inquiry = (t.settings.customInquiryUrl as string) || `${application}/inquiry`

  return {
    domainConfig: {
      enableCustomDomain: !!t.settings.enableCustomDomain,
      enableSubdomain: !!t.settings.enableSubdomain,
      customApplicationUrl: t.settings.customApplicationUrl || undefined,
      customInquiryUrl: t.settings.customInquiryUrl || undefined,
      domain: primaryDomain,
      subdomain,
      updatedAt: t.settings.updatedAt || new Date().toISOString(),
      aliases,
      urls: { application, inquiry },
    },
  }
}

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest): Partial<TenantDomainPayload> | null {
  const raw = req.body
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Partial<TenantDomainPayload>
    } catch {
      return null
    }
  }
  return raw as Partial<TenantDomainPayload>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return
  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(403).json({ error: 'Forbidden: No tenant associated with this account' })
  }

  if (req.method === 'GET') {
    try {
      const row = await sql`SELECT id::text, name, subdomain, settings FROM tenants WHERE id::text = ${tenantId} LIMIT 1`
      const t = row.rows[0]
      if (!t) return res.status(404).json({ error: 'Tenant not found' })

      // Degrade gracefully if the tenant_aliases migration hasn't run yet.
      let aliases: { alias: string; kind: string; is_primary: boolean; status: string }[] = []
      try {
        const res = await sql`
          SELECT alias, kind, is_primary, status FROM tenant_aliases
          WHERE tenant_id = ${tenantId} AND status = 'active' ORDER BY is_primary DESC, kind, alias
        `
        aliases = res.rows as { alias: string; kind: string; is_primary: boolean; status: string }[]
      } catch (aliasError) {
        console.warn('tenant_aliases unavailable, returning empty alias list:', (aliasError as Error)?.message)
      }
      return res.status(200).json(buildResponse(
        { id: t.id, name: t.name, subdomain: t.subdomain, settings: parseSettings(t.settings) },
        aliases
      ))
    } catch (error) {
      console.error('Error fetching tenant domain config:', error)
      return res.status(500).json({ error: 'Failed to fetch tenant domain configuration' })
    }
  }

  if (req.method === 'PUT') {
    return handlePut(tenantId, req, res)
  }

  return methodNotAllowed(res)
}

async function handlePut(tenantId: string, req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req)
  if (!body) {
    return res.status(400).json({ error: 'A JSON body is required.' })
  }

  const next: { subdomain?: string; customApplicationUrl?: string | null; customInquiryUrl?: string | null; domain?: string } = {}

  // --- Validate & prepare subdomain --------------------------------
  if (body.subdomain !== undefined) {
    const subdomain = String(body.subdomain).trim().toLowerCase()
    if (!SUBDOMAIN_RE.test(subdomain)) {
      return res.status(400).json({ error: 'Invalid subdomain. Use lowercase letters, numbers and hyphens only.' })
    }
    if (subdomain === 'www' || subdomain === 'api' || subdomain === 'admin') {
      return res.status(400).json({ error: 'This subdomain is reserved.' })
    }
    const clash = await sql`
      SELECT tenant_id FROM tenant_aliases WHERE alias = ${subdomain} AND tenant_id <> ${tenantId} AND status = 'active'
      UNION
      SELECT id::text AS tenant_id FROM tenants WHERE LOWER(subdomain) = ${subdomain} AND id::text <> ${tenantId}
      LIMIT 1
    `
    if (clash.rows[0]) {
      return res.status(409).json({ error: 'Subdomain already taken by another school' })
    }
    next.subdomain = subdomain
  }

  // --- Validate & prepare custom URLs -------------------------------
  // Empty string means "clear the override" — persisted as explicit null so
  // the URL computation falls back to https://<subdomain>.<root>.
  if (body.customApplicationUrl !== undefined) {
    if (body.customApplicationUrl && !validateUrl(body.customApplicationUrl)) {
      return res.status(400).json({ error: 'Invalid application URL format' })
    }
    next.customApplicationUrl = body.customApplicationUrl || null
  }
  if (body.customInquiryUrl !== undefined) {
    if (body.customInquiryUrl && !validateUrl(body.customInquiryUrl)) {
      return res.status(400).json({ error: 'Invalid inquiry URL format' })
    }
    next.customInquiryUrl = body.customInquiryUrl || null
  }

  // --- Validate & prepare custom domain -----------------------------
  let customDomain: string | undefined
  if (body.domain !== undefined) {
    const domain = String(body.domain).trim().toLowerCase()
    if (domain && !DOMAIN_RE.test(domain)) {
      return res.status(400).json({ error: 'Invalid custom domain format' })
    }
    if (domain) {
      const clash = await sql`
        SELECT tenant_id FROM tenant_aliases WHERE alias = ${domain} AND tenant_id <> ${tenantId} AND status = 'active'
        LIMIT 1
      `
      if (clash.rows[0]) {
        return res.status(409).json({ error: 'Custom domain already in use by another school' })
      }
      customDomain = domain
    }
  }

  try {
    // --- Persist settings + subdomain on the tenants row -----------------
    // Only provided keys are patched (JSON.stringify drops undefined values);
    // explicit nulls clear an override so URL computation falls back to the
    // https://<subdomain>.<root> default.
    const settings = {
      customApplicationUrl: next.customApplicationUrl,
      customInquiryUrl: next.customInquiryUrl,
      enableCustomDomain: body.enableCustomDomain,
      enableSubdomain: body.enableSubdomain,
      updatedAt: new Date().toISOString(),
    }
    await sql`
      UPDATE tenants
      SET settings = settings || ${JSON.stringify(settings)}::jsonb,
          subdomain = COALESCE(${next.subdomain ?? null}, subdomain)
      WHERE id::text = ${tenantId}
    `

    // --- Upsert primary subdomain alias -----------------------------------
    if (next.subdomain) {
      await sql`UPDATE tenant_aliases SET is_primary = FALSE, status = 'disabled' WHERE tenant_id = ${tenantId} AND kind = 'subdomain'`
      await sql`
        INSERT INTO tenant_aliases (id, alias, tenant_id, kind, is_primary, status)
        VALUES ('alias_' || ${next.subdomain}, ${next.subdomain}, ${tenantId}, 'subdomain', TRUE, 'active')
        ON CONFLICT (alias) DO UPDATE
          SET status = COALESCE(tenant_aliases.status, 'active'),
              is_primary = TRUE,
              updated_at = NOW()
      `
    }

    // --- Upsert / remove custom domain alias ------------------------------
    if (customDomain !== undefined) {
      await sql`DELETE FROM tenant_aliases WHERE tenant_id = ${tenantId} AND kind = 'custom_domain'`
      if (customDomain) {
        await sql`
          INSERT INTO tenant_aliases (id, alias, tenant_id, kind, is_primary, status)
          VALUES ('custom_' || ${customDomain}, ${customDomain}, ${tenantId}, 'custom_domain', FALSE, 'active')
          ON CONFLICT (alias) DO UPDATE
            SET tenant_id = EXCLUDED.tenant_id, status = 'active', updated_at = NOW()
        `
      }
    }

    // --- Return the refreshed configuration ---------------------------------
    const row = await sql`SELECT id::text, name, subdomain, settings FROM tenants WHERE id::text = ${tenantId} LIMIT 1`
    const t = row.rows[0]
    const aliases = await sql`
      SELECT alias, kind, is_primary, status FROM tenant_aliases
      WHERE tenant_id = ${tenantId} AND status = 'active' ORDER BY is_primary DESC, kind, alias
    `
    return res.status(200).json(buildResponse(
      { id: t.id, name: t.name, subdomain: t.subdomain, settings: parseSettings(t.settings) },
      aliases.rows as { alias: string; kind: string; is_primary: boolean; status: string }[]
    ))
  } catch (error) {
    console.error('Error updating tenant domain config:', error)
    return res.status(500).json({ error: 'Failed to update tenant domain configuration' })
  }
}