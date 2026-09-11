// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ sql: vi.fn() }))

vi.mock('@vercel/postgres', () => ({ sql: mocks.sql }))

/**
 * Tests for the tenant URL resolver — the engine behind per-school
 * application & inquiry URLs. Validates Host parsing, alias resolution,
 * tenants.subdomain fallback, header trust rules and TTL caching.
 */

// Fake DB fixtures
const aliases = new Map<string, { tenant_id: string; kind: string; is_primary: boolean; status: string }>()
const tenantSubdomains = new Map<string, { id: string; subdomain: string; status: string }>()

function configureSqlMock(): void {
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?')
    if (text.includes('tenant_aliases')) {
      const alias = String(values[0])
      const row = aliases.get(alias)
      return { rows: row ? [row] : [] }
    }
    if (text.includes('LOWER(subdomain)')) {
      const alias = String(values[0])
      const t = tenantSubdomains.get(alias)
      return { rows: t ? [{ tenant_id: t.id, subdomain: t.subdomain }] : [] }
    }
    return { rows: [] }
  })
}

function reqWith(headers: Record<string, string>): { headers: Record<string, string | string[] | undefined> } {
  return { headers }
}

beforeEach(() => {
  vi.resetModules()
  delete process.env.TRUST_X_TENANT_SLUG
  delete process.env.TENANT_ROOT_DOMAINS
  aliases.clear()
  tenantSubdomains.clear()
  mocks.sql.mockClear()
  configureSqlMock()
})

afterEach(() => {
  delete process.env.TRUST_X_TENANT_SLUG
  delete process.env.TENANT_ROOT_DOMAINS
})

describe('slugFromHost', () => {
  it('extracts the slug from a school subdomain', async () => {
    const { slugFromHost } = await import('./tenant-resolver.js')
    expect(slugFromHost('lincolnhigh.pisairtelsms.com')).toEqual({
      slug: 'lincolnhigh',
      rootDomain: 'pisairtelsms.com',
    })
  })

  it('treats the apex domain as the marketing site (no slug)', async () => {
    const { slugFromHost } = await import('./tenant-resolver.js')
    expect(slugFromHost('pisairtelsms.com')).toEqual({ slug: null, rootDomain: 'pisairtelsms.com' })
    expect(slugFromHost('www.pisairtelsms.com')).toEqual({ slug: null, rootDomain: 'pisairtelsms.com' })
  })

  it('returns nothing for hosts outside the tenant roots', async () => {
    const { slugFromHost } = await import('./tenant-resolver.js')
    expect(slugFromHost('lincolnhigh.other-domain.com')).toEqual({ slug: null, rootDomain: null })
    expect(slugFromHost('')).toEqual({ slug: null, rootDomain: null })
  })
})

describe('extractRequestHost', () => {
  it('reads the Host header and strips the port', async () => {
    const { extractRequestHost } = await import('./tenant-resolver.js')
    expect(extractRequestHost(reqWith({ host: 'LincolnHigh.PisairtelSMS.com:8082' })))
      .toBe('lincolnhigh.pisairtelsms.com')
  })

  it('prefers x-forwarded-host over Host', async () => {
    const { extractRequestHost } = await import('./tenant-resolver.js')
    expect(extractRequestHost(reqWith({
      host: 'backend.internal',
      'x-forwarded-host': 'acorn.pisairtelsms.com',
    }))).toBe('acorn.pisairtelsms.com')
  })
})

