#!/bin/bash
echo "=== Reset password ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "UPDATE staff SET password_hash = NULL WHERE email = 'akoma@kreatixtech.com';"
echo ""
echo "=== Try login on port 3000 ==="
curl -v http://localhost:3000/api/tenant/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"akoma@kreatixtech.com"}' 2>&1
echo ""
echo ""
echo "=== Server logs ==="
docker logs pisairtel-sms 2>&1 | tail -20
