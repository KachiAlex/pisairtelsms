#!/bin/bash
echo "=== Check for any .env files on VPS ==="
find /opt/pisairtel-sms -name ".env*" -type f 2>/dev/null
echo ""

echo "=== Check .env.local if exists ==="
cat /opt/pisairtel-sms/.env.local 2>/dev/null | sed 's/=.*/=***/' || echo "No .env.local"

echo ""
echo "=== Check for any neon references in the project dir ==="
grep -r "neon" /opt/pisairtel-sms/ --include="*.env*" --include="*.yml" --include="*.yaml" --include="*.mjs" --include="*.js" --include="*.ts" 2>/dev/null | head -5 || echo "No neon references found"

echo ""
echo "=== Check git history for old env files ==="
cd /opt/pisairtel-sms
git log --all --oneline --diff-filter=D -- ".env*" ".env.local" 2>&1 | head -5

echo ""
echo "=== Check for old vercel env or config ==="
ls -la /opt/pisairtel-sms/.vercel/ 2>/dev/null || echo "No .vercel dir"

echo ""
echo "=== Check docker volumes for postgres data ==="
docker volume inspect pisairtel-sms_postgres_data 2>&1 | head -10

echo ""
echo "=== When was postgres data volume created? ==="
docker run --rm -v pisairtel-sms_postgres_data:/data alpine ls -la /data/ 2>&1 | head -5

echo ""
echo "=== Check if there's a vercel.json with old env config ==="
grep -i "neon\|ep-\|pooler\|vercel-pool" /opt/pisairtel-sms/vercel.json 2>/dev/null || echo "No neon refs in vercel.json"
