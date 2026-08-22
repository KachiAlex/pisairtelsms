#!/bin/bash
NEON="postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
VPS="docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A"

echo "===== STAFF COMPARISON ====="
echo "--- NEON staff ---"
$VPS -c "SELECT id, name, email, role, status, department FROM staff ORDER BY email;" 2>&1
echo ""
echo "--- NEON staff (via psql to neon) ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT id, name, email, role, status, department FROM staff ORDER BY email;" 2>&1

echo ""
echo "===== TENANT_USERS COMPARISON ====="
echo "--- VPS tenant_users ---"
$VPS -c "SELECT id, name, email, role, status, tenant_id FROM tenant_users ORDER BY email;" 2>&1
echo ""
echo "--- NEON tenant_users ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT id, name, email, role, status, tenant_id FROM tenant_users ORDER BY email;" 2>&1

echo ""
echo "===== STUDENTS COMPARISON ====="
echo "--- VPS students ---"
$VPS -c "SELECT id, name, email, class, status FROM students ORDER BY name;" 2>&1
echo ""
echo "--- NEON students ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT id, name, email, class, status FROM students ORDER BY name;" 2>&1

echo ""
echo "===== TENANTS COMPARISON ====="
echo "--- VPS tenants ---"
$VPS -c "SELECT id, name, slug, status FROM tenants ORDER BY name;" 2>&1
echo ""
echo "--- NEON tenants ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT id, name, slug, status FROM tenants ORDER BY name;" 2>&1

echo ""
echo "===== ALL TABLE ROW COUNT COMPARISON ====="
echo "TABLE|NEON|VPS"
TABLES=$(docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1)
for T in $TABLES; do
  N=$(docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT count(*) FROM \"$T\";" 2>/dev/null || echo "err")
  V=$($VPS -c "SELECT count(*) FROM \"$T\";" 2>/dev/null || echo "err")
  if [ "$N" != "$V" ]; then
    echo "$T|$N|$V|MISMATCH"
  fi
done
