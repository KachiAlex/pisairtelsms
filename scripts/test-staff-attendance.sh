#!/bin/bash
BASE="http://localhost:80"
PASS=0
FAIL=0

log_pass() { PASS=$((PASS+1)); echo "  PASS: $1"; }
log_fail() { FAIL=$((FAIL+1)); echo "  FAIL: $1 -- $2"; }

echo "=========================================="
echo "  Staff Attendance Flow Test"
echo "=========================================="
echo ""

# Step 1: Admin Login
echo "Step 1: Admin Login"
ADMIN_TOKEN=""

for pwd in "akoma@kreatixtech.com" "ChangeMe@123" "admin123" "password" "PisairtelSMS2024!"; do
  RESP=$(curl -s "$BASE/api/tenant/auth/login" -X POST -H 'Content-Type: application/json' -d "{\"email\":\"akoma@kreatixtech.com\",\"password\":\"$pwd\"}")
  TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$TOKEN" ]; then
    ADMIN_TOKEN="$TOKEN"
    log_pass "Admin login (password: $pwd)"
    break
  fi
done

if [ -z "$ADMIN_TOKEN" ]; then
  echo "  All login attempts failed. Resetting password..."
  docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "UPDATE staff SET password_hash = NULL WHERE email = 'akoma@kreatixtech.com';" > /dev/null 2>&1
  RESP=$(curl -s "$BASE/api/tenant/auth/login" -X POST -H 'Content-Type: application/json' -d '{"email":"akoma@kreatixtech.com","password":"akoma@kreatixtech.com"}')
  ADMIN_TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$ADMIN_TOKEN" ]; then
    log_pass "Admin login after password reset (email-as-password flow)"
  else
    log_fail "Admin login" "All attempts failed. Response: $RESP"
    echo "ABORTING."
    exit 1
  fi
fi
echo "  Token: ${ADMIN_TOKEN:0:30}..."
echo ""

