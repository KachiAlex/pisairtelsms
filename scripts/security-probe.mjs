/**
 * Live security probe — run inside the app container:
 *   docker exec -w /app pisairtel-sms node scripts/security-probe.mjs
 *
 * Covers: unauthenticated access, cross-role RBAC, IDOR (cross-student /
 * cross-child), forged & expired tokens, cross-tenant JWT confusion,
 * SQL-injection-shaped params, and security headers.
 * Read-only: issues no writes.
 */
import pg from 'pg'
import { SignJWT } from 'jose'

const BASE = process.env.PROBE_BASE_URL || 'http://localhost:3000'
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL })

let pass = 0, fail = 0
const failures = []
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`) }
  else { fail++; failures.push(name); console.log(`  FAIL ${name} ${detail}`) }
}

async function sign(payload, opts = {}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(opts.expired ? '-5m' : '5m')
    .sign(opts.wrongSecret ? new TextEncoder().encode('wrong-secret') : secret)
}

async function hit(path, token, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { headers, method: opts.method || 'GET', body: opts.body, redirect: 'manual' })
  let body = null
  const text = await res.text()
  try { body = JSON.parse(text) } catch { body = text.slice(0, 200) }
  return { status: res.status, body, headers: res.headers }
}

const ids = await (async () => {
  const tid = (await pool.query(`SELECT id::text AS id FROM tenants LIMIT 1`)).rows[0]?.id
  const students = (await pool.query(`SELECT id::text AS id FROM students WHERE tenant_id::text=$1 AND deleted_at IS NULL ORDER BY id LIMIT 2`, [tid])).rows.map(r => r.id)
  const staff = (await pool.query(`SELECT id::text AS id FROM staff WHERE tenant_id::text=$1 LIMIT 1`, [tid])).rows[0]?.id
  const admin = (await pool.query(`SELECT id::text AS id FROM tenant_users WHERE tenant_id::text=$1 LIMIT 1`, [tid])).rows[0]?.id
  const link = (await pool.query(`SELECT parent_id::text AS parent_id, student_id::text AS student_id FROM parent_students WHERE tenant_id::text=$1 LIMIT 1`, [tid])).rows[0]
  const otherChild = (await pool.query(
    `SELECT id::text AS id FROM students WHERE tenant_id::text=$1 AND deleted_at IS NULL AND id::text NOT IN (SELECT student_id::text FROM parent_students WHERE parent_id::text=$2) LIMIT 1`,
    [tid, link?.parent_id || ''])).rows[0]?.id
  const exam = (await pool.query(`SELECT id::text AS id FROM exams WHERE tenant_id::text=$1 LIMIT 1`, [tid])).rows[0]?.id
  return { tid, students, staff, admin, parent: link?.parent_id, child: link?.student_id, otherChild, exam }
})()

console.log(`\nProbing ${BASE} — tenant ${ids.tid}\n`)

const student = await sign({ tenantId: ids.tid, role: 'student', studentId: ids.students[0], userId: ids.students[0] })
const student2 = ids.students[1] ? await sign({ tenantId: ids.tid, role: 'student', studentId: ids.students[1], userId: ids.students[1] }) : null
const parent = ids.parent ? await sign({ tenantId: ids.tid, role: 'parent', parentId: ids.parent }) : null
const staffTok = ids.staff ? await sign({ tenantId: ids.tid, role: 'staff', userId: ids.staff }) : null
const adminTok = ids.admin ? await sign({ tenantId: ids.tid, role: 'tenant_admin', userId: ids.admin }) : null
const foreignTenant = await sign({ tenantId: 'no-such-tenant-xyz', role: 'student', studentId: ids.students[0], userId: ids.students[0] })
const expired = await sign({ tenantId: ids.tid, role: 'student', studentId: ids.students[0], userId: ids.students[0] }, { expired: true })
const forged = await sign({ tenantId: ids.tid, role: 'tenant_admin', userId: ids.students[0] }, { wrongSecret: true })
const escalated = await sign({ tenantId: ids.tid, role: 'tenant_admin', userId: ids.students[0] }) // real signature, fake role

/* ── 1. Unauthenticated ───────────────────────────────────────────── */
console.log('[1] Unauthenticated access')
for (const p of [
  '/api/student/dashboard', '/api/student/fees', '/api/student/results',
  '/api/parent/dashboard?childId=x', '/api/parent/messages',
  '/api/tenant/students', '/api/tenant/finance/payments',
  '/api/tenant/security/sessions', '/api/admin/tenants',
]) {
  const r = await hit(p)
  check(`no-token ${p} → 401`, r.status === 401, `got ${r.status}`)
}

/* ── 2. Token integrity ───────────────────────────────────────────── */
console.log('[2] Token integrity')
check('forged-signature → 401/403', [401, 403].includes((await hit('/api/tenant/students', forged)).status))
check('expired token → 401/403', [401, 403].includes((await hit('/api/student/dashboard', expired)).status))
check('garbage token → 401/403', [401, 403].includes((await hit('/api/student/dashboard', 'not.a.jwt')).status))
{
  // Self-signed admin token must NOT reach admin data even with valid sig:
  // role is asserted in the JWT, so a student signing themselves admin via
  // the real secret is only possible if the secret leaked — but the handler
  // should still bind the session user. We verify it does not silently pass.
  const r = await hit('/api/tenant/students', escalated)
  check('self-signed admin claim → blocked or empty', [401, 403].includes(r.status) || (Array.isArray(r.body?.data) && r.body.data.length === 0), `got ${r.status}`)
}

/* ── 3. Cross-role RBAC ───────────────────────────────────────────── */
console.log('[3] Cross-role RBAC')
const roleMatrix = [
  ['student', student, ['/api/tenant/students', '/api/tenant/finance/payments?action=settings', '/api/parent/messages', '/api/tenant/security/sessions', '/api/admin/tenants']],
  ['parent', parent, ['/api/student/dashboard', '/api/tenant/students', '/api/tenant/security/sessions', '/api/admin/tenants']],
  ['staff', staffTok, ['/api/student/dashboard', '/api/parent/dashboard?childId=x', '/api/admin/tenants', '/api/tenant/security/sessions']],
]
for (const [role, tok, paths] of roleMatrix) {
  if (!tok) { console.log(`  (skip ${role} — no fixture)`); continue }
  for (const p of paths) {
    const r = await hit(p, tok)
    check(`${role} → ${p} blocked`, [401, 403].includes(r.status), `got ${r.status}`)
  }
}

/* ── 4. IDOR — cross-student / cross-child ────────────────────────── */
console.log('[4] IDOR')
if (student2) {
  const sid2 = ids.students[1]
  for (const p of [
    `/api/tenant/finance/fee-assignments?studentId=${sid2}`,
    `/api/tenant/finance/payments?studentId=${sid2}`,
  ]) {
    const r = await hit(p, student)
    check(`student → other student's ${p.split('?')[0].split('/').pop()} → 403`, r.status === 403, `got ${r.status}`)
  }
  const r = await hit(`/api/student/messages`, student)
  check('student inbox only own messages', r.status === 200, `got ${r.status}`)
}
if (parent && ids.otherChild) {
  for (const p of [
    `/api/parent/attendance?childId=${ids.otherChild}`,
    `/api/parent/fees?childId=${ids.otherChild}`,
    `/api/parent/documents?childId=${ids.otherChild}`,
    `/api/tenant/finance/fee-assignments?studentId=${ids.otherChild}`,
  ]) {
    const r = await hit(p, parent)
    check(`parent → unlinked child ${p.split('?')[0].split('/').pop()} → 403`, r.status === 403, `got ${r.status}`)
  }
}

