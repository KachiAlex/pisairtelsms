#!/bin/bash
# Test the superadmin password reset flow
BASE="http://localhost:3000"

# 1. Login as super admin
echo "=== LOGIN ==="
LOGIN=$(curl -s -X POST "$BASE/api/super-admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pisairtelsms.com","password":"admin123"}')
echo "$LOGIN" | head -c 200
echo ""

TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."

# 2. Fetch tenant admins
echo ""
echo "=== TENANT ADMINS ==="
ADMINS=$(curl -s "$BASE/api/admin/tenant-admins" \
  -H "Authorization: Bearer $TOKEN")
echo "$ADMINS" | head -c 300
echo ""

# Get first admin id
ADMIN_ID=$(echo "$ADMINS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
ADMIN_NAME=$(echo "$ADMINS" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Admin ID: $ADMIN_ID"
echo "Admin Name: $ADMIN_NAME"

# 3. Reset password with custom password
echo ""
echo "=== RESET PASSWORD (custom) ==="
RESET=$(curl -s -X PUT "$BASE/api/admin/tenant-admins" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"id\":\"$ADMIN_ID\",\"password\":\"testpass123\"}")
echo "$RESET" | head -c 300
echo ""

# 4. Reset password with auto-generate
echo ""
echo "=== RESET PASSWORD (auto) ==="
RESET2=$(curl -s -X PUT "$BASE/api/admin/tenant-admins" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"id\":\"$ADMIN_ID\"}")
echo "$RESET2" | head -c 300
echo ""

# 5. Verify custom password works by logging in
echo ""
echo "=== VERIFY LOGIN WITH CUSTOM PASSWORD ==="
RESET_CUSTOM=$(curl -s -X PUT "$BASE/api/admin/tenant-admins" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"id\":\"$ADMIN_ID\",\"password\":\"testpass123\"}")
echo "Reset with custom password done"

LOGIN_VERIFY=$(curl -s -X POST "$BASE/api/tenant/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"akoma@kreatixtech.com","password":"testpass123","tenantId":"f038d6a2-8957-45e6-a716-393dfd69173b"}')
echo "Login result: $(echo $LOGIN_VERIFY | head -c 200)"
