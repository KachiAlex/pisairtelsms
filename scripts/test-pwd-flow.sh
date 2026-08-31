#!/bin/bash
echo "=== Test reset password ==="
curl -s -X POST http://localhost:3000/api/tenant/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"akoma@kreatixtech.com"}'
echo ""

echo ""
echo "=== Test tenant admin login ==="
curl -s -X POST http://localhost:3000/api/tenant/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"akoma@kreatixtech.com","password":"admin123"}'
echo ""

echo ""
echo "=== Test staff login ==="
curl -s -X POST http://localhost:3000/api/staff/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"onyedika.akoma@gmail.com","password":"admin123"}'
echo ""
