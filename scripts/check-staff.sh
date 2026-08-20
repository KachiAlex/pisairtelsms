#!/bin/bash
echo "=== Staff table schema ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "\d staff" | head -30
echo ""
echo "=== Staff records (password check) ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "SELECT email, role, (password_hash IS NOT NULL) as has_pwd, length(password_hash) as pwd_len FROM staff LIMIT 5;"
echo ""
echo "=== Test login with correct email ==="
curl -s http://localhost:80/api/tenant/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"ChangeMe@123"}'
echo ""
