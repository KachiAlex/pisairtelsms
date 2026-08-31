// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Tests for JWT secret utility and auth-middleware tenant extraction.
 * Validates: getJwtSecret throws on missing/short secrets, caches correctly,
 * and getTenantIdFromRequest extracts tenantId from decoded JWT.
 */

describe('getJwtSecret', () => {
  const originalEnv = process.env.JWT_SECRET

  beforeEach(() => {
    // Reset module cache so cachedSecret is null on each test
    vi.resetModules()
    delete process.env.JWT_SECRET
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.JWT_SECRET = originalEnv
    } else {
      delete process.env.JWT_SECRET
    }
  })

  it('should throw when JWT_SECRET is not set', async () => {
    const { getJwtSecret } = await import('./jwt-secret.js')
    expect(() => getJwtSecret()).toThrow('JWT_SECRET environment variable is not set')
  })

  it('should throw when JWT_SECRET is less than 32 characters', async () => {
    process.env.JWT_SECRET = 'short-secret'
    const { getJwtSecret } = await import('./jwt-secret.js')
    expect(() => getJwtSecret()).toThrow('at least 32 characters')
  })

  it('should return Uint8Array when JWT_SECRET is valid (>= 32 chars)', async () => {
    process.env.JWT_SECRET = 'a-very-secure-jwt-secret-with-32+chars!'
    const { getJwtSecret } = await import('./jwt-secret.js')
    const secret = getJwtSecret()
    expect(secret).toBeInstanceOf(Uint8Array)
    expect(secret.length).toBeGreaterThan(0)
  })

  it('should cache the secret and return the same reference', async () => {
    process.env.JWT_SECRET = 'a-very-secure-jwt-secret-with-32+chars!'
    const { getJwtSecret } = await import('./jwt-secret.js')
    const first = getJwtSecret()
    const second = getJwtSecret()
    expect(first).toBe(second)
  })

  it('should encode the secret correctly as UTF-8', async () => {
    process.env.JWT_SECRET = 'a-very-secure-jwt-secret-with-32+chars!'
    const { getJwtSecret } = await import('./jwt-secret.js')
    const secret = getJwtSecret()
    const expected = new TextEncoder().encode('a-very-secure-jwt-secret-with-32+chars!')
    expect(secret).toEqual(expected)
  })

  it('should accept exactly 32 character secret', async () => {
    process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz012345'
    const { getJwtSecret } = await import('./jwt-secret.js')
    expect(() => getJwtSecret()).not.toThrow()
  })

  it('should reject 31 character secret', async () => {
    process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz01234'
    const { getJwtSecret } = await import('./jwt-secret.js')
    expect(() => getJwtSecret()).toThrow('at least 32 characters')
  })
})

describe('getTenantIdFromRequest', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.JWT_SECRET = 'a-very-secure-jwt-secret-with-32+chars!'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return null and send 401 when no token is provided', async () => {
    const { getTenantIdFromRequest } = await import('./auth-middleware.js')
    const req = { headers: {} } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any

    const result = await getTenantIdFromRequest(req, res)
    expect(result).toBeNull()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should return null and send 401 when token is invalid', async () => {
    const { getTenantIdFromRequest } = await import('./auth-middleware.js')
    const req = {
      headers: { authorization: 'Bearer invalid.token.here' },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any

    const result = await getTenantIdFromRequest(req, res)
    expect(result).toBeNull()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should return null and send 403 when decoded token has no tenantId', async () => {
    const { getTenantIdFromRequest } = await import('./auth-middleware.js')
    const { SignJWT } = await import('jose')

    const secret = new TextEncoder().encode('a-very-secure-jwt-secret-with-32+chars!')
    const token = await new SignJWT({ role: 'staff' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any

    const result = await getTenantIdFromRequest(req, res)
    expect(result).toBeNull()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('should return tenantId when valid token with tenantId is provided', async () => {
    const { getTenantIdFromRequest } = await import('./auth-middleware.js')
    const { SignJWT } = await import('jose')

    const secret = new TextEncoder().encode('a-very-secure-jwt-secret-with-32+chars!')
    const token = await new SignJWT({ role: 'tenant_admin', tenantId: 'tenant_123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any

    const result = await getTenantIdFromRequest(req, res)
    expect(result).toBe('tenant_123')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should extract token from cookie when Authorization header is absent', async () => {
    const { getTenantIdFromRequest } = await import('./auth-middleware.js')
    const { SignJWT } = await import('jose')

    const secret = new TextEncoder().encode('a-very-secure-jwt-secret-with-32+chars!')
    const token = await new SignJWT({ role: 'tenant_admin', tenantId: 'tenant_from_cookie' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)

    const req = {
      headers: { cookie: `auth_token=${token}` },
    } as any
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any

    const result = await getTenantIdFromRequest(req, res)
    expect(result).toBe('tenant_from_cookie')
  })
})

describe('extractToken helpers', () => {
  it('extractTokenFromHeader should return null for missing header', async () => {
    const { extractTokenFromHeader } = await import('./auth-middleware.js')
    expect(extractTokenFromHeader(undefined)).toBeNull()
  })

  it('extractTokenFromHeader should return null for non-Bearer header', async () => {
    const { extractTokenFromHeader } = await import('./auth-middleware.js')
    expect(extractTokenFromHeader('Basic abc123')).toBeNull()
  })

  it('extractTokenFromHeader should return token from Bearer header', async () => {
    const { extractTokenFromHeader } = await import('./auth-middleware.js')
    expect(extractTokenFromHeader('Bearer my.token.here')).toBe('my.token.here')
  })

  it('extractTokenFromCookie should return null when no cookie header', async () => {
    const { extractTokenFromCookie } = await import('./auth-middleware.js')
    const req = { headers: {} } as any
    expect(extractTokenFromCookie(req)).toBeNull()
  })

  it('extractTokenFromCookie should return auth_token value', async () => {
    const { extractTokenFromCookie } = await import('./auth-middleware.js')
    const req = { headers: { cookie: 'other=val; auth_token=cookie_token_value' } } as any
    expect(extractTokenFromCookie(req)).toBe('cookie_token_value')
  })
})
