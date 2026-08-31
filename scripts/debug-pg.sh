#!/bin/bash
echo "=== Test pg connection directly ==="
docker exec pisairtel-sms node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://pisairtel:PisairtelSMS2024!@postgres:5432/pisairtel_sms',
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

echo ""
echo "=== Test @vercel/postgres createClient ==="
docker exec pisairtel-sms node -e "
const { createClient } = require('@vercel/postgres');
(async () => {
  try {
    const client = await createClient();
    await client.connect();
    const r = await client.query('SELECT count(*) FROM staff');
    console.log('createClient OK:', r.rows[0].count, 'staff');
    await client.end();
  } catch(e) {
    console.log('createClient ERROR:', e.message);
  }
})();
" 2>&1

echo ""
echo "=== Test @vercel/postgres sql ==="
docker exec pisairtel-sms node -e "
const { sql } = require('@vercel/postgres');
(async () => {
  try {
    const r = await sql\`SELECT count(*) as count FROM staff\`;
    console.log('sql OK:', r.rows[0].count, 'staff');
  } catch(e) {
    console.log('sql ERROR:', e.message);
  }
})();
" 2>&1
