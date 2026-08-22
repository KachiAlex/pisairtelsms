#!/bin/bash
NEON="postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
VPS="docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A"

echo "===== TENANTS (all columns) ====="
echo "--- VPS ---"
$VPS -c "SELECT * FROM tenants;" 2>&1
echo ""
echo "--- NEON ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT * FROM tenants;" 2>&1

echo ""
echo "===== TENANT_SETTINGS ====="
echo "--- VPS ---"
$VPS -c "SELECT * FROM tenant_settings;" 2>&1
echo ""
echo "--- NEON ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT * FROM tenant_settings;" 2>&1

echo ""
echo "===== USERS table (if exists) ====="
echo "--- VPS ---"
$VPS -c "SELECT * FROM users;" 2>&1
echo ""
echo "--- NEON ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT * FROM users;" 2>&1

echo ""
echo "===== SUPER_ADMIN_ACCOUNTS ====="
echo "--- VPS ---"
$VPS -c "SELECT id, full_name, organization, email FROM super_admin_accounts;" 2>&1
echo ""
echo "--- NEON ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT id, full_name, organization, email FROM super_admin_accounts;" 2>&1

echo ""
echo "===== STAFF with password_hash status ====="
echo "--- VPS ---"
$VPS -c "SELECT id, name, email, role, CASE WHEN password_hash IS NULL THEN 'NULL' ELSE 'SET' END as pwd FROM staff ORDER BY email;" 2>&1
echo ""
echo "--- NEON ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT id, name, email, role, CASE WHEN password_hash IS NULL THEN 'NULL' ELSE 'SET' END as pwd FROM staff ORDER BY email;" 2>&1

echo ""
echo "===== Search for 'kreatix' or 'Kreatix' across key tables ====="
echo "--- VPS staff ---"
$VPS -c "SELECT * FROM staff WHERE name ILIKE '%kreatix%' OR email ILIKE '%kreatix%' OR department ILIKE '%kreatix%';" 2>&1
echo "--- VPS tenants ---"
$VPS -c "SELECT * FROM tenants WHERE name ILIKE '%kreatix%' OR id::text ILIKE '%kreatix%';" 2>&1
echo "--- VPS tenant_settings ---"
$VPS -c "SELECT * FROM tenant_settings WHERE school_name ILIKE '%kreatix%' OR tenant_id ILIKE '%kreatix%';" 2>&1
echo ""
echo "--- NEON staff ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT * FROM staff WHERE name ILIKE '%kreatix%' OR email ILIKE '%kreatix%' OR department ILIKE '%kreatix%';" 2>&1
echo "--- NEON tenants ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT * FROM tenants WHERE name ILIKE '%kreatix%';" 2>&1
echo "--- NEON tenant_settings ---"
docker exec pisairtel-postgres psql "$NEON" -t -A -c "SELECT * FROM tenant_settings WHERE school_name ILIKE '%kreatix%';" 2>&1
