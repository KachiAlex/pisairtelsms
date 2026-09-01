#!/bin/bash
echo "=== Testing app ==="
echo ""
echo "1. Frontend:"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)
echo "   Status: $STATUS"

echo ""
echo "2. Login API:"
RESULT=$(curl -s http://127.0.0.1:3000/api/tenant/auth/login \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"test"}')
echo "   Response: $RESULT"

echo ""
echo "3. Super-admin login API:"
RESULT2=$(curl -s http://127.0.0.1:3000/api/super-admin/auth/login \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.com","password":"test"}')
echo "   Response: $RESULT2"

echo ""
echo "4. HTTPS via nginx:"
STATUS2=$(curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/)
echo "   Status: $STATUS2"

echo ""
echo "5. API via nginx:"
RESULT3=$(curl -sk https://127.0.0.1/api/tenant/auth/login \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"test"}')
echo "   Response: $RESULT3"

echo ""
echo "=== Done ==="