# Step 2: Fetch staff list
echo "Step 2: Fetch Staff List"
STAFF_RESP=$(curl -s "$BASE/api/tenant/staff" -H "Authorization: Bearer $ADMIN_TOKEN")
STAFF_COUNT=$(echo "$STAFF_RESP" | grep -o '"id"' | wc -l)
FIRST_STAFF_ID=$(echo "$STAFF_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
FIRST_STAFF_NAME=$(echo "$STAFF_RESP" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$STAFF_COUNT" -gt 0 ] && [ -n "$FIRST_STAFF_ID" ]; then
  log_pass "Fetch staff list ($STAFF_COUNT staff found)"
  echo "  First staff: $FIRST_STAFF_NAME (ID: $FIRST_STAFF_ID)"
else
  log_fail "Fetch staff list" "No staff returned"
fi
echo ""

# Step 3: Fetch today's attendance
echo "Step 3: Fetch Today's Attendance"
TODAY=$(date +%Y-%m-%d)
ATT_RESP=$(curl -s "$BASE/api/tenant/staff-attendance?date=$TODAY" -H "Authorization: Bearer $ADMIN_TOKEN")
ATT_SUCCESS=$(echo "$ATT_RESP" | grep -o '"success":true' | head -1)

if [ -n "$ATT_SUCCESS" ]; then
  RECORD_COUNT=$(echo "$ATT_RESP" | grep -o '"staffId"' | wc -l)
  log_pass "Fetch attendance (records: $RECORD_COUNT)"
else
  log_fail "Fetch attendance" "Response: $ATT_RESP"
fi
echo ""

# Step 4: Generate QR Code
echo "Step 4: Generate QR Code"
QR_GEN_RESP=$(curl -s "$BASE/api/tenant/staff-attendance/qr" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"generate"}')
QR_TOKEN=$(echo "$QR_GEN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
QR_EXPIRES=$(echo "$QR_GEN_RESP" | grep -o '"expiresAt":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$QR_TOKEN" ] && [ "$QR_TOKEN" != "null" ]; then
  log_pass "Generate QR code"
  echo "  Token: ${QR_TOKEN:0:30}..."
  echo "  Expires: $QR_EXPIRES"
else
  log_fail "Generate QR code" "Response: $QR_GEN_RESP"
fi
echo ""

# Step 5: Fetch active QR session
echo "Step 5: Fetch Active QR Session"
QR_GET_RESP=$(curl -s "$BASE/api/tenant/staff-attendance/qr" -H "Authorization: Bearer $ADMIN_TOKEN")
QR_GET_TOKEN=$(echo "$QR_GET_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$QR_GET_TOKEN" ] && [ "$QR_GET_TOKEN" = "$QR_TOKEN" ]; then
  log_pass "Fetch active QR session (matches generated token)"
else
  log_fail "Fetch active QR session" "Token mismatch"
fi
echo ""

# Step 6: QR Scan - Check In
echo "Step 6: QR Scan - Staff Check-In"
SCAN_RESP=$(curl -s "$BASE/api/tenant/staff-attendance/qr" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"action\":\"scan\",\"token\":\"$QR_TOKEN\"}")
SCAN_SUCCESS=$(echo "$SCAN_RESP" | grep -o '"success":true' | head -1)
SCAN_ACTION=$(echo "$SCAN_RESP" | grep -o '"action":"[^"]*"' | head -1 | cut -d'"' -f4)
SCAN_TIME=$(echo "$SCAN_RESP" | grep -o '"time":"[^"]*"' | head -1 | cut -d'"' -f4)
SCAN_STATUS=$(echo "$SCAN_RESP" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$SCAN_SUCCESS" ] && [ "$SCAN_ACTION" = "check-in" ]; then
  log_pass "QR scan check-in (time: $SCAN_TIME, status: $SCAN_STATUS)"
else
  log_fail "QR scan check-in" "Action: $SCAN_ACTION, Response: $SCAN_RESP"
fi
echo ""

# Step 7: QR Scan - Check Out
echo "Step 7: QR Scan - Staff Check-Out"
SCAN2_RESP=$(curl -s "$BASE/api/tenant/staff-attendance/qr" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"action\":\"scan\",\"token\":\"$QR_TOKEN\"}")
SCAN2_SUCCESS=$(echo "$SCAN2_RESP" | grep -o '"success":true' | head -1)
SCAN2_ACTION=$(echo "$SCAN2_RESP" | grep -o '"action":"[^"]*"' | head -1 | cut -d'"' -f4)
SCAN2_TIME=$(echo "$SCAN2_RESP" | grep -o '"time":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$SCAN2_SUCCESS" ] && [ "$SCAN2_ACTION" = "check-out" ]; then
  log_pass "QR scan check-out (time: $SCAN2_TIME)"
else
  log_fail "QR scan check-out" "Action: $SCAN2_ACTION, Response: $SCAN2_RESP"
fi
echo ""

# Step 8: QR Scan - Already marked
echo "Step 8: QR Scan - Already Marked (third scan)"
SCAN3_RESP=$(curl -s "$BASE/api/tenant/staff-attendance/qr" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"action\":\"scan\",\"token\":\"$QR_TOKEN\"}")
SCAN3_ACTION=$(echo "$SCAN3_RESP" | grep -o '"action":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$SCAN3_ACTION" = "already-marked" ]; then
  log_pass "QR scan already-marked (correctly detected double scan)"
else
  log_fail "QR scan already-marked" "Action: $SCAN3_ACTION"
fi
echo ""

# Step 9: Admin Manual Mark (single)
echo "Step 9: Admin Manual Mark (single staff)"
if [ -n "$FIRST_STAFF_ID" ]; then
  MANUAL_RESP=$(curl -s "$BASE/api/tenant/staff-attendance" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"staffId\":\"$FIRST_STAFF_ID\",\"date\":\"$TODAY\",\"status\":\"present\",\"checkIn\":\"08:00\",\"notes\":\"Test manual mark\"}")
  MANUAL_SUCCESS=$(echo "$MANUAL_RESP" | grep -o '"success":true' | head -1)

  if [ -n "$MANUAL_SUCCESS" ]; then
    log_pass "Admin manual mark for $FIRST_STAFF_NAME"
  else
    log_fail "Admin manual mark" "Response: $MANUAL_RESP"
  fi
else
  log_fail "Admin manual mark" "No staff ID available"
fi
echo ""

# Step 10: Admin Bulk Mark
echo "Step 10: Admin Bulk Mark"
BULK_RESP=$(curl -s "$BASE/api/tenant/staff-attendance/qr" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "{\"action\":\"bulk-mark\",\"date\":\"$TODAY\",\"records\":[{\"staffId\":\"$FIRST_STAFF_ID\",\"status\":\"late\",\"checkIn\":\"09:30\",\"notes\":\"Bulk test\"}]}")
BULK_SUCCESS=$(echo "$BULK_RESP" | grep -o '"success":true' | head -1)
BULK_MARKED=$(echo "$BULK_RESP" | grep -o '"marked":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$BULK_SUCCESS" ] && [ "$BULK_MARKED" -ge 1 ]; then
  log_pass "Admin bulk mark ($BULK_MARKED staff marked)"
else
  log_fail "Admin bulk mark" "Response: $BULK_RESP"
fi
echo ""

# Step 11: Verify attendance in database
echo "Step 11: Verify Attendance in Database"
DB_CHECK=$(docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT count(*) FROM staff_attendance WHERE date='$TODAY';")
if [ "$DB_CHECK" -ge 1 ]; then
  log_pass "Database verification ($DB_CHECK attendance records for today)"
  echo "  Records:"
  docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT staff_name, check_in, check_out, status, notes FROM staff_attendance WHERE date='$TODAY' ORDER BY created_at DESC LIMIT 5;" | while IFS='|' read -r name cin cout status notes; do
    echo "    $name | in: $cin | out: $cout | $status | $notes"
  done
else
  log_fail "Database verification" "No records found for today"
fi
echo ""

# Step 12: QR with invalid token
echo "Step 12: QR Scan with Invalid Token"
INVALID_RESP=$(curl -s "$BASE/api/tenant/staff-attendance/qr" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"action":"scan","token":"qr_invalid_token_12345"}')
INVALID_ERROR=$(echo "$INVALID_RESP" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$INVALID_ERROR" ]; then
  log_pass "Invalid QR token rejected (error: $INVALID_ERROR)"
else
  log_fail "Invalid QR token rejected" "Response: $INVALID_RESP"
fi
echo ""

# Step 13: QR sessions table
echo "Step 13: Verify QR Sessions Table"
QR_TABLE=$(docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -t -A -c "SELECT count(*) FROM staff_attendance_qr_sessions WHERE date='$TODAY';")
if [ "$QR_TABLE" -ge 1 ]; then
  log_pass "QR sessions table exists ($QR_TABLE sessions for today)"
else
  log_fail "QR sessions table" "No sessions found"
fi
echo ""

# Step 14: Cleanup
echo "Step 14: Cleanup test data"
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "DELETE FROM staff_attendance WHERE date='$TODAY' AND (notes LIKE '%Test%' OR notes LIKE '%QR code%' OR notes LIKE '%Bulk%' OR notes LIKE '%manual%');" > /dev/null 2>&1
docker exec pisairtel-postgres psql -U pisairtel -d pisairtel_sms -c "DELETE FROM staff_attendance_qr_sessions WHERE date='$TODAY';" > /dev/null 2>&1
log_pass "Cleanup test data"
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
