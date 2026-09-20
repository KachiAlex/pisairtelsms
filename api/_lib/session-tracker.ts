import type { ApiRequest } from './http-types.js'
import { sql } from './sql.js'

/**
 * Session tracking backed by the user_sessions + security_events tables.
 *
 * Login handlers call recordSession() and embed the returned session id in the
 * JWT (`sid` claim). requireRole/requireAuth then validate the sid on each
 * request, so terminations take effect immediately and last_activity stays
 * fresh. Tokens without a sid (issued before tracking existed) are unaffected.
 */

function parseDeviceInfo(userAgent: string): Record<string, string> {
  const ua = userAgent || ''
  let type = 'Desktop'
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) type = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile'
  let os = 'Unknown OS'
  if (/Windows NT/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|macOS/i.test(ua)) os = 'macOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS'
  else if (/Linux/i.test(ua)) os = 'Linux'
  let browser = 'Browser'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  return { type, os, browser }
}

function clientIp(req: ApiRequest): string | null {
  const fwd = req.headers['x-forwarded-for']
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim()
    || (req.headers['x-real-ip'] as string)
    || null
  return ip
}

/** Record a login session; returns the session id to embed in the JWT. */
export async function recordSession(
  tenantId: string,
  userId: string,
  req: ApiRequest,
  expiresInSeconds: number
): Promise<string | null> {
  try {
    const id = crypto.randomUUID()
    const deviceInfo = parseDeviceInfo(req.headers['user-agent'] as string)
    const ip = clientIp(req)
    await sql`
      INSERT INTO user_sessions (id, tenant_id, user_id, device_info, ip_address, risk_level, last_activity, created_at, expires_at)
      VALUES (${id}, ${tenantId}, ${userId}, ${JSON.stringify(deviceInfo)}::jsonb, ${ip}, 'Low', NOW(), NOW(), NOW() + make_interval(secs => ${expiresInSeconds}))
    `
    return id
  } catch (error) {
    console.error('recordSession error:', error)
    return null
  }
}

/**
 * Validate a session id and refresh last_activity in one statement.
 * Returns the session id when valid, null when terminated or expired.
 */
export async function touchSession(sessionId: string): Promise<boolean> {
  const result = await sql`
    UPDATE user_sessions SET last_activity = NOW()
    WHERE id = ${sessionId} AND terminated_at IS NULL AND expires_at > NOW()
    RETURNING id
  `
  return result.rows.length > 0
}

/** Terminate one session (tenant-scoped). Returns true when a row was closed. */
export async function terminateSession(tenantId: string, sessionId: string): Promise<boolean> {
  const result = await sql`
    UPDATE user_sessions SET terminated_at = NOW()
    WHERE id = ${sessionId} AND tenant_id = ${tenantId} AND terminated_at IS NULL
    RETURNING id
  `
  return result.rows.length > 0
}

/** Terminate all active sessions for a tenant; returns count closed. */
export async function terminateAllSessions(tenantId: string, exceptSessionId?: string | null): Promise<number> {
  const result = await sql`
    UPDATE user_sessions SET terminated_at = NOW()
    WHERE tenant_id = ${tenantId} AND terminated_at IS NULL
      AND (${exceptSessionId ?? null}::text IS NULL OR id <> ${exceptSessionId ?? null})
    RETURNING id
  `
  return result.rows.length
}

/** Write a security event for dashboards, anomaly feeds, and audit history. */
export async function logSecurityEvent(
  tenantId: string,
  userId: string | null,
  eventType: string,
  description: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
): Promise<void> {
  try {
    await sql`
      INSERT INTO security_events (id, tenant_id, user_id, event_type, description, severity)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${userId}, ${eventType}, ${description}, ${severity})
    `
  } catch (error) {
    console.error('logSecurityEvent error:', error)
  }
}
