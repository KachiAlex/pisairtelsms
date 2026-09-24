const pg = require('pg')
const fs = require('fs')

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const sql = fs.readFileSync(process.argv[2] || '/app/api/_migrations/026_rls_tenant_isolation.sql', 'utf8')

  // 1) Apply for real (idempotent) — needed to test SET LOCAL ROLE behavior
  await pool.query(sql)
  console.log('migration applied')

  const info = await pool.query(
    `SELECT COUNT(*) c FROM pg_policies WHERE policyname = 'tenant_isolation'`
  )
  console.log('policies created:', info.rows[0].c)

  // 2) Simulate a tenant request: BEGIN + SET LOCAL ROLE + set_config, query students
  const TID = 'f038d6a2-8957-45e6-a716-393dfd69173b'
  const c = await pool.connect()
  try {
    await c.query(`BEGIN; SET LOCAL ROLE app_user; SELECT set_config('app.tenant_id', '${TID}', true)`)
    const own = await c.query('SELECT COUNT(*) c FROM students')
    console.log('tenant-scoped students:', own.rows[0].c)
    const none = await c.query(`SELECT set_config('app.tenant_id', 'other-tenant', true)`)
    const other = await c.query('SELECT COUNT(*) c FROM students')
    console.log('foreign-tenant students:', other.rows[0].c, '(must be 0)')
    await c.query('COMMIT')
  } catch (e) {
    console.log('SCOPED QUERY ERR:', e.message)
    await c.query('ROLLBACK').catch(() => {})
  } finally {
    c.release()
  }

  // 3) owner context still sees everything (RLS skips owners)
  const all = await pool.query('SELECT COUNT(*) c FROM students')
  console.log('owner-context students:', all.rows[0].c)
  await pool.end()
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
