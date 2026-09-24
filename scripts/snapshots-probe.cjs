const { SignJWT } = require('jose')
const pg = require('pg')

const TID = 'f038d6a2-8957-45e6-a716-393dfd69173b'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const mk = (role) => new SignJWT({ tenantId: TID, role, userId: 'probe' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))
  const adminT = await mk('tenant_admin')
  const H = { Authorization: 'Bearer ' + adminT }

  // an exam in this tenant (any) + snapshot count
  const ex = (await pool.query("SELECT id FROM exams WHERE tenant_id=$1 AND deleted_at IS NULL LIMIT 1", [TID])).rows[0]
  if (!ex) { console.log('no exam to test'); await pool.end(); return }
  const cnt = (await pool.query('SELECT COUNT(*) c FROM proctoring_snapshots WHERE exam_id=$1', [ex.id])).rows[0].c
  console.log('exam:', ex.id, '| snapshots:', cnt)

  // snapshots list
  const l = await fetch(`http://localhost:3000/api/tenant/cbt/security/${ex.id}/snapshots`, { headers: H })
  const lj = await l.json()
  console.log('snapshots list:', l.status, `(${Array.isArray(lj.data) ? lj.data.length : 'n/a'} rows)`)

  // single image
  if (lj.data?.[0]) {
    const im = await fetch(`http://localhost:3000/api/tenant/cbt/security/${ex.id}/snapshot-image?snapshotId=${lj.data[0].id}`, { headers: H })
    const ij = await im.json()
    console.log('image fetch:', im.status, ij.data?.image?.slice(0, 30) || JSON.stringify(ij).slice(0, 120))
  }

  // student blocked
  const st = await mk('student')
  const sb = await fetch(`http://localhost:3000/api/tenant/cbt/security/${ex.id}/snapshots`, { headers: { Authorization: 'Bearer ' + st } })
  console.log('student blocked:', sb.status === 403 ? 'yes (403)' : `NO — ${sb.status}`)

  // cross-tenant: other tenant's exam
  const other = (await pool.query("SELECT id FROM exams WHERE tenant_id != $1 AND deleted_at IS NULL LIMIT 1", [TID])).rows[0]
  if (other) {
    const xt = await fetch(`http://localhost:3000/api/tenant/cbt/security/${other.id}/snapshots`, { headers: H })
    console.log('cross-tenant:', xt.status === 404 ? 'blocked (404)' : `LEAK — ${xt.status}`)
  }

  // plan gate: cbt/security is exams.security (starter=false) — starter tenant should 403
  console.log('(note: Kreatix is starter — expect 403 plan-gate if exams.security is false)')
  await pool.end()
}
main().catch((e) => { console.error('PROBE ERR', e.message); process.exit(1) })
