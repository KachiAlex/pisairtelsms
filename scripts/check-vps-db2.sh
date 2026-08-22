#!/bin/bash
echo "=== Row counts for key tables (fixed) ==="
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
UNION ALL SELECT 'exams', count(*) FROM exams
UNION ALL SELECT 'parents', count(*) FROM parents
UNION ALL SELECT 'classes', count(*) FROM classes
UNION ALL SELECT 'subjects', count(*) FROM subjects
UNION ALL SELECT 'results', count(*) FROM results
UNION ALL SELECT 'tenants', count(*) FROM tenants
UNION ALL SELECT 'tenant_settings', count(*) FROM tenant_settings
ORDER BY 1;
" 2>&1

echo ""
echo "=== Check for any .env with NEON on VPS ==="
grep -i neon /opt/pisairtel-sms/.env 2>&1 || echo "No .env file or no neon references"

echo ""
echo "=== Check .env file contents (keys only) ==="
cat /opt/pisairtel-sms/.env 2>&1 | sed 's/=.*/=***/' || echo "No .env file found"
