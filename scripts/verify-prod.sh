#!/bin/bash
echo "=== Docker containers ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep pisairtel
echo ""
echo "=== HTTP status on port 3000 ==="
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
echo ""
echo "=== JS bundle hash ==="
curl -s http://127.0.0.1:3000/ | grep -oE 'assets/index[^"]+\.js' | head -1
echo ""
echo "=== Check for new homepage keywords in JS ==="
JS=$(curl -s http://127.0.0.1:3000/ | grep -oE 'assets/index[^"]+\.js' | head -1)
curl -s "http://127.0.0.1:3000/$JS" | grep -c 'ps-home'
echo ""
echo "=== Check editorial design text ==="
curl -s "http://127.0.0.1:3000/$JS" | grep -oE 'From admissions to results|ps-hero-left|ps-trust-inner' | head -5
echo ""
echo "=== HTTPS check ==="
curl -sk -o /dev/null -w '%{http_code}\n' https://pisairtelsms.com/
echo ""
echo "=== HTTPS JS bundle ==="
curl -sk https://pisairtelsms.com/ | grep -oE 'assets/index[^"]+\.js' | head -1
echo ""
echo "=== Container logs (last 15) ==="
docker logs pisairtel-sms --tail 15 2>&1
