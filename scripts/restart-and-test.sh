#!/bin/bash
echo "=== Restart app ==="
docker restart pisairtel-sms
sleep 5

echo "=== Reset staff password ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "UPDATE staff SET password_hash = NULL WHERE email = 'akoma@kreatixtech.com';"

echo ""
echo "=== Test login ==="
curl -s http://localhost:3000/api/tenant/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"akoma@kreatixtech.com"}'
echo ""

echo ""
echo "=== Run email tests ==="
bash /tmp/test-email.sh 2>&1
