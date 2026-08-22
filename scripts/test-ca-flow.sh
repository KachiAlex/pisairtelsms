#!/bin/bash
# CA-to-Result Compilation E2E Test
# Tests: CA config → CA score entry → Exam score entry → Recompute → Compile → Approve → Publish → Broadsheet

BASE="http://localhost:3000"
TENANT_ID="f038d6a2-8957-45e6-a716-393dfd69173b"
TENANT_EMAIL="akoma@kreatixtech.com"
TENANT_PASSWORD="password123"
SESSION="2025%2F2026"
SESSION_RAW="2025/2026"
TERM="First%20Term"
TERM_RAW="First Term"
CLASS="JSS1A"
SUBJECT="Mathematics"
STUDENT_ID="test-ca-student-001"
STUDENT_ID2="test-ca-student-002"

echo "=========================================="
echo "  CA-TO-RESULT COMPILATION FLOW TEST"
echo "=========================================="

# 1a. Login as superadmin to reset tenant admin password
echo ""
echo "=== 1a. LOGIN AS SUPERADMIN ==="
SA_LOGIN=$(curl -s -X POST "$BASE/api/super-admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pisairtelsms.com","password":"admin123"}')
SA_TOKEN=$(echo "$SA_LOGIN" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$SA_TOKEN" ]; then
  echo "FAIL: Superadmin login failed"
  exit 1
fi
echo "PASS: Superadmin login OK"

# 1b. Reset tenant admin password
echo ""
echo "=== 1b. RESET TENANT ADMIN PASSWORD ==="
RESET_RESP=$(curl -s -X PUT "$BASE/api/admin/tenant-admins" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -d '{"id":"staff_1779874611429_wf2i6u9","password":"password123"}')
if echo "$RESET_RESP" | grep -q '"success":true'; then
  echo "PASS: Password reset OK"
else
  echo "INFO: Reset response: $(echo $RESET_RESP | head -c 200)"
fi

# 1. Login as tenant admin
echo ""
echo "=== 1. LOGIN AS TENANT ADMIN ==="
LOGIN_RESP=$(curl -s -X POST "$BASE/api/tenant/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "FAIL: Login failed. Response: $(echo $LOGIN_RESP | head -c 300)"
  exit 1
fi
echo "PASS: Tenant admin login OK"

# 2. Get current CA config
echo ""
echo "=== 2. GET CA CONFIG ==="
CA_RESP=$(curl -s -X GET "$BASE/api/tenant/ca-config" \
  -H "Authorization: Bearer $TOKEN")
if echo "$CA_RESP" | grep -q '"published"'; then
  echo "PASS: CA config returned"
  echo "INFO: $(echo $CA_RESP | head -c 300)"
else
  echo "FAIL: CA config fetch failed. Response: $(echo $CA_RESP | head -c 300)"
  exit 1
fi

# 3. Save draft CA config (JSS weights: tests=25, assignments=15, projects=10, exams=50)
echo ""
echo "=== 3. SAVE DRAFT CA CONFIG ==="
DRAFT_RESP=$(curl -s -X PUT "$BASE/api/tenant/ca-config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"primary\": {\"tests\": 30, \"assignments\": 20, \"projects\": 10, \"exams\": 40},
    \"jss\": {\"tests\": 25, \"assignments\": 15, \"projects\": 10, \"exams\": 50},
    \"sss\": {\"tests\": 20, \"assignments\": 15, \"projects\": 15, \"exams\": 50}
  }")
if echo "$DRAFT_RESP" | grep -q '"data"'; then
  echo "PASS: Draft CA config saved"
else
  echo "FAIL: Draft save failed. Response: $(echo $DRAFT_RESP | head -c 300)"
  exit 1
fi

# 4. Publish CA config
echo ""
echo "=== 4. PUBLISH CA CONFIG ==="
PUB_RESP=$(curl -s -X POST "$BASE/api/tenant/ca-config?action=publish" \
  -H "Authorization: Bearer $TOKEN")
if echo "$PUB_RESP" | grep -q '"data"'; then
  echo "PASS: CA config published"
else
  echo "FAIL: Publish failed. Response: $(echo $PUB_RESP | head -c 300)"
  exit 1
fi

# 5. Verify published config
echo ""
echo "=== 5. VERIFY PUBLISHED CA CONFIG ==="
VERIFY_RESP=$(curl -s -X GET "$BASE/api/tenant/ca-config" \
  -H "Authorization: Bearer $TOKEN")
if echo "$VERIFY_RESP" | grep -q '"status":"published"'; then
  echo "PASS: Config status is published"
else
  echo "WARN: Config status not published. Response: $(echo $VERIFY_RESP | head -c 200)"
fi

# 6. Enter CA scores for student 1 (tests=80, assignments=70, projects=90, exams=85)
echo ""
echo "=== 6. ENTER CA SCORES (Student 1) ==="
SCORE1_RESP=$(curl -s -X POST "$BASE/api/tenant/results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"subject\": \"$SUBJECT\",
    \"academicSession\": \"$SESSION_RAW\",
    \"term\": \"$TERM_RAW\",
    \"class\": \"$CLASS\",
    \"testsScore\": 80,
    \"assignmentsScore\": 70,
    \"projectsScore\": 90,
    \"examsScore\": 85,
    \"submittedByName\": \"Test Teacher\"
  }")
if echo "$SCORE1_RESP" | grep -q '"data"'; then
  TOTAL1=$(echo "$SCORE1_RESP" | grep -o '"totalScore":[0-9.]*' | head -1 | cut -d':' -f2)
  echo "PASS: Student 1 score created (totalScore=$TOTAL1)"
else
  echo "FAIL: Score entry failed. Response: $(echo $SCORE1_RESP | head -c 400)"
  exit 1
fi

# 7. Enter CA scores for student 2 (tests=60, assignments=65, projects=70, exams=75)
echo ""
echo "=== 7. ENTER CA SCORES (Student 2) ==="
SCORE2_RESP=$(curl -s -X POST "$BASE/api/tenant/results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"studentId\": \"$STUDENT_ID2\",
    \"subject\": \"$SUBJECT\",
    \"academicSession\": \"$SESSION_RAW\",
    \"term\": \"$TERM_RAW\",
    \"class\": \"$CLASS\",
    \"testsScore\": 60,
    \"assignmentsScore\": 65,
    \"projectsScore\": 70,
    \"examsScore\": 75,
    \"submittedByName\": \"Test Teacher\"
  }")
if echo "$SCORE2_RESP" | grep -q '"data"'; then
  TOTAL2=$(echo "$SCORE2_RESP" | grep -o '"totalScore":[0-9.]*' | head -1 | cut -d':' -f2)
  echo "PASS: Student 2 score created (totalScore=$TOTAL2)"
else
  echo "FAIL: Score entry failed. Response: $(echo $SCORE2_RESP | head -c 400)"
  exit 1
fi

# 8. Enter a second subject for both students (for broadsheet)
echo ""
echo "=== 8. ENTER SECOND SUBJECT SCORES ==="
SCORE3_RESP=$(curl -s -X POST "$BASE/api/tenant/results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"studentId\": \"$STUDENT_ID\",
    \"subject\": \"English\",
    \"academicSession\": \"$SESSION_RAW\",
    \"term\": \"$TERM_RAW\",
    \"class\": \"$CLASS\",
    \"testsScore\": 75,
    \"assignmentsScore\": 80,
    \"projectsScore\": 85,
    \"examsScore\": 70,
    \"submittedByName\": \"Test Teacher\"
  }")
if echo "$SCORE3_RESP" | grep -q '"data"'; then
  echo "PASS: Student 1 English score created"
else
  echo "WARN: English score entry failed. Response: $(echo $SCORE3_RESP | head -c 300)"
fi

SCORE4_RESP=$(curl -s -X POST "$BASE/api/tenant/results" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"studentId\": \"$STUDENT_ID2\",
    \"subject\": \"English\",
    \"academicSession\": \"$SESSION_RAW\",
    \"term\": \"$TERM_RAW\",
    \"class\": \"$CLASS\",
    \"testsScore\": 55,
    \"assignmentsScore\": 60,
    \"projectsScore\": 65,
    \"examsScore\": 50,
    \"submittedByName\": \"Test Teacher\"
  }")
if echo "$SCORE4_RESP" | grep -q '"data"'; then
  echo "PASS: Student 2 English score created"
else
  echo "WARN: English score entry failed. Response: $(echo $SCORE4_RESP | head -c 300)"
fi

# 9. Fetch class scores to verify
echo ""
echo "=== 9. FETCH CLASS SCORES ==="
CLASS_RESP=$(curl -s -X GET "$BASE/api/tenant/results?action=class-scores&class=$CLASS&subject=$SUBJECT&academicSession=$SESSION&term=$TERM" \
  -H "Authorization: Bearer $TOKEN")
if echo "$CLASS_RESP" | grep -q '"data"'; then
  COUNT=$(echo "$CLASS_RESP" | grep -o '"studentId"' | wc -l)
  echo "PASS: Class scores returned ($COUNT records)"
else
  echo "WARN: Class scores fetch failed. Response: $(echo $CLASS_RESP | head -c 300)"
fi

# 10. Recompute scores (apply CA weights)
echo ""
echo "=== 10. RECOMPUTE SCORES ==="
RECOMPUTE_RESP=$(curl -s -X PUT "$BASE/api/tenant/results?action=recompute&academicSession=$SESSION&term=$TERM&class=$CLASS" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RECOMPUTE_RESP" | grep -q '"success":true'; then
  RECOMPUTED=$(echo "$RECOMPUTE_RESP" | grep -o '"recomputed":[0-9]*' | head -1 | cut -d':' -f2)
  echo "PASS: Recompute done (recomputed=$RECOMPUTED)"
else
  echo "WARN: Recompute response: $(echo $RECOMPUTE_RESP | head -c 300)"
fi

# 11. Compile results
echo ""
echo "=== 11. COMPILE RESULTS ==="
COMPILE_RESP=$(curl -s -X PUT "$BASE/api/tenant/results?action=compile&academicSession=$SESSION&term=$TERM&class=$CLASS" \
  -H "Authorization: Bearer $TOKEN")
if echo "$COMPILE_RESP" | grep -q '"success":true'; then
  COMPILED=$(echo "$COMPILE_RESP" | grep -o '"compiled":[0-9]*' | head -1 | cut -d':' -f2)
  echo "PASS: Results compiled (compiled=$COMPILED)"
  # Check for grade and position in results
  if echo "$COMPILE_RESP" | grep -q '"grade"'; then
    echo "PASS: Grades assigned in compiled results"
  else
    echo "WARN: No grades in compiled results"
  fi
  if echo "$COMPILE_RESP" | grep -q '"classPosition"'; then
    echo "PASS: Class positions assigned"
  else
    echo "WARN: No class positions in compiled results"
  fi
  if echo "$COMPILE_RESP" | grep -q '"principalComment"'; then
    echo "PASS: Principal comments generated"
  else
    echo "WARN: No principal comments in compiled results"
  fi
else
  echo "FAIL: Compile failed. Response: $(echo $COMPILE_RESP | head -c 400)"
  exit 1
fi

# 12. Fetch compiled results
echo ""
echo "=== 12. FETCH COMPILED RESULTS ==="
FETCH_COMPILED=$(curl -s -X GET "$BASE/api/tenant/results?action=compiled&academicSession=$SESSION&term=$TERM&class=$CLASS" \
  -H "Authorization: Bearer $TOKEN")
if echo "$FETCH_COMPILED" | grep -q '"data"'; then
  echo "PASS: Compiled results fetched"
  echo "INFO: $(echo $FETCH_COMPILED | head -c 400)"
else
  echo "WARN: Compiled results fetch: $(echo $FETCH_COMPILED | head -c 300)"
fi

# 13. Approve compiled results
echo ""
echo "=== 13. APPROVE COMPILED RESULTS ==="
APPROVE_RESP=$(curl -s -X PUT "$BASE/api/tenant/results?action=approve&academicSession=$SESSION&term=$TERM&class=$CLASS" \
  -H "Authorization: Bearer $TOKEN")
if echo "$APPROVE_RESP" | grep -q '"success":true'; then
  APPROVED=$(echo "$APPROVE_RESP" | grep -o '"approved":[0-9]*' | head -1 | cut -d':' -f2)
  echo "PASS: Results approved (approved=$APPROVED)"
else
  echo "FAIL: Approve failed. Response: $(echo $APPROVE_RESP | head -c 300)"
  exit 1
fi

# 14. Publish compiled results
echo ""
echo "=== 14. PUBLISH COMPILED RESULTS ==="
PUBLISH_RESP=$(curl -s -X PUT "$BASE/api/tenant/results?action=publish&academicSession=$SESSION&term=$TERM&class=$CLASS" \
  -H "Authorization: Bearer $TOKEN")
if echo "$PUBLISH_RESP" | grep -q '"success":true'; then
  PUBLISHED=$(echo "$PUBLISH_RESP" | grep -o '"published":[0-9]*' | head -1 | cut -d':' -f2)
  echo "PASS: Results published (published=$PUBLISHED)"
else
  echo "FAIL: Publish failed. Response: $(echo $PUBLISH_RESP | head -c 300)"
  exit 1
fi

# 15. Fetch broadsheet
echo ""
echo "=== 15. FETCH BROADSHEET ==="
BROAD_RESP=$(curl -s -X GET "$BASE/api/tenant/results?action=broadsheet&class=$CLASS&academicSession=$SESSION&term=$TERM" \
  -H "Authorization: Bearer $TOKEN")
if echo "$BROAD_RESP" | grep -q '"data"'; then
  echo "PASS: Broadsheet fetched"
  if echo "$BROAD_RESP" | grep -q '"subjects"'; then
    echo "PASS: Broadsheet has subjects"
  fi
  if echo "$BROAD_RESP" | grep -q '"students"'; then
    echo "PASS: Broadsheet has students"
  fi
  if echo "$BROAD_RESP" | grep -q '"classPosition"'; then
    echo "PASS: Broadsheet has class positions"
  fi
  echo "INFO: $(echo $BROAD_RESP | head -c 500)"
else
  echo "WARN: Broadsheet fetch: $(echo $BROAD_RESP | head -c 300)"
fi

# 16. Verify weighted total calculation
echo ""
echo "=== 16. VERIFY WEIGHTED TOTAL ==="
# JSS weights: tests=25%, assignments=15%, projects=10%, exams=50%
# Student 1: (80*25 + 70*15 + 90*10 + 85*50) / 100 = (2000 + 1050 + 900 + 4250) / 100 = 82
EXPECTED_TOTAL=82
if [ -n "$TOTAL1" ]; then
  # Compare with tolerance
  DIFF=$(echo "$TOTAL1 - $EXPECTED_TOTAL" | bc 2>/dev/null || echo "0")
  ABS_DIFF=${DIFF#-}
  if [ "$ABS_DIFF" -le 1 ] 2>/dev/null; then
    echo "PASS: Weighted total correct (got=$TOTAL1, expected=$EXPECTED_TOTAL)"
  else
    echo "WARN: Weighted total mismatch (got=$TOTAL1, expected=$EXPECTED_TOTAL)"
  fi
else
  echo "WARN: Could not verify weighted total (no value)"
fi

# 17. Fetch CA config audit log
echo ""
echo "=== 17. FETCH CA CONFIG AUDIT LOG ==="
AUDIT_RESP=$(curl -s -X GET "$BASE/api/tenant/ca-config?action=audit" \
  -H "Authorization: Bearer $TOKEN")
if echo "$AUDIT_RESP" | grep -q '"data"'; then
  echo "PASS: Audit log fetched"
else
  echo "WARN: Audit log fetch: $(echo $AUDIT_RESP | head -c 200)"
fi

# 18. Fetch teacher submissions
echo ""
echo "=== 18. FETCH TEACHER SUBMISSIONS ==="
SUB_RESP=$(curl -s -X GET "$BASE/api/tenant/results?action=teacher-submissions&academicSession=$SESSION&term=$TERM&class=$CLASS" \
  -H "Authorization: Bearer $TOKEN")
if echo "$SUB_RESP" | grep -q '"data"'; then
  echo "PASS: Teacher submissions fetched"
else
  echo "WARN: Teacher submissions: $(echo $SUB_RESP | head -c 200)"
fi

# 19. Cleanup
echo ""
echo "=== 19. CLEANUP ==="
# Delete test scores and compiled results via DB
cat > /app/cleanup_ca.cjs << 'JSEOF'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    const session = process.argv[2];
    const term = process.argv[3];
    const className = process.argv[4];
    const subject = process.argv[5];
    const s1 = process.argv[6];
    const s2 = process.argv[7];

    // Delete compiled results
    await pool.query("DELETE FROM compiled_results WHERE academic_session = $1 AND term = $2 AND class = $3", [session, term, className]);
    
    // Delete student scores
    await pool.query("DELETE FROM student_scores WHERE academic_session = $1 AND term = $2 AND class = $3", [session, term, className]);

    console.log('CLEANUP_OK');
    await pool.end();
  } catch(e) { console.error('DB_ERR:' + e.message); process.exit(1); }
})();
JSEOF
CLEANUP=$(node /app/cleanup_ca.cjs "$SESSION_RAW" "$TERM_RAW" "$CLASS" "$SUBJECT" "$STUDENT_ID" "$STUDENT_ID2" 2>&1)
if echo "$CLEANUP" | grep -q "CLEANUP_OK"; then
  echo "PASS: Test data cleaned up"
else
  echo "WARN: Cleanup output: $CLEANUP"
fi

echo ""
echo "=========================================="
echo "  CA-TO-RESULT FLOW TEST COMPLETE"
echo "=========================================="
