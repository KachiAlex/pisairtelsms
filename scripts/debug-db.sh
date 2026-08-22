#!/bin/bash
echo "=== Check app env ==="
docker exec pisairtel-sms printenv DATABASE_URL 2>&1 | head -c 60
echo ""
echo "=== Check postgres ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT count(*) FROM staff;" 2>&1
echo ""
echo "=== Test from app container ==="
docker exec pisairtel-sms node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT count(*) FROM staff').then(r => {
  console.log('DB OK:', r.rows[0].count, 'staff');
  pool.end();
}).catch(e => {
  console.log('DB ERROR:', e.message);
  pool.end();
});
" 2>&1
echo ""
echo "=== Check fetchStaffByEmail ==="
docker exec pisairtel-sms node -e "
const { sql } = require('@vercel/postgres');
sql\`SELECT id, email, role, password_hash FROM staff WHERE email = 'akoma@kreatixtech.com'\`.then(r => {
  console.log('Result:', JSON.stringify(r.rows));
  process.exit(0);
}).catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});
" 2>&1
