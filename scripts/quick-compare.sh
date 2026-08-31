#!/bin/bash
NEON="postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
VPS="docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A"

echo "TABLE|NEON|VPS"
for T in students staff tenant_users classes subjects parents payments exams exam_results fee_assignments staff_attendance attendance_records tenants tenant_settings; do
  N=$(psql "$NEON" -t -A -c "SELECT count(*) FROM $T;" 2>/dev/null || echo "0")
  V=$($VPS -c "SELECT count(*) FROM $T;" 2>/dev/null || echo "0")
  echo "$T|$N|$V"
done
