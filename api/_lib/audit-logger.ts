import type { ApiRequest } from './http-types.js'
import { sql } from './sql.js'

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
  tenantId?: string | null
  userId?: string
  role?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  details?: Record<string, unknown>
}

const ACTION_SEVERITY: Record<AuditAction, 'low' | 'medium' | 'high'> = {
  login_success: 'low',
  logout: 'low',
  login_failure: 'medium',
  password_change: 'medium',
  password_reset: 'medium',
  profile_update: 'low',
  role_change: 'medium',
  data_access: 'low',
  data_modification: 'medium',
  permission_denied: 'medium',
  csrf_failure: 'high',
  rate_limit_exceeded: 'medium',
}

/**
 * Log an audit event into the tenant-scoped security_events table — the same
 * store that feeds Session Management history and the Audit Logs tab.
 * (Previously this wrote to a legacy audit_log table whose columns didn't
 * exist in production, so every call silently failed.)
 */
export async function logAuditEvent(
  action: AuditAction,
  context: AuditContext
): Promise<void> {
  try {
    const description = [
      context.resource,
      context.role ? `role=${context.role}` : null,
      context.ipAddress ? `ip=${context.ipAddress}` : null,
      context.details ? JSON.stringify(context.details) : null,
    ]
      .filter(Boolean)
      .join(' | ') || action

    await sql`
      INSERT INTO security_events (id, tenant_id, user_id, event_type, description, severity)
      VALUES (
        ${crypto.randomUUID()},
        ${context.tenantId ?? null},
        ${context.userId || null},
        ${action},
        ${description},
        ${ACTION_SEVERITY[action]}
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
export function extractAuditContext(
  req: ApiRequest,
  userId?: string,
  role?: string,
  tenantId?: string | null
): AuditContext {
  return {
    userId,
    role,
    tenantId: tenantId ?? null,
    ipAddress: req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown',
    userAgent: req.headers['user-agent'] as string || 'unknown',
  }
}

/**
 * Log a successful login.
 */
export async function logLoginSuccess(req: ApiRequest, userId: string, role: string, tenantId?: string | null): Promise<void> {
  await logAuditEvent('login_success', {
    userId,
    role,
    ...extractAuditContext(req, userId, role, tenantId),
  })
}

/**
 * Log a failed login attempt.
 */
export async function logLoginFailure(req: ApiRequest, email: string, reason: string, tenantId?: string | null): Promise<void> {
  await logAuditEvent('login_failure', {
    ...extractAuditContext(req, undefined, undefined, tenantId),
    details: { email, reason },
  })
}

/**
 * Log a password change.
 */
export async function logPasswordChange(req: ApiRequest, userId: string, role: string, tenantId?: string | null): Promise<void> {
  await logAuditEvent('password_change', {
    userId,
    role,
    ...extractAuditContext(req, userId, role, tenantId),
  })
}

/**
 * Log a permission denied event.
 */
export async function logPermissionDenied(
  req: ApiRequest,
  userId: string | undefined,
  role: string | undefined,
  resource: string,
  tenantId?: string | null
): Promise<void> {
  await logAuditEvent('permission_denied', {
    userId,
    role,
    resource,
    ...extractAuditContext(req, userId, role, tenantId),
  })
}

/**
 * Log a rate limit exceeded event.
 */
export async function logRateLimitExceeded(req: ApiRequest, identifier: string, tenantId?: string | null): Promise<void> {
  await logAuditEvent('rate_limit_exceeded', {
    ...extractAuditContext(req, undefined, undefined, tenantId),
    details: { identifier },
  })
}

/**
 * Log a CSRF failure event.
 */
export async function logCSRFFailure(req: ApiRequest, userId: string | undefined, tenantId?: string | null): Promise<void> {
  await logAuditEvent('csrf_failure', {
    userId,
    ...extractAuditContext(req, userId, undefined, tenantId),
  })
}
