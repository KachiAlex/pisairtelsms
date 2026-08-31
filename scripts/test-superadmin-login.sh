#!/bin/bash
echo "=== Test super admin login ==="
curl -s http://localhost:3000/api/super-admin/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"admin@pisairtelsms.com","password":"admin123"}'
echo ""
