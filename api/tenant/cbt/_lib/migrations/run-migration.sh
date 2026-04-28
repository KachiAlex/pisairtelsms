#!/bin/bash

# Migration Runner for Unix/Mac
# Usage: ./run-migration.sh <database-url>

if [ -z "$1" ]; then
    echo "Error: Database URL not provided"
    echo "Usage: ./run-migration.sh 'postgresql://user:password@host/database'"
    exit 1
fi

DATABASE_URL="$1"

echo "CBT Dashboard Database Migration"
echo "============================================================"
echo "Running migration against Neon database..."
echo "============================================================"

node "$(dirname "$0")/run-migration.js" "$DATABASE_URL"

if [ $? -ne 0 ]; then
    echo ""
    echo "Migration failed!"
    exit 1
fi

echo ""
echo "Migration completed successfully!"
