#!/bin/bash
# Reset password directly to a known value, then test login
docker exec pisairtel-sms node -e "
const { Pool } = require('pg');
const crypto = require('crypto');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync('admin123', salt, 64);
  const hash = salt + ':' + derived.toString('hex');
  await pool.query('UPDATE staff SET password_hash = \$1 WHERE email = \$2', [hash, 'akoma@kreatixtech.com']);
  console.log('Password reset to admin123 for akoma@kreatixtech.com');
  await pool.end();
})();
" 2>&1

echo ""
echo "=== Test tenant admin login with admin123 ==="
curl -s -X POST http://localhost:3000/api/tenant/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"akoma@kreatixtech.com","password":"admin123"}'
echo ""

echo ""
echo "=== Reset staff password too ==="
docker exec pisairtel-sms node -e "
const { Pool } = require('pg');
const crypto = require('crypto');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync('admin123', salt, 64);
  const hash = salt + ':' + derived.toString('hex');
  await pool.query('UPDATE staff SET password_hash = \$1 WHERE email = \$2', [hash, 'onyedika.akoma@gmail.com']);
  console.log('Password reset to admin123 for onyedika.akoma@gmail.com');
  await pool.end();
})();
" 2>&1

echo ""
echo "=== Test staff login with admin123 ==="
curl -s -X POST http://localhost:3000/api/staff/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"onyedika.akoma@gmail.com","password":"admin123"}'
echo ""

echo ""
echo "=== Test forgot password API again ==="
curl -s -X POST http://localhost:3000/api/tenant/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"akoma@kreatixtech.com"}'
echo ""
