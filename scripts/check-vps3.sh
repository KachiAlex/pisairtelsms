#!/bin/bash
echo "=== Full HTML being served ==="
curl -s http://127.0.0.1:3001/
echo ""
echo "=== CSS file hash ==="
curl -s http://127.0.0.1:3001/ | grep -oE 'assets/[^"]+\.css'
echo ""
echo "=== Check CSS contains ps-home ==="
CSS_FILE=$(curl -s http://127.0.0.1:3001/ | grep -oE 'assets/index[^"]+\.css' | head -1)
echo "CSS file: $CSS_FILE"
curl -s "http://127.0.0.1:3001/$CSS_FILE" | grep -c 'ps-home'
echo ""
echo "=== Check if old homepage keywords exist ==="
curl -s "http://127.0.0.1:3001/assets/index-CODE52Xz.js" | grep -c 'From admissions to results'
echo ""
echo "=== Check for old homepage keywords ==="
curl -s "http://127.0.0.1:3001/assets/index-CODE52Xz.js" | grep -oE 'All-in-one platform|Streamline your school|Start managing your school' | head -5
echo ""
echo "=== PM2 logs (last 20) ==="
pm2 logs pisairtel-sms --lines 20 --nostream 2>&1
