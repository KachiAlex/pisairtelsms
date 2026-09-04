#!/bin/bash
echo "=== HTTPS pisairtelsms.com ==="
curl -sI https://pisairtelsms.com 2>/dev/null | head -15
echo ""
echo "=== Check what pisairtelsms.com serves ==="
curl -sk https://pisairtelsms.com 2>/dev/null | grep -oE 'assets/[^"]+\.js' | head -3
echo ""
echo "=== Check zionite nginx full config ==="
docker exec zionite-nginx find /etc/nginx -name "*.conf" -exec cat {} \; 2>/dev/null
echo ""
echo "=== Check zionite-backend index.html ==="
docker exec zionite-backend cat /app/dist/index.html 2>/dev/null | head -30
echo ""
echo "=== Check zionite-backend for ps-home ==="
docker exec zionite-backend grep -c 'ps-home' /app/dist/assets/*.js 2>/dev/null
echo ""
echo "=== Check zionite docker-compose ==="
cat /opt/zionite/docker-compose.yml 2>/dev/null | head -50
