const { SignJWT } = require('jose')
const pg = require('pg')

const TID = 'f038d6a2-8957-45e6-a716-393dfd69173b'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const token = await new SignJWT({ tenantId: TID, role: 'tenant_admin', userId: 'probe' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))
  const H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }

  const sc = (await pool.query('SELECT COUNT(*) c FROM staff WHERE tenant_id=$1', [TID])).rows[0].c
  console.log('staff in tenant:', sc)

  const c = await fetch('http://localhost:3000/api/tenant/communications', {
    method: 'POST', headers: H,
    body: JSON.stringify({ title: 'E2E staff probe', body: 'probe body', audience: 'staff', channels: ['in-app'] }),
  })
  const cj = await c.json()
  const cid = (cj.data && cj.data.id) || cj.id
  console.log('create:', c.status, cid || JSON.stringify(cj).slice(0, 150))

  if (!cid) { await pool.end(); return }

  const s = await fetch(`http://localhost:3000/api/tenant/communications/${cid}?action=send`, { method: 'POST', headers: H })
  console.log('send:', s.status, JSON.stringify(await s.json()).slice(0, 250))

  const rc = (await pool.query('SELECT status, COUNT(*) c FROM communication_recipients WHERE communication_id=$1 GROUP BY status', [cid])).rows
  console.log('recipients:', JSON.stringify(rc))

  const sm = (await pool.query("SELECT COUNT(*) c FROM staff_messages WHERE tenant_id=$1 AND subject='E2E staff probe'", [TID])).rows[0].c
  console.log('staff_messages delivered:', sm)

  // staff inbox check: does staff/messages return it?
  const staffRow = (await pool.query('SELECT id FROM staff WHERE tenant_id=$1 LIMIT 1', [TID])).rows[0]
  if (staffRow) {
    const st = await new SignJWT({ tenantId: TID, role: 'staff', userId: staffRow.id, staffId: staffRow.id })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET))
    const m = await fetch('http://localhost:3000/api/staff/messages', { headers: { Authorization: 'Bearer ' + st } })
    const mj = await m.json().catch(() => ({}))
    const list = mj.data || mj.messages || mj || []
    const found = Array.isArray(list) && list.some((x) => x.subject === 'E2E staff probe')
    console.log('staff inbox sees it:', found, `(${m.status}, ${list.length || 0} messages)`)
  }
  await pool.end()
}
main().catch((e) => { console.error('PROBE ERR', e.message); process.exit(1) })
