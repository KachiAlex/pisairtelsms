#!/bin/bash
echo "=== 1. Environment Variables ==="
docker exec pisairtel-sms env | grep -E 'POSTGRES|DATABASE|JWT|NODE_ENV|NEON'
echo ""

echo "=== 2. Database Connection Test ==="
docker exec pisairtel-sms node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query('SELECT NOW() as now, current_database() as db').then(r => {
  console.log('Connected to DB:', r.rows[0].db);
  console.log('Server time:', r.rows[0].now);
  pool.end();
}).catch(e => { console.error('DB Error:', e.message); pool.end(); });
"
echo ""

echo "=== 3. Test Login API ==="
LOGIN_RESP=$(curl -s http://localhost:80/api/tenant/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"admin@pisairtel.com","password":"admin123"}')
echo "Login response: $LOGIN_RESP"
echo ""

echo "=== 4. Test Staff Login API ==="
STAFF_RESP=$(curl -s http://localhost:80/api/staff/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"teacher@pisairtel.com","password":"teacher123"}')
echo "Staff login response: $STAFF_RESP"
echo ""

echo "=== 5. Test Student Login API ==="
STUDENT_RESP=$(curl -s http://localhost:80/api/student/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"student@pisairtel.com","password":"student123"}')
echo "Student login response: $STUDENT_RESP"
echo ""

echo "=== 6. Test Parent Login API ==="
PARENT_RESP=$(curl -s http://localhost:80/api/parent/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"parent@pisairtel.com","password":"parent123"}')
echo "Parent login response: $PARENT_RESP"
echo ""

echo "=== 7. Database Table Count ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
echo ""

echo "=== 8. Sample Data Verification ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "
SELECT 'students' as tbl, count(*) FROM students
UNION ALL SELECT 'staff', count(*) FROM staff
UNION ALL SELECT 'tenants', count(*) FROM tenants
UNION ALL SELECT 'tenant_users', count(*) FROM tenant_users
UNION ALL SELECT 'fee_structures', count(*) FROM fee_structures
UNION ALL SELECT 'exams', count(*) FROM exams
UNION ALL SELECT 'subjects', count(*) FROM subjects
UNION ALL SELECT 'announcements', count(*) FROM announcements;
"
echo ""

echo "=== 9. Check Staff Emails in DB ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "SELECT email, role FROM staff LIMIT 5;"
echo ""

echo "=== 10. Check Student Emails in DB ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "SELECT admission_no, name, class FROM students LIMIT 5;"
echo ""

echo "=== 11. No Neon References ==="
NEON_COUNT=$(docker exec pisairtel-sms env | grep -ic neon || echo 0)
echo "Neon env vars found: $NEON_COUNT"
echo ""

echo "=== 12. Container Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep pisairtel
