import type { VercelRequest } from '@vercel/node'
import { sql } from '@vercel/postgres'

export type AuditAction =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'password_reset'
  | 'profile_update'
  | 'role_change'
  | 'data_access'
  | 'data_modification'
  | 'permission_denied'
  | 'csrf_failure'
  | 'rate_limit_exceeded'

export type AuditContext = {
  userId?: string
  role?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  details?: Record<string, unknown>
}

/**
 * Log an audit event to the database.
 * Creates an audit_log table if it doesn't exist.
 */
export async function logAuditEvent(
  action: AuditAction,
  context: AuditContext
): Promise<void> {
  try {
    // Ensure audit_log table exists
    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        user_id VARCHAR(255),
        role VARCHAR(50),
        ip_address VARCHAR(50),
        user_agent TEXT,
        resource VARCHAR(255),
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      INSERT INTO audit_log (action, user_id, role, ip_address, user_agent, resource, details)
      VALUES (
        ${action},
        ${context.userId || null},
        ${context.role || null},
        ${context.ipAddress || null},
        ${context.userAgent || null},
        ${context.resource || null},
        ${context.details ? JSON.stringify(context.details) : null}
      )
    `
  } catch (error) {
    // Don't throw errors - audit logging should not break the application
    console.error('Failed to log audit event:', error)
  }
}

/**
 * Extract audit context from a request.
 */
export function extractAuditContext(req: VercelRequest, userId?: string, role?: string): AuditContext {
  return {
    userId,
    role,
    ipAddress: req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown',
    userAgent: req.headers['user-agent'] as string || 'unknown',
  }
}

/**
 * Log a successful login.
 */
export async function logLoginSuccess(req: VercelRequest, userId: string, role: string): Promise<void> {
  await logAuditEvent('login_success', {
    userId,
    role,
    ...extractAuditContext(req, userId, role),
  })
}

/**
 * Log a failed login attempt.
 */
export async function logLoginFailure(req: VercelRequest, email: string, reason: string): Promise<void> {
  await logAuditEvent('login_failure', {
    ...extractAuditContext(req),
    details: { email, reason },
  })
}

/**
 * Log a password change.
 */
export async function logPasswordChange(req: VercelRequest, userId: string, role: string): Promise<void> {
  await logAuditEvent('password_change', {
    userId,
    role,
    ...extractAuditContext(req, userId, role),
  })
}

/**
 * Log a permission denied event.
 */
export async function logPermissionDenied(
  req: VercelRequest,
  userId: string | undefined,
  role: string | undefined,
  resource: string
): Promise<void> {
  await logAuditEvent('permission_denied', {
    userId,
    role,
    resource,
    ...extractAuditContext(req, userId, role),
  })
}

/**
 * Log a rate limit exceeded event.
 */
export async function logRateLimitExceeded(req: VercelRequest, identifier: string): Promise<void> {
  await logAuditEvent('rate_limit_exceeded', {
    ...extractAuditContext(req),
    details: { identifier },
  })
}

/**
 * Log a CSRF failure event.
 */
export async function logCSRFFailure(req: VercelRequest, userId: string | undefined): Promise<void> {
  await logAuditEvent('csrf_failure', {
    userId,
    ...extractAuditContext(req, userId),
  })
}
