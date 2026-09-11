/**
 * Tenant URL resolver (per-school application & inquiry URLs).
 *
 * Resolves the requesting school from the edge/Host headers instead of
 * trusting any client-supplied tenant id:
 *
 *   1. `x-tenant-slug`  -> injected by our own nginx wildcard server block
 *                          (only honoured when TRUST_X_TENANT_SLUG=true —
 *                          it is the VPS-only deployment marker).
 *   2. Host header      -> `lincolnhigh.<root-domain>` extracts the slug;
 *                          any exact alias (custom domain) is also matched.
 *   3. Fallback         -> `tenants.subdomain` when the tenant_aliases table
 *                          is not yet migrated (graceful degradation).
 *
 * All DB lookups are cached in-process with a short TTL so the hot path is a
 * hash-map hit, not a query.
 */
import { sql } from '@vercel/postgres'

/** Comma-separated root domains that carry `{slug}.<root>` school hosts. */
const ROOT_DOMAINS: string[] = (process.env.TENANT_ROOT_DOMAINS || 'pisairtelsms.com')
  .split(',')
  .map(d => d.trim().toLowerCase().replace(/^\.+/, ''))
  .filter(Boolean)

export interface ResolvedTenant {
  tenantId: string | null
  /** Subdomain label (only set when the host was a `{slug}.<root>` host). */
  slug: string | null
  host: string
  rootDomain: string | null
  matchedVia: 'x-tenant-slug' | 'alias-subdomain' | 'alias-custom' | 'none'
}

interface AliasRow {
  tenant_id: string
  kind: string
  is_primary: boolean
  status: string
}

const TTL_MS = Math.max(1000, Number(process.env.TENANT_ALIAS_CACHE_TTL_MS || 60_000))
const aliasCache = new Map<string, { tenantId: string | null; expiresAt: number }>()

function cacheGet(key: string): string | null | undefined {
  const hit = aliasCache.get(key)
  if (!hit) return undefined
  if (hit.expiresAt < Date.now()) {
    aliasCache.delete(key)
    return undefined
  }
  return hit.tenantId
}

function cacheSet(key: string, tenantId: string | null): void {
  aliasCache.set(key, { tenantId, expiresAt: Date.now() + TTL_MS })
}

export function extractRequestHost(req: { headers: Record<string, string | string[] | undefined> }): string {
  const fwd = req.headers['x-forwarded-host']
  const raw = (typeof fwd === 'string' && fwd.trim()) ? fwd : req.headers['host']
  const host = typeof raw === 'string' ? raw : ''
  return host.toLowerCase().split(':')[0].trim()
}

export function slugFromHost(host: string): { slug: string | null; rootDomain: string | null } {
  if (!host) return { slug: null, rootDomain: null }
  for (const root of ROOT_DOMAINS) {
    if (host === root || host === `www.${root}`) {
      return { slug: null, rootDomain: root }
    }
    if (host.endsWith(`.${root}`)) {
      const label = host.slice(0, host.length - root.length - 1)
      return { slug: label || null, rootDomain: root }
    }
  }
  return { slug: null, rootDomain: null }
}

/** Alias lookup with TTL cache and a tenants.subdomain fallback. */
async function findTenantByAlias(alias: string): Promise<AliasRow | null> {
  const key = `a:${alias}`
  const cached = cacheGet(key)
  if (cached !== undefined) {
    return cached ? { tenant_id: cached, kind: 'subdomain', is_primary: true, status: 'active' } : null
  }

  try {
    const res = await sql`
      SELECT tenant_id, kind, is_primary, status
      FROM tenant_aliases
      WHERE alias = ${alias} AND status = 'active'
      LIMIT 1
    `
    const row = res.rows[0]
    if (row) {
      cacheSet(key, row.tenant_id)
      return { tenant_id: row.tenant_id, kind: row.kind, is_primary: !!row.is_primary, status: row.status }
    }
  } catch (error) {
    // tenant_aliases table not migrated yet — fall through to tenants.subdomain
    console.warn('tenant_aliases lookup failed (migration pending?):', (error as Error)?.message)
  }

  // Fallback: some deployments may only have tenants.subdomain populated.
  try {
    const t = await sql`
      SELECT id::text AS tenant_id, subdomain
      FROM tenants
      WHERE LOWER(subdomain) = ${alias} AND status = 'active'
      LIMIT 1
    `
    const row = t.rows[0]
    if (row) {
      cacheSet(key, row.tenant_id)
      return { tenant_id: row.tenant_id, kind: 'subdomain', is_primary: true, status: 'active' }
    }
  } catch {
    // tenants table unavailable — resolver cannot answer
  }

  cacheSet(key, null)
  return null
}

