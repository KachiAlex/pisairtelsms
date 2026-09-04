#!/bin/bash
set -e
cd /opt/pisairtel-sms

echo "=== Pulling latest code ==="
git fetch origin main
git merge FETCH_HEAD --ff-only

echo "=== Rebuilding Docker image ==="
docker compose build --no-cache app 2>&1 | tail -10

echo "=== Restarting container ==="
docker rm -f pisairtel-sms 2>/dev/null || true
sleep 3
docker compose up -d app 2>&1

echo "=== Waiting for container to start ==="
sleep 15

echo "=== Container status ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep pisairtel

echo "=== Checking served JS bundle ==="
curl -s http://127.0.0.1:3000/ | grep -oE 'assets/index[^"]+\.js' | head -1

echo "=== Checking for pricing section ==="
JS=$(curl -s http://127.0.0.1:3000/ | grep -oE 'assets/index[^"]+\.js' | head -1)
curl -s "http://127.0.0.1:3000/$JS" | grep -c 'ps-price-card'

echo "=== HTTPS check ==="
curl -sk -o /dev/null -w '%{http_code}\n' https://pisairtelsms.com/

echo "=== Done ==="
