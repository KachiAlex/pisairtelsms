import { createHash } from 'node:crypto'
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

/**
 * Deterministic session id for JWTs issued before tracking existed (no sid
 * claim): sha256 of the raw token, formatted as a UUID. Stable per token, so
 * every request maps to the same row and termination works identically.
 */
function legacySessionId(token: string): string {
  const hex = createHash('sha256').update(token).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

interface LegacyTokenClaims {
  tenantId?: string
  userId?: string
  staffId?: string
  studentId?: string
  parentId?: string
  sub?: string
  exp?: number
}

/**
 * Account-liveness revalidation: a JWT stays cryptographically valid until
 * expiry even after the account is deleted or deactivated, and session
 * termination alone doesn't cover accounts whose sessions were never tracked.
 * A short TTL cache keeps revocation bounded (~5 min) without a per-request
 * lookup storm. Fails OPEN on DB error — same policy as session validation.
 */
const LIVENESS_TTL_MS = 5 * 60 * 1000
const livenessCache = new Map<string, { ok: boolean; at: number }>()

export async function userStillActive(claims: { role?: string; tenantId?: string; userId?: string; staffId?: string; studentId?: string; parentId?: string }): Promise<boolean> {
  const role = claims.role
  const userId = claims.userId ?? claims.staffId ?? claims.studentId ?? claims.parentId ?? null
  if (!userId || !role) return true // nothing to bind to (service/cron tokens)

  const key = `${role}:${userId}`
  const hit = livenessCache.get(key)
  if (hit && Date.now() - hit.at < LIVENESS_TTL_MS) return hit.ok

  let ok = true
  try {
    const tid = claims.tenantId ?? ''
    if (role === 'student') {
      const r = await sql`SELECT 1 FROM students WHERE id::text = ${userId} AND tenant_id::text = ${tid} AND deleted_at IS NULL LIMIT 1`
      ok = r.rows.length > 0
    } else if (role === 'staff' || role === 'tenant_admin') {
      const r = await sql`SELECT 1 FROM staff WHERE id::text = ${userId} AND tenant_id::text = ${tid} AND LOWER(COALESCE(status, 'active')) <> 'inactive' LIMIT 1`
      ok = r.rows.length > 0
    } else if (role === 'user') {
      const r = await sql`SELECT 1 FROM tenant_users WHERE id::text = ${userId} AND tenant_id::text = ${tid} LIMIT 1`
      ok = r.rows.length > 0
    } else if (role === 'parent') {
      const r = await sql`SELECT 1 FROM parents WHERE id::text = ${userId} AND tenant_id::text = ${tid} LIMIT 1`
      ok = r.rows.length > 0
    } else if (role === 'super_admin') {
      const r = await sql`SELECT 1 FROM super_admin_accounts WHERE id::text = ${userId} LIMIT 1`
      ok = r.rows.length > 0
    }
    // Unrecognized roles pass — avoids breaking token types added later.
  } catch (error) {
    console.error('User liveness check error:', error)
    return true
  }
  livenessCache.set(key, { ok, at: Date.now() })
  return ok
}

/**
 * Adopt a sid-less token into user_sessions so pre-tracking logins appear in
 * active sessions and can be terminated. Creates the row once, then behaves
 * like touchSession: false when the row is terminated or expired.
 */
export async function adoptLegacySession(
  claims: LegacyTokenClaims,
  token: string,
  req: ApiRequest
): Promise<boolean> {
  const sid = legacySessionId(token)
  const userId = claims.staffId ?? claims.userId ?? claims.studentId ?? claims.parentId ?? claims.sub ?? 'unknown'
  const expiresAt = claims.exp ? new Date(claims.exp * 1000).toISOString() : null
  const deviceInfo = parseDeviceInfo(req.headers['user-agent'] as string)
  const ip = clientIp(req)
  // INSERT and UPDATE run as separate statements: data-modifying CTEs share
  // the same snapshot, so an UPDATE cannot see a row inserted in the same
  // statement.
  await sql`
    INSERT INTO user_sessions (id, tenant_id, user_id, device_info, ip_address, risk_level, last_activity, created_at, expires_at)
    VALUES (${sid}, ${claims.tenantId ?? 'unknown'}, ${userId}, ${JSON.stringify(deviceInfo)}::jsonb, ${ip}, 'Low', NOW(), NOW(),
            COALESCE(${expiresAt}::timestamptz, NOW() + interval '24 hours'))
    ON CONFLICT (id) DO NOTHING
  `
  const result = await sql`
    UPDATE user_sessions SET last_activity = NOW()
    WHERE id = ${sid} AND terminated_at IS NULL AND expires_at > NOW()
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
