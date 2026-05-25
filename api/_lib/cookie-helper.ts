import type { VercelResponse } from '@vercel/node'

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  path?: string
  maxAge?: number
  expires?: Date
  domain?: string
}

/**
 * Set an httpOnly cookie on the response.
 */
export function setCookie(
  res: VercelResponse,
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const {
    httpOnly = true,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'strict',
    path = '/',
    maxAge,
    expires,
    domain,
  } = options

  let cookieString = `${name}=${value}`

  if (httpOnly) cookieString += '; HttpOnly'
  if (secure) cookieString += '; Secure'
  if (sameSite) cookieString += `; SameSite=${sameSite}`
  if (path) cookieString += `; Path=${path}`
  if (maxAge) cookieString += `; Max-Age=${maxAge}`
  if (expires) cookieString += `; Expires=${expires.toUTCString()}`
  if (domain) cookieString += `; Domain=${domain}`

  const existingSetCookie = res.getHeader('Set-Cookie')
  if (existingSetCookie) {
    if (Array.isArray(existingSetCookie)) {
      res.setHeader('Set-Cookie', [...existingSetCookie, cookieString])
    } else {
      res.setHeader('Set-Cookie', [existingSetCookie, cookieString])
    }
  } else {
    res.setHeader('Set-Cookie', cookieString)
  }
}

/**
 * Clear a cookie by setting it to expire in the past.
 */
export function clearCookie(res: VercelResponse, name: string, options: CookieOptions = {}): void {
  const { path = '/', domain } = options
  const cookieString = `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT${domain ? `; Domain=${domain}` : ''}`
  
  const existingSetCookie = res.getHeader('Set-Cookie')
  if (existingSetCookie) {
    if (Array.isArray(existingSetCookie)) {
      res.setHeader('Set-Cookie', [...existingSetCookie, cookieString])
    } else {
      res.setHeader('Set-Cookie', [existingSetCookie, cookieString])
    }
  } else {
    res.setHeader('Set-Cookie', cookieString)
  }
}
