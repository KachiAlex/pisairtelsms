#!/bin/bash
echo "=== 1. App container env - NO NEON REFERENCES ==="
docker exec pisairtel-sms env | grep -E 'POSTGRES|DATABASE'
echo ""

echo "=== 2. DB connection from inside app container ==="
docker exec pisairtel-sms node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query('SELECT current_database() as db, count(*) FROM students').then(r => {
  console.log('DB:', r.rows[0].db, '| Students:', r.rows[0].count);
  return pool.query('SELECT email, role FROM staff WHERE email LIKE \$1', ['%kreatix%']);
}).then(r => {
  r.rows.forEach(row => console.log('Staff found:', row.email, row.role));
  pool.end();
}).catch(e => { console.error('Error:', e.message); pool.end(); });
"
echo ""

echo "=== 3. Login API test (proves DB read) ==="
curl -s http://localhost:80/api/tenant/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"WrongPassword"}'
echo ""
echo "(Above should say 'Invalid email or password' = DB was queried successfully)"
echo ""

echo "=== 4. Student login API test ==="
curl -s http://localhost:80/api/student/auth/login -X POST -H 'Content-Type: application/json' -d '{"admissionNumber":"SCH/2026/0001","password":"WrongPassword"}'
echo ""
echo "(Above should say invalid credentials = DB was queried successfully)"
echo ""

echo "=== 5. Public API test (applications) ==="
curl -s http://localhost:80/api/tenant/applications -X GET
echo ""
echo "(Above should return data or auth error = API is live)"
echo ""

echo "=== 6. Frontend serving test ==="
curl -s http://localhost:80/ | head -5
echo ""

echo "=== 7. No Neon connection strings anywhere ==="
docker exec pisairtel-sms grep -r "neon.tech" /app/api/ 2>/dev/null | wc -l
echo "(Should be 0)"
echo ""

echo "=== 8. All containers running ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep pisairtel
