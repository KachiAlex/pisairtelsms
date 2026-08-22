#!/bin/bash
echo "=== DB check ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT email, role, CASE WHEN password_hash IS NULL THEN 'NULL' ELSE 'SET' END as pwd_status FROM staff WHERE email='akoma@kreatixtech.com';"
echo ""
echo "=== Reset password ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "UPDATE staff SET password_hash = NULL WHERE email = 'akoma@kreatixtech.com';"
echo ""
echo "=== Try login ==="
curl -s http://localhost:80/api/tenant/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"akoma@kreatixtech.com"}'
echo ""
echo ""
echo "=== Server logs ==="
docker logs pisairtel-sms 2>&1 | tail -15
