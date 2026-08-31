#!/bin/bash
BASE="http://localhost:80"

echo "=== Test 1: Admin login with email as password ==="
RESP=$(curl -s "$BASE/api/tenant/auth/login" -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"akoma@kreatixtech.com"}')
echo "$RESP"
echo ""

echo "=== Test 2: Staff login ==="
RESP2=$(curl -s "$BASE/api/staff/auth/login" -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"akoma@kreatixtech.com"}')
echo "$RESP2"
echo ""

echo "=== Test 3: Staff login with onyedika ==="
RESP3=$(curl -s "$BASE/api/staff/auth/login" -X POST -H 'Content-Type: application/json' -d '{"email":"onyedika.akoma@gmail.com","password":"onyedika.akoma@gmail.com"}')
echo "$RESP3"
echo ""

echo "=== Test 4: Check password hash format ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT email, role, length(password_hash), substring(password_hash,1,4) FROM staff LIMIT 5;"
echo ""

echo "=== Test 5: Try super admin login ==="
RESP5=$(curl -s "$BASE/api/super-admin/auth/login" -X POST -H 'Content-Type: application/json' -d '{"email":"admin@scholarx.com","password":"admin@scholarx.com"}')
echo "$RESP5"
