/**
 * Client-side helpers for the per-school URL system.
 *
 * Each school has ONE identity (its subdomain / slug) that yields:
 *   - Application URL: https://<slug>.<root>/            (login + app)
 *   - Inquiry URL:     https://<slug>.<root>/inquiry      (public form)
 *   - Share/QR link:   /join/<slug-or-code>               (redirects)
 */

export interface PublicSchoolMeta {
  notFound: boolean
  subdomain: string | null
  isApex: boolean
  tenant: {
    id: string
    name: string
    logoUrl: string | null
    primaryColor: string | null
    applicationUrl: string
    inquiryUrl: string
  } | null
}

export interface JoinResolution {
  ok: boolean
  redirectTo?: string
  applicationUrl?: string
  inquiryUrl?: string
  error?: string
}

const META_CACHE_KEY = 'tenantUrlResolver:schoolMeta'
const META_CACHE_TTL_MS = 60_000

interface MetaCacheEntry {
  fetchedAt: number
  data: PublicSchoolMeta
}

function readMetaCache(): MetaCacheEntry | null {
  try {
    const raw = sessionStorage.getItem(META_CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as MetaCacheEntry
    if (Date.now() - entry.fetchedAt > META_CACHE_TTL_MS) {
      sessionStorage.removeItem(META_CACHE_KEY)
      return null
    }
    return entry
  } catch {
    return null
  }
}

function writeMetaCache(data: PublicSchoolMeta): void {
  try {
    sessionStorage.setItem(META_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data } as MetaCacheEntry))
  } catch {
    // Session storage may be unavailable (private mode) — ignore.
  }
}

/**
 * Fetch the school identity card for the current host.
 * Resolved server-side from the Host header — not from any client input.
 */
export async function getPublicSchoolMeta(force = false): Promise<PublicSchoolMeta | null> {
  if (!force) {
    const cached = readMetaCache()
    if (cached) return cached.data
  }

  try {
    const res = await fetch('/api/public/meta', { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = (await res.json()) as PublicSchoolMeta
      writeMetaCache(data)
      return data
    }
  } catch (error) {
    console.warn('Failed to fetch school meta:', error)
  }

  const cached = readMetaCache()
  return cached?.data ?? null
}

/** Resolve a /join/<code> handle to the school's canonical URL. */
export async function resolveJoinLink(alias: string): Promise<JoinResolution> {
  try {
    const res = await fetch(`/api/public/resolve?alias=${encodeURIComponent(alias)}&format=json`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      return (await res.json()) as JoinResolution
    }
    return { ok: false, error: `resolve-http-${res.status}` }
  } catch (error) {
    console.warn('Failed to resolve join link:', error)
    return { ok: false, error: 'network' }
  }
}