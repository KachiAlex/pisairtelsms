#!/bin/bash
echo "=== Table count ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
echo ""
echo "=== Row counts per table ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "
SELECT schemaname||'.'||relname as table, n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 20;
"
echo ""
echo "=== Key tables ==="
for tbl in students staff tenants fee_structures exams results announcements; do
  count=$(docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -c "SELECT count(*) FROM $tbl;" 2>/dev/null || echo "N/A")
  echo "  $tbl: $count"
done
