#!/bin/bash
echo "=== Response headers from pisairtelsms.com ==="
curl -skI https://pisairtelsms.com/ 2>&1 | grep -iE 'server|cf-|cache|via|proxy'
echo ""
echo "=== Check what zionite frontend dist has ==="
ls /opt/zionite/frontend/dist/assets/ | grep index
echo ""
echo "=== Check if old build is in zionite frontend ==="
grep -c 'ps-home' /opt/zionite/frontend/dist/assets/index-KrC3Kiuv.js 2>/dev/null
echo ""
echo "=== Nginx conf files in zionite ==="
ls -la /opt/zionite/nginx/conf.d/
echo ""
echo "=== Check if our config is there ==="
cat /opt/zionite/nginx/conf.d/pisairtelsms.conf
echo ""
echo "=== Test nginx matching ==="
docker exec zionite-nginx nginx -T 2>&1 | grep -A3 'server_name pisairtelsms'
echo ""
echo "=== Check Cloudflare IP ==="
dig +short pisairtelsms.com 2>/dev/null || nslookup pisairtelsms.com 2>/dev/null | grep Address
