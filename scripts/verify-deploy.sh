#!/bin/bash
echo "=== Checking pisairtelsms.com ==="
JS_HASH=$(curl -sk https://pisairtelsms.com/ | grep -oE 'assets/index[^"]+\.js' | head -1)
echo "JS bundle: $JS_HASH"
echo ""
echo "=== Check for new homepage keywords ==="
curl -sk "https://pisairtelsms.com/$JS_HASH" | grep -c 'ps-home'
echo ""
echo "=== Check for editorial design text ==="
curl -sk "https://pisairtelsms.com/$JS_HASH" | grep -oE 'From admissions to results|ps-hero-left|ps-trust-inner' | head -5
echo ""
echo "=== HTTP status ==="
curl -sk -o /dev/null -w "%{http_code}" https://pisairtelsms.com/
echo ""
echo "=== Also check port 8082 ==="
JS_HASH2=$(curl -s http://127.0.0.1:8082/ | grep -oE 'assets/index[^"]+\.js' | head -1)
echo "JS bundle (8082): $JS_HASH2"
