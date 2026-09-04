#!/bin/bash
echo "=== Check for service worker ==="
ls /var/www/pisairtel-sms/dist/sw.js 2>/dev/null || echo "No sw.js"
ls /var/www/pisairtel-sms/dist/service-worker.js 2>/dev/null || echo "No service-worker.js"
echo ""
echo "=== Check manifest ==="
cat /var/www/pisairtel-sms/dist/manifest.json 2>/dev/null | head -5
echo ""
echo "=== Check index.html for cache headers ==="
curl -sI http://127.0.0.1:3001/ | grep -i cache
echo ""
echo "=== Check JS cache headers ==="
curl -sI http://127.0.0.1:3001/assets/index-CODE52Xz.js | grep -i cache
echo ""
echo "=== Verify ps-home content in JS ==="
grep -o 'ps-home[^"]*' /var/www/pisairtel-sms/dist/assets/index-CODE52Xz.js | head -5
echo ""
echo "=== Check CSS file ==="
curl -sI http://127.0.0.1:3001/assets/index-CdTWEwvN.css | grep -i cache
