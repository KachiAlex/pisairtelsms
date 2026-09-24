const { SignJWT } = require('jose')
const pg = require('pg')

const TID = 'f038d6a2-8957-45e6-a716-393dfd69173b'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adminT = await new SignJWT({ tenantId: TID, role: 'tenant_admin', userId: 'probe' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))
  const H = { Authorization: 'Bearer ' + adminT, 'Content-Type': 'application/json' }

  // 1) create student
  const c = await fetch('http://localhost:3000/api/tenant/students', {
    method: 'POST', headers: H,
    body: JSON.stringify({ student: { name: 'Probe Student', class: 'JSS 1', arm: 'A', gender: 'Male', status: 'Active', guardian: 'Probe Guardian', phone: '0800000000', guardianEmail: 'probe@example.com' } }),
  })
  const cj = await c.json()
  const stu = cj.data
  console.log('create:', c.status, '| admissionNo:', stu?.admissionNo, '| tempPassword:', stu?.tempPassword)

  if (!stu?.id) { await pool.end(); return }

  // 2) password_hash stored?
  const row = (await pool.query('SELECT password_hash IS NOT NULL AS has FROM students WHERE id=$1', [stu.id])).rows[0]
  console.log('password_hash set:', row.has)

  // 3) student login with returned creds
  const login = await fetch('http://localhost:3000/api/student/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admissionNumber: stu.admissionNo, password: stu.tempPassword }),
  })
  const lj = await login.json().catch(() => ({}))
  console.log('student login:', login.status, lj.success || lj.error || '')

  // 4) reset-password action
  const rp = await fetch(`http://localhost:3000/api/tenant/students?id=${stu.id}&action=reset-password`, { method: 'PUT', headers: H, body: '{}' })
  const rj = await rp.json().catch(() => ({}))
  console.log('reset-password:', rp.status, '| new pass:', rj.data?.tempPassword)

  // 5) cleanup
  await fetch(`http://localhost:3000/api/tenant/students?id=${stu.id}`, { method: 'DELETE', headers: H })
  await pool.query('DELETE FROM students WHERE id=$1', [stu.id]).catch(() => {})
  console.log('cleanup done')
  await pool.end()
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