describe('resolveTenantFromRequest', () => {
  it('resolves a school subdomain via the alias registry', async () => {
    aliases.set('lincolnhigh', { tenant_id: 'tenant-1', kind: 'subdomain', is_primary: true, status: 'active' })
    const { resolveTenantFromRequest } = await import('./tenant-resolver.js')

    const resolved = await resolveTenantFromRequest(reqWith({ host: 'lincolnhigh.pisairtelsms.com' }))
    expect(resolved).toMatchObject({
      tenantId: 'tenant-1',
      slug: 'lincolnhigh',
      rootDomain: 'pisairtelsms.com',
      matchedVia: 'alias-subdomain',
    })
  })

  it('falls back to tenants.subdomain when the alias table is not migrated', async () => {
    tenantSubdomains.set('acorn', { id: 'tenant-2', subdomain: 'acorn', status: 'active' })
    const { resolveTenantFromRequest } = await import('./tenant-resolver.js')

    const resolved = await resolveTenantFromRequest(reqWith({ host: 'acorn.pisairtelsms.com' }))
    expect(resolved.tenantId).toBe('tenant-2')
    expect(resolved.matchedVia).toBe('alias-subdomain')
  })

  it('flags unknown school subdomains without a tenant', async () => {
    const { resolveTenantFromRequest } = await import('./tenant-resolver.js')
    const resolved = await resolveTenantFromRequest(reqWith({ host: 'nope.pisairtelsms.com' }))
    expect(resolved.tenantId).toBeNull()
    expect(resolved.slug).toBe('nope')
  })

  it('resolves custom domains via an exact alias match', async () => {
    aliases.set('www.lincolnhigh.edu.ng', { tenant_id: 'tenant-1', kind: 'custom_domain', is_primary: false, status: 'active' })
    const { resolveTenantFromRequest } = await import('./tenant-resolver.js')
    const resolved = await resolveTenantFromRequest(reqWith({ host: 'www.lincolnhigh.edu.ng' }))
    expect(resolved).toMatchObject({ tenantId: 'tenant-1', matchedVia: 'alias-custom' })
  })

  it('ignores a client-supplied x-tenant-slug by default (anti-spoofing)', async () => {
    aliases.set('evil', { tenant_id: 'tenant-evil', kind: 'subdomain', is_primary: true, status: 'active' })
    const { resolveTenantFromRequest } = await import('./tenant-resolver.js')
    const resolved = await resolveTenantFromRequest(reqWith({
      host: 'pisairtelsms.com',
      'x-tenant-slug': 'evil',
    }))
    expect(resolved.tenantId).toBeNull()
  })

  it('honours x-tenant-slug when the runtime is behind our nginx', async () => {
    process.env.TRUST_X_TENANT_SLUG = 'true'
    aliases.set('acorn', { tenant_id: 'tenant-2', kind: 'subdomain', is_primary: true, status: 'active' })
    const { resolveTenantFromRequest } = await import('./tenant-resolver.js')
    const resolved = await resolveTenantFromRequest(reqWith({
      host: 'pisairtelsms.com',
      'x-tenant-slug': 'acorn',
    }))
    expect(resolved).toMatchObject({ tenantId: 'tenant-2', slug: 'acorn', matchedVia: 'x-tenant-slug' })
  })

  it('caches alias lookups so repeat requests do not re-query the DB', async () => {
    aliases.set('lincolnhigh', { tenant_id: 'tenant-1', kind: 'subdomain', is_primary: true, status: 'active' })
    const { resolveTenantFromRequest } = await import('./tenant-resolver.js')
    const req = reqWith({ host: 'lincolnhigh.pisairtelsms.com' })

    await resolveTenantFromRequest(req)
    const callsAfterFirst = mocks.sql.mock.calls.length
    await resolveTenantFromRequest(req)
    expect(mocks.sql.mock.calls.length).toBe(callsAfterFirst)
  })

  it('supports additional root domains via TENANT_ROOT_DOMAINS', async () => {
    process.env.TENANT_ROOT_DOMAINS = 'scholarx.io,pisairtelsms.com'
    aliases.set('lincolnhigh', { tenant_id: 'tenant-1', kind: 'subdomain', is_primary: true, status: 'active' })
    const { resolveTenantFromRequest, slugFromHost } = await import('./tenant-resolver.js')

    expect(slugFromHost('lincolnhigh.scholarx.io')).toEqual({ slug: 'lincolnhigh', rootDomain: 'scholarx.io' })
    const resolved = await resolveTenantFromRequest(reqWith({ host: 'lincolnhigh.scholarx.io' }))
    expect(resolved.tenantId).toBe('tenant-1')
  })
})

describe('resolveShortCode', () => {
  it('resolves /join handles registered as short codes', async () => {
    aliases.set('lincolnhigh-4f9k', { tenant_id: 'tenant-1', kind: 'short_code', is_primary: false, status: 'active' })
    const { resolveShortCode } = await import('./tenant-resolver.js')
    expect(await resolveShortCode('lincolnhigh-4f9k')).toEqual({ tenantId: 'tenant-1', slug: 'lincolnhigh-4f9k' })
  })

  it('resolves plain school slugs for backwards compatibility', async () => {
    aliases.set('lincolnhigh', { tenant_id: 'tenant-1', kind: 'subdomain', is_primary: true, status: 'active' })
    const { resolveShortCode } = await import('./tenant-resolver.js')
    expect(await resolveShortCode('lincolnhigh')).toEqual({ tenantId: 'tenant-1', slug: 'lincolnhigh' })
  })

  it('returns null for unknown handles', async () => {
    const { resolveShortCode } = await import('./tenant-resolver.js')
    expect(await resolveShortCode('ghost-school')).toBeNull()
  })
})

describe('rootDomainFor', () => {
  it('defaults to pisairtelsms.com', async () => {
    const { rootDomainFor } = await import('./tenant-resolver.js')
    expect(rootDomainFor()).toBe('pisairtelsms.com')
  })

  it('honours TENANT_ROOT_DOMAINS', async () => {
    process.env.TENANT_ROOT_DOMAINS = 'scholarx.io,pisairtelsms.com'
    const { rootDomainFor } = await import('./tenant-resolver.js')
    expect(rootDomainFor()).toBe('scholarx.io')
  })
})