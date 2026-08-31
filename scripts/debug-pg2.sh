#!/bin/bash
echo "=== Test direct psql from app container ==="
docker exec pisairtel-sms sh -c 'PGPASSWORD=PisairtelSMS2024! psql -h postgres -U pisairtel -d pisairtel_sms -c "SELECT count(*) FROM staff;"' 2>&1

echo ""
echo "=== Check postgres pg_hba.conf ==="
docker exec pisairtel-postgres cat /var/lib/postgresql/data/pg_hba.conf 2>&1 | grep -v '^#' | grep -v '^$'

echo ""
echo "=== Test with URL-encoded password ==="
docker exec pisairtel-sms node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  host: 'postgres',
  port: 5432,
  user: 'pisairtel',
  password: 'PisairtelSMS2024!',
  database: 'pisairtel_sms',
  max: 5
});
pool.query('SELECT count(*) FROM staff').then(r => {
  console.log('pg Pool OK:', r.rows[0].count, 'staff');
  pool.end();
}).catch(e => {
  console.log('pg Pool ERROR:', e.message);
  pool.end();
});
" 2>&1
