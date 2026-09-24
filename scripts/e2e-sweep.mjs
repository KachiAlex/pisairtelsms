#!/usr/bin/env node
// Comprehensive live E2E sweep: GETs every routed endpoint per role,
// substitutes real entity IDs, and categorizes results:
//   PASS  200
//   PLAN  403 with subscription-upgrade body (plan gate working as designed)
//   WARN  other <500 (endpoint alive: validation/not-found/method/auth-shape)
//   FAIL  5xx or network error
//   SKIP  mutation-only action route, auth endpoint, cron, or no entity in DB
//
// Run inside the app container: docker exec pisairtel-sms node scripts/e2e-sweep.mjs
// Env: DATABASE_URL, JWT_SECRET. Optional: SWEEP_BASE_URL.

import pg from 'pg'
import { SignJWT } from 'jose'
import { readFileSync } from 'fs'

const BASE = process.env.SWEEP_BASE_URL || 'http://127.0.0.1:3000'
const secret = new TextEncoder().encode(process.env.JWT_SECRET)
const mint = (claims) =>
  new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(secret)

const SKIP_SOURCE = [
  /\/auth\/login/, /\/auth\/logout/, /reset-password/, /ws-monitoring/, /\/api\/cron\//,
  /\/api\/tenant\/cbt\/security\/snapshot/, // POST-only
]

// Route-source → param substitutions. null = skip (mutation action routes).
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
const q = (s, p) => pool.query(s, p).then((r) => r.rows).catch(() => [])
const one = async (sql, p) => (await q(sql, p))[0]?.id || null

