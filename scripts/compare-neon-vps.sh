#!/bin/bash
NEON_URL='postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
VPS_CMD="docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A"

echo "============================================================"
echo "  Neon vs VPS Database Migration Verification"
echo "============================================================"
echo ""

echo "=== 1. Total Table Count ==="
NEON_TABLES=$(psql "$NEON_URL" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
VPS_TABLES=$($VPS_CMD -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "  Neon tables: $NEON_TABLES"
echo "  VPS tables:  $VPS_TABLES"
if [ "$NEON_TABLES" = "$VPS_TABLES" ]; then echo "  ✅ MATCH"; else echo "  ❌ MISMATCH"; fi
echo ""

echo "=== 2. Total Row Count Across All Tables ==="
NEON_ROWS=$(psql "$NEON_URL" -t -A -c "
  SELECT COALESCE(sum(n_live_tup), 0) FROM pg_stat_user_tables;
")
VPS_ROWS=$($VPS_CMD -c "
  SELECT COALESCE(sum(n_live_tup), 0) FROM pg_stat_user_tables;
")
echo "  Neon total rows: $NEON_ROWS"
echo "  VPS total rows:  $VPS_ROWS"
if [ "$NEON_ROWS" = "$VPS_ROWS" ]; then echo "  ✅ MATCH"; else echo "  ⚠️  Difference may be due to stats timing"; fi
echo ""

echo "=== 3. Per-Table Row Count Comparison ==="
printf "%-40s %10s %10s %s\n" "TABLE" "NEON" "VPS" "STATUS"
printf "%-40s %10s %10s %s\n" "------" "----" "---" "------"

# Get all table names from Neon
TABLES=$(psql "$NEON_URL" -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")

for TBL in $TABLES; do
  NEON_COUNT=$(psql "$NEON_URL" -t -A -c "SELECT count(*) FROM \"$TBL\";" 2>/dev/null || echo "ERR")
  VPS_COUNT=$($VPS_CMD -c "SELECT count(*) FROM \"$TBL\";" 2>/dev/null || echo "ERR")
  
  if [ "$NEON_COUNT" = "ERR" ] || [ "$VPS_COUNT" = "ERR" ]; then
    STATUS="⚠️  ERROR"
  elif [ "$NEON_COUNT" = "$VPS_COUNT" ]; then
    STATUS="✅"
  else
    STATUS="❌ MISMATCH"
  fi
  
  printf "%-40s %10s %10s %s\n" "$TBL" "$NEON_COUNT" "$VPS_COUNT" "$STATUS"
done