/** Only honoured when the runtime sits behind our own nginx (VPS deployment). */
const TRUST_X_TENANT_SLUG = process.env.TRUST_X_TENANT_SLUG === 'true'

export async function resolveTenantFromRequest(
  req: { headers: Record<string, string | string[] | undefined> },
  opts: { trustHeader?: boolean } = {}
): Promise<ResolvedTenant> {
  const host = extractRequestHost(req)

  // 1) Edge-injected slug — set by the wildcard nginx server block (VPS).
  if (TRUST_X_TENANT_SLUG || opts.trustHeader) {
    const header = req.headers['x-tenant-slug']
    if (typeof header === 'string' && header.trim()) {
      const slug = header.trim().toLowerCase()
      const found = await findTenantByAlias(slug)
      return { tenantId: found?.tenant_id ?? null, slug, host, rootDomain: null, matchedVia: 'x-tenant-slug' }
    }
  }

  // 2) Host-derived subdomain — `lincolnhigh.<root-domain>` (Vercel + VPS).
  const { slug, rootDomain } = slugFromHost(host)
  if (slug) {
    const found = await findTenantByAlias(slug)
    return {
      tenantId: found?.tenant_id ?? null,
      slug,
      host,
      rootDomain,
      matchedVia: found ? 'alias-subdomain' : 'none',
    }
  }

  // 3) Exact alias match — covers custom domains and namespaced hosts.
  if (host) {
    const exact = await findTenantByAlias(host)
    if (exact) {
      return { tenantId: exact.tenant_id, slug: host, host, rootDomain, matchedVia: 'alias-custom' }
    }
  }

  return { tenantId: null, slug: null, host, rootDomain, matchedVia: 'none' }
}

/** Resolve a `/join/<code>` handle (short_code or plain slug). */
export async function resolveShortCode(code: string): Promise<{ tenantId: string; slug: string } | null> {
  const key = `c:${code}`
  const cached = cacheGet(key)
  if (cached !== undefined) return cached ? { tenantId: cached, slug: code } : null

  try {
    const res = await sql`
      SELECT tenant_id FROM tenant_aliases
      WHERE alias = ${code} AND kind IN ('short_code', 'subdomain') AND status = 'active'
      LIMIT 1
    `
    const row = res.rows[0]
    if (row) {
      cacheSet(key, row.tenant_id)
      return { tenantId: row.tenant_id, slug: code }
    }
  } catch (error) {
    console.warn('tenant_aliases short-code lookup failed:', (error as Error)?.message)
  }

  // Fallback for deployments that only have tenants.subdomain.
  try {
    const t = await sql`
      SELECT id::text AS tenant_id FROM tenants
      WHERE LOWER(subdomain) = ${code} AND status = 'active'
      LIMIT 1
    `
    const row = t.rows[0]
    if (row) {
      cacheSet(key, row.tenant_id)
      return { tenantId: row.tenant_id, slug: code }
    }
  } catch {
    // no answer
  }

  cacheSet(key, null)
  return null
}

export function rootDomainFor(): string {
  return ROOT_DOMAINS[0] || 'pisairtelsms.com'
}