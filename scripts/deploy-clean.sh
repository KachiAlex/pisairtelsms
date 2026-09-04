#!/bin/bash
set -e
cd /opt/pisairtel-sms

echo "=== Pulling latest code ==="
git fetch origin main
git merge FETCH_HEAD --ff-only

echo "=== Rebuilding Docker image ==="
docker compose build --no-cache app 2>&1 | tail -5

echo "=== Cleaning up stale containers ==="
docker rm -f pisairtel-sms 2>/dev/null || true
sleep 3

echo "=== Starting fresh ==="
docker compose up -d app 2>&1
sleep 15

echo "=== Container status ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep pisairtel

echo "=== Checking served JS ==="
JS=$(curl -s http://127.0.0.1:3000/ | grep -oE 'assets/index[^\"]+\.js' | head -1)
echo "JS bundle: $JS"

echo "=== Check white text in CTA ==="
curl -s "http://127.0.0.1:3000/$JS" | grep -c 'color:#fff"

echo "=== HTTPS ==="
curl -sk -o /dev/null -w '%{http_code}\n' https://pisairtelsms.com/

echo "=== Done ==="
