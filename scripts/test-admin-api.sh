#!/bin/bash
echo "=== Super admin login ==="
TOKEN=$(curl -s http://localhost:3000/api/super-admin/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"admin@pisairtelsms.com","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."

echo ""
echo "=== Fetch tenants ==="
curl -s http://localhost:3000/api/admin/tenants -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== Fetch tenant admins for Kreatix Academy ==="
curl -s "http://localhost:3000/api/admin/tenant-admins?tenantId=f038d6a2-8957-45e6-a716-393dfd69173b" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== Fetch all tenant admins ==="
curl -s "http://localhost:3000/api/admin/tenant-admins" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== Fetch admin stats ==="
curl -s "http://localhost:3000/api/admin/stats" -H "Authorization: Bearer $TOKEN"
echo ""
