#!/usr/bin/env node
// Live smoke check: mints per-role JWTs and hits read endpoints, asserting
// no 5xx responses. Designed to run inside the app container post-deploy:
//
//   docker exec pisairtel-sms node scripts/smoke-check.mjs
//
// Env: DATABASE_URL, JWT_SECRET (both already set in the container).
// Optional: SMOKE_BASE_URL (default http://127.0.0.1:3000)

import pg from 'pg'
import { SignJWT } from 'jose'

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

async function mint(claims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}

async function get(path, token) {
  try {
    const res = await fetch(BASE + path, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    })
    return res.status
  } catch (err) {
    return `ERR ${err.message}`
  }
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  const q = (s) => pool.query(s).then((r) => r.rows)

  // Discover real entities to build valid claims
  const tenant = (await q(`SELECT id FROM tenants ORDER BY created_at LIMIT 1`))[0]
  if (!tenant) {
    console.error('smoke: no tenant found in DB')
    process.exit(1)
  }
  const admin = (await q(
    `SELECT id FROM users WHERE role = 'tenant_admin' AND tenant_id = '${tenant.id}' LIMIT 1`
  ))[0]
  const staff = (await q(
    `SELECT id FROM staff WHERE tenant_id = '${tenant.id}' LIMIT 1`
  ))[0]
  const student = (await q(
    `SELECT id FROM students WHERE tenant_id = '${tenant.id}' AND deleted_at IS NULL LIMIT 1`
  ))[0]
  const parentLink = (await q(
    `SELECT ps.parent_id, ps.student_id FROM parent_students ps
     JOIN parents p ON p.id = ps.parent_id
     WHERE ps.tenant_id = '${tenant.id}' LIMIT 1`
  ))[0]

  const tid = tenant.id

  const tokens = {
    admin: admin && (await mint({ tenantId: tid, role: 'tenant_admin', userId: admin.id })),
    staff: staff && (await mint({ tenantId: tid, role: 'staff', staffId: staff.id, userId: staff.id })),
    student: student && (await mint({ tenantId: tid, role: 'student', studentId: student.id, userId: student.id })),
    parent: parentLink && (await mint({
      tenantId: tid, role: 'parent', parentId: parentLink.parent_id,
      childrenIds: [parentLink.student_id],
    })),
  }

  const childId = parentLink?.student_id

  const checks = [
    ['admin', '/api/tenant/integrated-dashboard'],
    ['admin', '/api/tenant/students?limit=5'],
    ['admin', '/api/tenant/staff?limit=5'],
    ['admin', '/api/tenant/finance/payments'],
    ['admin', '/api/tenant/finance/fee-structures'],
    ['admin', '/api/tenant/alerts'],
    ['admin', '/api/tenant/alerts/statistics/summary'],
    ['admin', '/api/tenant/communications'],
    ['admin', '/api/tenant/communications/logs'],
    ['admin', '/api/tenant/communications/templates'],
    ['admin', '/api/tenant/cbt/questions/stats'],
    ['admin', '/api/tenant/cbt/offline-sync?type=statistics'],
    ['admin', '/api/tenant/attendance/analytics/dashboard'],
    ['admin', '/api/tenant/absence-reasons'],
    ['admin', '/api/tenant/security/incidents'],
    ['admin', '/api/tenant/security/overview'],
    ['admin', '/api/tenant/system-health?type=services'],
    ['admin', '/api/tenant/academics/classes'],
    ['admin', '/api/tenant/academics/subjects?namesOnly=true'],
    ['admin', '/api/tenant/timetable/calendar?resource=terms'],
    ['admin', '/api/tenant/support-tickets?type=statistics'],
    ['staff', '/api/staff/classes'],
    ['staff', '/api/staff/dashboard'],
    ['staff', '/api/staff/messages'],
    ['staff', '/api/tenant/behavioral?class=JSS 1'],
    ['student', '/api/student/dashboard'],
    ['student', '/api/student/exams'],
    ['student', '/api/student/attendance'],
    ['student', '/api/student/timetable'],
    ['student', '/api/student/announcements'],
    ['student', '/api/student/messages'],
    ['student', '/api/student/results'],
    ['parent', `/api/parent/dashboard?childId=${childId}`],
    ['parent', `/api/parent/attendance?childId=${childId}`],
    ['parent', `/api/parent/academic?childId=${childId}`],
    ['parent', `/api/parent/exams?childId=${childId}`],
    ['parent', `/api/parent/behavioral?childId=${childId}`],
    ['parent', `/api/parent/fees?childId=${childId}`],
    ['parent', `/api/parent/announcements?childId=${childId}`],
    ['parent', `/api/parent/events?childId=${childId}`],
    ['parent', `/api/parent/timetable?childId=${childId}`],
  ]

  let fail = 0
  let warn = 0
  for (const [role, path] of checks) {
    const token = tokens[role]
    if (!token) {
      console.log(`SKIP  ${role.padEnd(8)} ${path} (no ${role} entity in DB)`)
      continue
    }
    const status = await get(path, token)
    if (typeof status === 'number' && status < 500) {
      const tag = status === 200 ? 'PASS' : 'WARN'
      if (status !== 200) warn++
      console.log(`${tag}  ${status}  ${role.padEnd(8)} ${path}`)
    } else {
      fail++
      console.log(`FAIL  ${status}  ${role.padEnd(8)} ${path}`)
    }
  }

  await pool.end()
  console.log(`\nsmoke: ${fail} failed, ${warn} non-200, ${checks.length} checked`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`smoke: ${err.message}`)
  process.exit(1)
})
