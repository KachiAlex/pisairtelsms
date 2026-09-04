#!/bin/bash
echo "=== Checking served HTML ==="
curl -s http://127.0.0.1:3001/ | grep -oE 'assets/[^"]+\.js'
echo ""
echo "=== Checking dist files ==="
ls -la /var/www/pisairtel-sms/dist/assets/ | head -20
echo ""
echo "=== Checking if HomePage chunk exists ==="
ls /var/www/pisairtel-sms/dist/assets/ | grep -i home
echo ""
echo "=== Grep for ps-home in JS bundles ==="
grep -rl 'ps-home' /var/www/pisairtel-sms/dist/assets/ 2>/dev/null
echo ""
echo "=== Grep for editorial design keywords ==="
grep -rl 'ps-hero-left\|ps-trust-inner\|ps-showcase' /var/www/pisairtel-sms/dist/assets/ 2>/dev/null
echo ""
echo "=== PM2 status ==="
pm2 status