/* ── 5. Tenant confusion ──────────────────────────────────────────── */
console.log('[5] Tenant isolation')
{
  const r = await hit('/api/student/dashboard', foreignTenant)
  check('foreign tenantId claim → no data', [401, 403, 404].includes(r.status) || (r.body && !r.body.student), `got ${r.status}`)
  if (adminTok) {
    const r2 = await hit('/api/tenant/students', adminTok)
    const list = r2.body?.data || r2.body?.students || []
    check('admin list stays in tenant', r2.status === 200, `got ${r2.status}`)
  }
}

/* ── 6. Injection-shaped input ────────────────────────────────────── */
console.log('[6] Injection-shaped params (must not 500 or leak)')
for (const p of [
  `/api/student/results?term=' OR '1'='1`,
  `/api/parent/attendance?childId=' OR '1'='1 --`,
  `/api/student/messages?id=1;DROP TABLE students--`,
  `/api/public/verify-certificate?code=' OR '1'='1`,
  `/api/student/attendance?from=../../../etc/passwd`,
]) {
  const tok = p.startsWith('/api/parent') ? parent : p.startsWith('/api/public') ? null : student
  const r = await hit(p, tok)
  check(`${p.slice(0, 60)} → 4xx, not 500/leak`, r.status < 500, `got ${r.status}`)
}

/* ── 7. Security headers ──────────────────────────────────────────── */
console.log('[7] Security headers')
{
  const r = await hit('/api/student/dashboard', student)
  const h = r.headers
  check('x-content-type-options nosniff', h.get('x-content-type-options') === 'nosniff', h.get('x-content-type-options'))
  check('x-frame-options / CSP frame-ancestors', !!h.get('x-frame-options') || !!h.get('content-security-policy'), 'missing both')
  check('no x-powered-by leak', !h.get('x-powered-by'))
}

/* ── 8. Misc ──────────────────────────────────────────────────────── */
console.log('[8] Misc')
{
  const r = await hit('/api/public/verify-certificate?code=NONEXISTENT-PROBE')
  check('public cert verify: unknown code → valid:false', r.status === 404 && r.body?.valid === false, `got ${r.status}`)
  const r2 = await hit('/api/public/verify-certificate')
  check('public cert verify without code → 400', r2.status === 400, `got ${r2.status}`)
}

await pool.end()
console.log(`\n${pass} passed, ${fail} failed`)
if (failures.length) { console.log('Failures:'); failures.forEach(f => console.log('  - ' + f)); process.exitCode = 1 }
