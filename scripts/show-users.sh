#!/bin/bash
VPS="docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A"

echo "=== STAFF ==="
$VPS -c "SELECT id, name, email, role, status, department FROM staff ORDER BY role, name;"

echo ""
echo "=== TENANT_USERS ==="
$VPS -c "SELECT id, name, email, role, status, tenant_id FROM tenant_users ORDER BY role, name;"

echo ""
echo "=== SUPER_ADMIN_ACCOUNTS ==="
$VPS -c "SELECT id, name, email, status FROM super_admin_accounts ORDER BY name;" 2>/dev/null || echo "(table empty or not found)"

echo ""
echo "=== STUDENTS ==="
$VPS -c "SELECT id, name, email, class, status FROM students ORDER BY name;"

echo ""
echo "=== PARENTS ==="
$VPS -c "SELECT id, name, email, phone, status FROM parents ORDER BY name;" 2>/dev/null || echo "(table empty or not found)"

echo ""
echo "=== USERS (generic) ==="
$VPS -c "SELECT id, name, email, role, status FROM users ORDER BY role, name;" 2>/dev/null || echo "(table empty or not found)"
