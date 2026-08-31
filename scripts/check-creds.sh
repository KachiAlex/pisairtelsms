#!/bin/bash
echo "=== Staff with admin roles ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT email, role, substring(password_hash,1,20) as pwd_prefix FROM staff WHERE role ILIKE '%admin%' LIMIT 10;"
echo ""
echo "=== Tenant users ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT email, role FROM tenant_users LIMIT 10;"
echo ""
echo "=== Super admin accounts ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT email FROM super_admin_accounts LIMIT 5;"
