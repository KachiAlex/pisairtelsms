#!/bin/bash
echo "=== Testing pisairtelsms.com ==="
echo ""
echo "1. Frontend:"
STATUS=$(curl -sk -o /dev/null -w '%{http_code}' https://pisairtelsms.com/)
echo "   Status: $STATUS"

echo ""
echo "2. Login API:"
RESULT=$(curl -sk https://pisairtelsms.com/api/tenant/auth/login \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"test123"}')
echo "   Response: $RESULT"

echo ""
echo "3. Super-admin login API:"
RESULT2=$(curl -sk https://pisairtelsms.com/api/super-admin/auth/login \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.com","password":"test123"}')
echo "   Response: $RESULT2"

echo ""
echo "4. Direct app login:"
RESULT3=$(curl -s http://127.0.0.1:3000/api/tenant/auth/login \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"test123"}')
echo "   Response: $RESULT3"

echo ""
echo "=== Done ==="
