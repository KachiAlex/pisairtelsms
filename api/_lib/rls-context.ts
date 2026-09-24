/**
 * Row-Level Security request context.
 *
 * server.mjs decodes the caller's JWT tenantId into this AsyncLocalStorage
 * scope. Query helpers (sql.ts, cbt/_lib/db.ts) check it: when a tenantId is
 * present the query executes inside a transaction as the restricted
 * `app_user` role with `app.tenant_id` set, so tenant_isolation RLS policies
 * bind. Requests without a tenant context (login, public, super-admin, cron)
 * run as the table owner — RLS does not apply to owners — preserving
 * existing behavior.
 */

import { AsyncLocalStorage } from 'async_hooks'

export interface RlsContext {
  tenantId?: string
}

export const rlsStorage = new AsyncLocalStorage<RlsContext>()

export function getRlsContext(): RlsContext | undefined {
  return rlsStorage.getStore()
}

const SAFE_TID = /^[A-Za-z0-9_-]+$/

/** 'on' when the app_user role exists; cached briefly to avoid per-query lookups. */
let rlsRoleReady: boolean | null = null
let rlsRoleCheckedAt = 0

export async function rlsRoleExists(pool: { query: (t: string, v?: any[]) => Promise<{ rows: any[] }> }): Promise<boolean> {
  if (rlsRoleReady !== null && Date.now() - rlsRoleCheckedAt < 60_000) return rlsRoleReady
  try {
    const r = await pool.query("SELECT 1 FROM pg_roles WHERE rolname = 'app_user'")
    rlsRoleReady = r.rows.length > 0
  } catch {
    rlsRoleReady = false
  }
  rlsRoleCheckedAt = Date.now()
  return rlsReady()
}

function rlsReady(): boolean {
  return rlsRoleReady === true
}

/**
 * Run a single parameterized query, scoping to the request's tenant via RLS
 * when a tenant context exists and the app_user role has been provisioned.
 * Falls back to a plain pool query otherwise (owner role — unchanged path).
 */
// Lazy "ensure table/column" DDL runs as owner — RLS governs row access, not
// schema; running it as app_user would fail on CREATE permission anyway.
const DDL_RE = /^\s*(create|alter|drop|truncate)\b/i

export async function scopedQuery<T = any>(
  pool: { connect: () => Promise<any>; query: (t: string, v?: any[]) => Promise<any> },
  text: string,
  values?: any[]
): Promise<{ rows: T[]; rowCount: number; command: string; oid: number; fields: any[] }> {
  const tid = getRlsContext()?.tenantId
  if (!tid || DDL_RE.test(text) || !(await rlsRoleExists(pool))) {
    return pool.query(text, values)
  }
  // Malformed tenant ids must never bypass scoping — clamp to an impossible value.
  const safeTid = SAFE_TID.test(tid) ? tid : '__invalid_tenant__'
  const client = await pool.connect()
  try {
    await client.query(
      `BEGIN; SET LOCAL ROLE app_user; SELECT set_config('app.tenant_id', '${safeTid}', true)`
    )
    const res = await client.query(text, values)
    await client.query('COMMIT')
    return res
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

/**
 * Apply the RLS scope to an explicit transaction client (used by
 * db.ts transaction()). Call immediately after BEGIN.
 */
export async function applyRlsScope(client: { query: (t: string, v?: any[]) => Promise<any> }): Promise<void> {
  const tid = getRlsContext()?.tenantId
  if (!tid) return
  const safeTid = SAFE_TID.test(tid) ? tid : '__invalid_tenant__'
  await client.query(
    `SET LOCAL ROLE app_user; SELECT set_config('app.tenant_id', '${safeTid}', true)`
  ).catch(() => {}) // role may not exist yet — non-fatal on un-migrated DBs
}
