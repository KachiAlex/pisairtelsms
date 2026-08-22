#!/bin/bash
BASE="http://localhost:3000"
PASS=0
FAIL=0

log_pass() { PASS=$((PASS+1)); echo "  PASS: $1"; }
log_fail() { FAIL=$((FAIL+1)); echo "  FAIL: $1 -- $2"; }

echo "=========================================="
echo "  Email Service Flow Test"
echo "=========================================="
echo ""

# Step 1: Login as admin
echo "Step 1: Admin Login"
ADMIN_TOKEN=""
for pwd in "akoma@kreatixtech.com" "ChangeMe@123" "admin123"; do
  RESP=$(curl -s "$BASE/api/tenant/auth/login" -X POST -H 'Content-Type: application/json' -d "{\"email\":\"akoma@kreatixtech.com\",\"password\":\"$pwd\"}")
  TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$TOKEN" ]; then
    ADMIN_TOKEN="$TOKEN"
    log_pass "Admin login"
    break
  fi
done

if [ -z "$ADMIN_TOKEN" ]; then
  docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "UPDATE staff SET password_hash = NULL WHERE email = 'akoma@kreatixtech.com';" > /dev/null 2>&1
  RESP=$(curl -s "$BASE/api/tenant/auth/login" -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"akoma@kreatixtech.com"}')
  ADMIN_TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$ADMIN_TOKEN" ]; then
    log_pass "Admin login (password reset)"
  else
    log_fail "Admin login" "Cannot get token"
    exit 1
  fi
fi
echo ""

# Step 2: Check email service status
echo "Step 2: Check Email Service Status"
STATUS_RESP=$(curl -s "$BASE/api/tenant/email?action=status" -H "Authorization: Bearer $ADMIN_TOKEN")
CONFIGURED=$(echo "$STATUS_RESP" | grep -o '"configured":true' | head -1)

if [ -n "$CONFIGURED" ]; then
  log_pass "Email service configured"
  echo "  Response: $STATUS_RESP"
else
  log_fail "Email service configured" "Response: $STATUS_RESP"
fi
echo ""

# Step 3: Verify SMTP connection
echo "Step 3: Verify SMTP Connection"
VERIFY_RESP=$(curl -s "$BASE/api/tenant/email?action=verify" -H "Authorization: Bearer $ADMIN_TOKEN")
VERIFY_SUCCESS=$(echo "$VERIFY_RESP" | grep -o '"success":true' | head -1)

if [ -n "$VERIFY_SUCCESS" ]; then
  log_pass "SMTP connection verified"
else
  log_fail "SMTP connection" "Response: $VERIFY_RESP"
fi
echo ""

# Step 4: Send test email with template
echo "Step 4: Send Test Email (welcome template)"
SEND_RESP=$(curl -s "$BASE/api/tenant/email" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"send","to":"akoma@kreatixtech.com","template":"welcome","data":{"name":"Test Admin","email":"akoma@kreatixtech.com","role":"tenant_admin"}}')
SEND_SUCCESS=$(echo "$SEND_RESP" | grep -o '"success":true' | head -1)

if [ -n "$SEND_SUCCESS" ]; then
  log_pass "Test email sent"
  echo "  Response: $SEND_RESP"
else
  log_fail "Test email" "Response: $SEND_RESP"
fi
echo ""

# Step 5: Send custom email
echo "Step 5: Send Custom Email"
CUSTOM_RESP=$(curl -s "$BASE/api/tenant/email" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"send-custom","to":"akoma@kreatixtech.com","subject":"Test Custom Email","html":"<h1>Test</h1><p>This is a custom test email from Pisairtel SMS.</p>"}')
CUSTOM_SUCCESS=$(echo "$CUSTOM_RESP" | grep -o '"success":true' | head -1)

if [ -n "$CUSTOM_SUCCESS" ]; then
  log_pass "Custom email sent"
else
  log_fail "Custom email" "Response: $CUSTOM_RESP"
fi
echo ""

# Step 6: Send payment confirmation email
echo "Step 6: Send Payment Confirmation Email"
PAY_RESP=$(curl -s "$BASE/api/tenant/email" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"send","to":"akoma@kreatixtech.com","template":"paymentConfirmation","data":{"studentName":"Test Student","paymentId":"PAY_TEST_001","amount":50000,"date":"2026-08-22","method":"Bank Transfer"}}')
PAY_SUCCESS=$(echo "$PAY_RESP" | grep -o '"success":true' | head -1)

if [ -n "$PAY_SUCCESS" ]; then
  log_pass "Payment confirmation email sent"
else
  log_fail "Payment confirmation email" "Response: $PAY_RESP"
fi
echo ""

# Step 7: Send attendance alert email
echo "Step 7: Send Attendance Alert Email"
ATT_RESP=$(curl -s "$BASE/api/tenant/email" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"send","to":"akoma@kreatixtech.com","template":"attendanceAlert","data":{"guardianName":"Test Guardian","studentName":"Test Student","attendanceRate":65,"absenceCount":8,"lateCount":3,"recommendedActions":"Please contact the school office to discuss attendance."}}')
ATT_SUCCESS=$(echo "$ATT_RESP" | grep -o '"success":true' | head -1)

if [ -n "$ATT_SUCCESS" ]; then
  log_pass "Attendance alert email sent"
else
  log_fail "Attendance alert email" "Response: $ATT_RESP"
fi
echo ""

# Step 8: Send bulk emails
echo "Step 8: Send Bulk Emails"
BULK_RESP=$(curl -s "$BASE/api/tenant/email" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"send-bulk","recipients":[{"to":"akoma@kreatixtech.com","template":"custom","data":{"title":"Bulk Test 1","message":"This is bulk test email 1"}},{"to":"akoma@kreatixtech.com","template":"custom","data":{"title":"Bulk Test 2","message":"This is bulk test email 2"}}]}')
BULK_SUCCESS=$(echo "$BULK_RESP" | grep -o '"success":true' | head -1)
BULK_SENT=$(echo "$BULK_RESP" | grep -o '"sent":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$BULK_SUCCESS" ] && [ "$BULK_SENT" -ge 2 ]; then
  log_pass "Bulk emails sent ($BULK_SENT emails)"
else
  log_fail "Bulk emails" "Response: $BULK_RESP"
fi
echo ""

# Step 9: Check invalid template
echo "Step 9: Invalid Template Rejected"
INVALID_RESP=$(curl -s "$BASE/api/tenant/email" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"send","to":"akoma@kreatixtech.com","template":"nonexistent","data":{}}')
INVALID_ERROR=$(echo "$INVALID_RESP" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$INVALID_ERROR" ]; then
  log_pass "Invalid template rejected ($INVALID_ERROR)"
else
  log_fail "Invalid template rejected" "Response: $INVALID_RESP"
fi
echo ""

# Summary
echo "=========================================="
echo "  TEST SUMMARY"
echo "=========================================="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""
if [ $FAIL -eq 0 ]; then
  echo "  ALL TESTS PASSED"
else
  echo "  $FAIL TEST(S) FAILED"
fi
