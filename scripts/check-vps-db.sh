#!/bin/bash
echo "=== App DATABASE_URL ==="
docker exec pisairtel-sms printenv DATABASE_URL 2>&1 | head -c 80
echo ""
echo ""
echo "=== App POSTGRES_URL ==="
docker exec pisairtel-sms printenv POSTGRES_URL 2>&1 | head -c 80
echo ""
echo ""

echo "=== VPS Postgres tables ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
" 2>&1

echo ""
echo "=== Row counts for key tables ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "
SELECT 'students' as tbl, count(*) FROM students
UNION ALL SELECT 'staff', count(*) FROM staff
UNION ALL SELECT 'tenant_users', count(*) FROM tenant_users
UNION ALL SELECT 'staff_attendance', count(*) FROM staff_attendance
UNION ALL SELECT 'attendance_records', count(*) FROM attendance_records
UNION ALL SELECT 'payments', count(*) FROM payments
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'guardian_notifications', count(*) FROM guardian_notifications
UNION ALL SELECT 'bulk_notifications', count(*) FROM bulk_notifications
UNION ALL SELECT 'fee_assignments', count(*) FROM fee_assignments
UNION ALL SELECT 'exam_results', count(*) FROM exam_results
UNION ALL SELECT 'cbt_exams', count(*) FROM cbt_exams
ORDER BY 1;
" 2>&1

echo ""
echo "=== Sample staff data ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "
SELECT id, name, email, role, status FROM staff ORDER BY created_at LIMIT 5;
" 2>&1

echo ""
echo "=== Sample students data ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "
SELECT id, name, email, class FROM students ORDER BY created_at LIMIT 5;
" 2>&1

echo ""
echo "=== Sample tenant_users ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "
SELECT id, name, email, role, status FROM tenant_users ORDER BY created_at LIMIT 5;
" 2>&1

echo ""
echo "=== Total tables count ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "
SELECT count(*) FROM pg_tables WHERE schemaname='public';
" 2>&1
