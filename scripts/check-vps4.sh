#!/bin/bash
echo "=== Nginx configs for pisairtelsms.com ==="
grep -r "pisairtelsms" /etc/nginx/ 2>/dev/null
echo ""
echo "=== Zionite nginx config ==="
docker exec zionite-nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null
echo ""
echo "=== Check if pisairtelsms.com resolves locally ==="
curl -sI http://pisairtelsms.com 2>/dev/null | head -10
echo ""
echo "=== Check what port 80 serves ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/
echo ""
echo "=== Check zionite-backend for pisairtel ==="
docker exec zionite-backend ls /app/dist/ 2>/dev/null | head -5
docker exec zionite-backend cat /app/dist/index.html 2>/dev/null | grep -oE 'assets/[^"]+\.js' | head -3
