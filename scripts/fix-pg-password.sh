#!/bin/bash
echo "=== Check postgres env ==="
docker exec pisairtel-postgres printenv POSTGRES_PASSWORD 2>&1

echo ""
echo "=== Try connecting from postgres container itself ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "SELECT count(*) FROM staff;" 2>&1

echo ""
echo "=== Check if password matches ==="
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "ALTER USER pisairtel WITH PASSWORD 'PisairtelSMS2024!';" 2>&1

echo ""
echo "=== Test from app after password reset ==="
docker exec pisairtel-sms sh -c 'PGPASSWORD=PisairtelSMS2024! psql -h postgres -U pisairtel -d pisairtel_sms -c "SELECT count(*) FROM staff;"' 2>&1
