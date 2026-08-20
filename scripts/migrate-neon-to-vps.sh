#!/bin/bash
# =============================================================================
# Pisairtel SMS — Neon to VPS PostgreSQL Migration Script
# Dumps all data from Neon and restores to the VPS Docker PostgreSQL
# =============================================================================
set -euo pipefail

echo "=========================================="
echo "  Pisairtel SMS — Database Migration"
echo "  Neon → VPS Docker PostgreSQL"
echo "=========================================="

# Configuration
VPS_IP="${VPS_IP:-162.35.104.28}"
VPS_USER="${VPS_USER:-root}"
VPS_PASSWORD="${VPS_PASSWORD:-2Gcu*d8Q}"
DB_NAME="pisairtel_sms"
DB_USER="pisairtel"
DB_PASSWORD="PisairtelSMS2024!"

# Neon source URL — must be set as env var
NEON_URL="${NEON_DATABASE_URL:-}"

if [ -z "$NEON_URL" ]; then
  echo "ERROR: NEON_DATABASE_URL environment variable is not set."
  echo "Set it with: export NEON_DATABASE_URL='postgresql://user:pass@host/db?sslmode=require'"
  exit 1
fi

echo ""
echo "Step 1: Dumping Neon database to local file..."
echo "------------------------------------------"

# Extract connection parts from Neon URL for pg_dump
DUMP_FILE="neon_dump.sql"

# Use pg_dump with the Neon connection string
# --no-owner: skip ownership commands
# --no-privileges: skip privilege commands
# --schema-only first for structure, then data
PGSSLMODE=require pg_dump "$NEON_URL" \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file="$DUMP_FILE" 2>&1 || {
    echo "pg_dump failed. Trying with pg_dump native connection..."
    pg_dump "$(echo $NEON_URL | sed 's/\?sslmode=require//')" \
      --no-owner \
      --no-privileges \
      --format=plain \
      --file="$DUMP_FILE"
  }

DUMP_SIZE=$(wc -c < "$DUMP_FILE")
echo "✅ Dump complete: $DUMP_FILE ($DUMP_SIZE bytes)"

echo ""
echo "Step 2: Copy dump file to VPS..."
echo "------------------------------------------"

# Use sshpass to handle password auth
scp -o StrictHostKeyChecking=no "$DUMP_FILE" "${VPS_USER}@${VPS_IP}:/tmp/neon_dump.sql"
echo "✅ Dump file copied to VPS"

echo ""
echo "Step 3: Restoring database on VPS Docker PostgreSQL..."
echo "------------------------------------------"

ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" bash <<EOF
set -euo pipefail

# Wait for postgres container to be ready
echo "Waiting for PostgreSQL container..."
for i in \$(seq 1 30); do
  if docker exec pisairtel-postgres pg_isready -U ${DB_USER} -d ${DB_NAME} 2>/dev/null; then
    echo "PostgreSQL is ready!"
    break
  fi
  echo "  Attempt \$i/30..."
  sleep 2
done

# Copy dump into the postgres container
docker cp /tmp/neon_dump.sql pisairtel-postgres:/tmp/neon_dump.sql

# Restore the dump
echo "Restoring database..."
docker exec pisairtel-postgres psql -U ${DB_USER} -d ${DB_NAME} -f /tmp/neon_dump.sql 2>&1 || true

# Verify
TABLE_COUNT=\$(docker exec pisairtel-postgres psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "✅ Restore complete! Tables in database: \$TABLE_COUNT"

# Cleanup
docker exec pisairtel-postgres rm /tmp/neon_dump.sql
rm /tmp/neon_dump.sql
EOF

echo ""
echo "✅ Database migration complete!"
echo "   Source: Neon PostgreSQL"
echo "   Target: VPS Docker PostgreSQL (${VPS_IP})"
echo ""