async function main() {
  const tenant = (await q(`SELECT id, subscription_plan FROM tenants ORDER BY created_at LIMIT 1`))[0]
  if (!tenant) { console.error('no tenant'); process.exit(1) }
  const tid = tenant.id
  console.log(`tenant plan: ${tenant.subscription_plan}`)

  const staff = (await q(`SELECT id FROM staff WHERE tenant_id=$1 LIMIT 1`, [tid]))[0]
  const admin = (await q(`SELECT id FROM staff WHERE tenant_id=$1 AND role IN ('admin','tenant_admin') LIMIT 1`, [tid]))[0] || staff
  const student = (await q(`SELECT id FROM students WHERE tenant_id=$1 AND deleted_at IS NULL LIMIT 1`, [tid]))[0]
  const parentLink = (await q(`SELECT parent_id, student_id FROM parent_students WHERE tenant_id=$1 LIMIT 1`, [tid]))[0]

  const tokens = {
    admin: admin && (await mint({ tenantId: tid, role: 'tenant_admin', userId: admin.id })),
    staff: staff && (await mint({ tenantId: tid, role: 'staff', staffId: staff.id, userId: staff.id })),
    student: student && (await mint({ tenantId: tid, role: 'student', studentId: student.id, userId: student.id })),
    parent: parentLink && (await mint({ tenantId: tid, role: 'parent', parentId: parentLink.parent_id, childrenIds: [parentLink.student_id] })),
    super: await mint({ role: 'super_admin', userId: 'sweep' }),
  }

  // Real entity IDs for param substitution
  const ids = {
    exam: await one(`SELECT id FROM exams WHERE tenant_id=$1 AND deleted_at IS NULL LIMIT 1`, [tid]),
    question: await one(`SELECT id FROM questions_bank WHERE tenant_id=$1 LIMIT 1`, [tid]),
    alert: await one(`SELECT id FROM system_alerts WHERE tenant_id=$1 LIMIT 1`, [tid]),
    notification: await one(`SELECT id FROM notifications WHERE tenant_id=$1 LIMIT 1`, [tid]),
    announcement: await one(`SELECT id FROM announcements WHERE tenant_id=$1 LIMIT 1`, [tid]),
    reason: await one(`SELECT id FROM absence_reasons WHERE tenant_id=$1 LIMIT 1`, [tid]),
    device: await one(`SELECT id FROM biometric_devices WHERE tenant_id=$1 LIMIT 1`, [tid]),
    feeStruct: await one(`SELECT id FROM fee_structures WHERE tenant_id=$1 LIMIT 1`, [tid]),
    feeAssign: await one(`SELECT id FROM fee_assignments WHERE tenant_id=$1 LIMIT 1`, [tid]),
    payment: await one(`SELECT id FROM payments WHERE tenant_id=$1 LIMIT 1`, [tid]),
    class: await one(`SELECT id FROM classes WHERE tenant_id=$1 LIMIT 1`, [tid]),
    student: student?.id || null,
    staffMessage: await one(`SELECT id FROM staff_messages WHERE tenant_id=$1 LIMIT 1`, [tid]),
    stuMessage: await one(`SELECT id FROM student_messages WHERE tenant_id=$1 LIMIT 1`, [tid]),
    apikey: await one(`SELECT id FROM api_keys WHERE tenant_id=$1 LIMIT 1`, [tid]),
    lms: await one(`SELECT id FROM lms_integrations WHERE tenant_id=$1 LIMIT 1`, [tid]),
    exemption: await one(`SELECT id FROM fee_exemptions WHERE tenant_id=$1 LIMIT 1`, [tid]),
    override: await one(`SELECT id FROM fee_class_overrides WHERE tenant_id=$1 LIMIT 1`, [tid]),
    gateway: await one(`SELECT id FROM payment_gateway_configs WHERE tenant_id=$1 LIMIT 1`, [tid]),
  }

  const SUBS = {
    '/api/tenant/integrations/biometric-devices/:id': { id: ids.device },
    '/api/tenant/integrations/biometric-devices/:id/:action': null,
    '/api/tenant/integrations/biometric-devices/:id/sync/:syncId': null,
    '/api/tenant/integrations/payment-gateway/:id/status': { id: ids.gateway },
    '/api/tenant/integrations/payment-gateway/:action': null,
    '/api/tenant/integrations/api-management/:id': { id: ids.apikey },
    '/api/tenant/integrations/api-management/:id/:action': null,
    '/api/tenant/finance/fee-assignments/:faId/exemptions/:eid/:action': null,
    '/api/tenant/finance/fee-assignments/:faId/exemptions/:eid': { faId: ids.feeAssign, eid: ids.exemption },
    '/api/tenant/finance/fee-assignments/:faId/exemptions': { faId: ids.feeAssign },
    '/api/tenant/finance/fee-assignments/:id/:action': null,
    '/api/tenant/finance/fee-assignments/:id': { id: ids.feeAssign },
    '/api/tenant/finance/fee-structures/:id/class-overrides/preview': { id: ids.feeStruct },
    '/api/tenant/finance/fee-structures/:id/class-overrides/:oid': { id: ids.feeStruct, oid: ids.override },
    '/api/tenant/finance/fee-structures/:id/:action': { id: ids.feeStruct, action: 'history' },
    '/api/tenant/finance/fee-structures/:id': { id: ids.feeStruct },
    '/api/tenant/finance/reconciliation/:action': { action: 'summary' },
    '/api/tenant/notifications/:id': { id: ids.notification },
    '/api/tenant/branding/:action': { action: 'logo' },
    '/api/tenant/finance/payments/:id/:action': { id: ids.payment, action: 'receipt' },
    '/api/tenant/finance/payments/:id': { id: ids.payment },
    '/api/tenant/integrations/lms/:id/sync/:syncRef': null,
    '/api/tenant/integrations/lms/:id/:action': null,
    '/api/tenant/integrations/lms/:id': { id: ids.lms },
    '/api/tenant/finance/reports/:report': { report: 'summary' },
    '/api/tenant/alerts/:id/:action': null,
    '/api/tenant/alerts/:id': { id: ids.alert },
    '/api/tenant/communications/:seg1': { seg1: 'logs' },
    '/api/tenant/communications/:seg1/:seg2': null,
    '/api/student/messages/:id/read': { id: ids.stuMessage },
    '/api/tenant/cbt/exams/:seg1': { seg1: ids.exam },
    '/api/tenant/cbt/exams/:seg1/:seg2': { seg1: ids.exam, seg2: 'questions' },
    '/api/tenant/cbt/security/:id/:action': null,
    '/api/tenant/cbt/security/:id': { id: ids.exam },
    '/api/student/exams/:examId/paper': { examId: ids.exam },
    '/api/student/exams/:examId/start': { examId: ids.exam },
    '/api/student/exams/:examId/progress': { examId: ids.exam },
    '/api/student/exams/:examId/submit': { examId: ids.exam },
    '/api/tenant/biometric-devices/:deviceId/test-connection': { deviceId: ids.device },
    '/api/tenant/biometric-devices/:deviceId/sync-logs': { deviceId: ids.device },
    '/api/parent/announcements/:announcementId/read': { announcementId: ids.announcement },
    '/api/parent/notifications/:notificationId/read': { notificationId: ids.notification },
    '/api/tenant/biometric-devices/:deviceId/sync': { deviceId: ids.device },
    '/api/tenant/biometric-devices/:deviceId': { deviceId: ids.device },
    '/api/tenant/absence-reasons/:reasonId': { reasonId: ids.reason },
    '/api/staff/classes/:classId/students': { classId: ids.class },
    '/api/staff/messages/:messageId/read': { messageId: ids.staffMessage },
    '/api/staff/students/:studentId': { studentId: ids.student },
    '/api/parent/children/:childId': { childId: ids.student },
    '/api/tenant/cbt/questions/:id': { id: ids.question },
  }

  const sources = [...new Set(JSON.parse(readFileSync('routes.json', 'utf8')).rewrites.map((r) => r.source))]

  const roleFor = (s) => {
    if (s.startsWith('/api/tenant/') || s === '/api/student-documents' || s === '/api/student-health') return 'admin'
    if (s.startsWith('/api/staff/')) return 'staff'
    if (s.startsWith('/api/student/')) return 'student'
    if (s.startsWith('/api/parent/')) return 'parent'
    if (s.startsWith('/api/admin/') || s.startsWith('/api/super-admin/')) return 'super'
    if (s.startsWith('/api/public/')) return 'public'
    return 'skip'
  }

  const results = { PASS: [], PLAN: [], WARN: [], FAIL: [], SKIP: [] }
  const childId = parentLink?.student_id

  for (const src of sources) {
    if (SKIP_SOURCE.some((re) => re.test(src))) { results.SKIP.push(src + ' (auth/cron/ws)'); continue }
    const role = roleFor(src)
    if (role === 'skip') { results.SKIP.push(src + ' (internal)'); continue }

    let path = src
    if (path.includes(':')) {
      const sub = SUBS[src]
      if (sub === undefined) { results.SKIP.push(src + ' (no param map)'); continue }
      if (sub === null) { results.SKIP.push(src + ' (mutation route)'); continue }
      const missing = Object.entries(sub).filter(([, v]) => !v).map(([k]) => k)
      if (missing.length) { results.SKIP.push(src + ` (no entity: ${missing.join(',')})`); continue }
      for (const [k, v] of Object.entries(sub)) path = path.replace(`:${k}`, encodeURIComponent(v))
      if (path.includes(':')) { results.SKIP.push(src + ' (unresolved param)'); continue }
    }
    if (role === 'parent' && !path.includes('childId=') && !/profile|notifications|notification-preferences|change-password|auth/.test(path)) {
      path += (path.includes('?') ? '&' : '?') + `childId=${childId}`
    }

    const token = role === 'public' ? null : tokens[role]
    if (!token && role !== 'public') { results.SKIP.push(src + ` (no ${role} entity)`); continue }

    try {
      const res = await fetch(BASE + path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(15000),
      })
      const status = res.status
      if (status === 200) results.PASS.push(`${status} ${role} ${src}`)
      else if (status === 403) {
        const body = await res.text().catch(() => '')
        if (/upgrade|does not include access/i.test(body)) results.PLAN.push(`${src}`)
        else results.WARN.push(`${status} ${role} ${src}`)
      }
      else if (status >= 500) results.FAIL.push(`${status} ${role} ${src}`)
      else results.WARN.push(`${status} ${role} ${src}`)
    } catch (err) {
      results.FAIL.push(`ERR ${role} ${src} — ${err.message}`)
    }
  }

  console.log(`\n===== RESULTS =====`)
  console.log(`PASS: ${results.PASS.length}  PLAN(gated): ${results.PLAN.length}  WARN: ${results.WARN.length}  FAIL: ${results.FAIL.length}  SKIP: ${results.SKIP.length}  TOTAL: ${sources.length}`)
  if (results.FAIL.length) { console.log('\n--- FAILURES (5xx/ERR) ---'); results.FAIL.forEach((l) => console.log(' ', l)) }
  if (results.WARN.length) { console.log('\n--- WARN (non-200 <500) ---'); results.WARN.forEach((l) => console.log(' ', l)) }
  if (results.PLAN.length) { console.log('\n--- PLAN-GATED 403s (expected on this plan) ---'); results.PLAN.forEach((l) => console.log(' ', l)) }

  await pool.end()
  process.exit(results.FAIL.length ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
