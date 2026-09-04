#!/bin/bash
set -e
cd /opt/pisairtel-sms

echo "=== Cleaning up stale containers ==="
docker rm -f pisairtel-sms 2>/dev/null || true
docker container prune -f 2>/dev/null || true
sleep 3

echo "=== Starting fresh container ==="
docker compose up -d app 2>&1

echo "=== Waiting ==="
sleep 15

echo "=== Container status ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep pisairtel

echo "=== Checking served JS ==="
curl -s http://127.0.0.1:3000/ | grep -oE 'assets/index[^"]+\.js' | head -1

echo "=== Checking for report card ==="
JS=$(curl -s http://127.0.0.1:3000/ | grep -oE 'assets/index[^"]+\.js' | head -1)
curl -s "http://127.0.0.1:3000/$JS" | grep -c 'Result Broadsheet'

echo "=== HTTPS ==="
curl -sk -o /dev/null -w '%{http_code}\n' https://pisairtelsms.com/

echo "=== Done ==="
