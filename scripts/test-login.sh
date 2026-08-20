#!/bin/bash
echo "=== Login with actual DB credentials ==="
LOGIN_RESP=$(curl -s http://localhost:80/api/tenant/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"admin123"}')
echo "Tenant admin login: $LOGIN_RESP"
echo ""

STAFF_RESP=$(curl -s http://localhost:80/api/staff/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"onyedika.akoma@gmail.com","password":"admin123"}')
echo "Staff login: $STAFF_RESP"
echo ""

echo "=== Test authenticated API call ==="
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then
  echo "Token extracted: ${TOKEN:0:30}..."
  DASH=$(curl -s http://localhost:80/api/tenant/integrated-dashboard -H "Authorization: Bearer $TOKEN")
  echo "Dashboard response (first 200 chars): ${DASH:0:200}"
else
  echo "No token in login response"
fi
