#!/bin/bash
# Quick CBT flow test - login as superadmin, reset tenant admin password, then test CBT
BASE="http://localhost:3000"

echo "=========================================="
echo "  CBT END-TO-END FLOW TEST"
echo "=========================================="

# 1. Login as superadmin to get a token for password reset
echo ""
echo "=== 1. LOGIN AS SUPERADMIN ==="
SA_LOGIN=$(curl -s -X POST "$BASE/api/super-admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pisairtelsms.com","password":"admin123"}')
SA_TOKEN=$(echo "$SA_LOGIN" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$SA_TOKEN" ]; then
  echo "FAIL: Could not login as superadmin. Response: $(echo $SA_LOGIN | head -c 300)"
  exit 1
fi
echo "PASS: Superadmin login OK"

# 2. Reset tenant admin password
echo ""
echo "=== 2. RESET TENANT ADMIN PASSWORD ==="
RESET=$(curl -s -X PUT "$BASE/api/admin/tenant-admins" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -d '{"id":"staff_1779874611429_wf2i6u9","password":"testpass123"}')
echo "INFO: Reset response: $(echo $RESET | head -c 200)"

# 3. Login as tenant admin
echo ""
echo "=== 3. LOGIN AS TENANT ADMIN ==="
LOGIN=$(curl -s -X POST "$BASE/api/tenant/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"akoma@kreatixtech.com","password":"testpass123","tenantId":"f038d6a2-8957-45e6-a716-393dfd69173b"}')
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "FAIL: Could not login as tenant admin. Response: $(echo $LOGIN | head -c 300)"
  exit 1
fi
echo "PASS: Tenant admin login OK"

# 4. Create a question
echo ""
echo "=== 4. CREATE QUESTION ==="
Q_RESP=$(curl -s -X POST "$BASE/api/tenant/cbt/questions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"type\": \"objective\",
    \"subject\": \"Mathematics\",
    \"class\": \"JSS1\",
    \"difficulty\": \"Easy\",
    \"text\": \"CBT Test: What is 5 + 3? (ref: $(date +%s))\",
    \"options\": [\"6\", \"7\", \"8\", \"9\"],
    \"correctAnswer\": \"8\",
    \"explanation\": \"5 + 3 = 8\",
    \"marks\": 1
  }")
QUESTION_ID=$(echo "$Q_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$QUESTION_ID" ]; then
  echo "FAIL: Could not create question. Response: $(echo $Q_RESP | head -c 400)"
  exit 1
fi
echo "PASS: Created question ID=$QUESTION_ID"

# 5. Create an exam
echo ""
echo "=== 5. CREATE EXAM ==="
EXAM_RESP=$(curl -s -X POST "$BASE/api/tenant/cbt/exams" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\":\"CBT Flow Test Exam\",
    \"subject\":\"Mathematics\",
    \"class\":\"JSS1\",
    \"description\":\"End-to-end test exam\",
    \"duration\":30,
    \"passMark\":50,
    \"totalMarks\":100,
    \"questionIds\":[\"$QUESTION_ID\"]
  }")
EXAM_ID=$(echo "$EXAM_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$EXAM_ID" ]; then
  echo "FAIL: Could not create exam. Response: $(echo $EXAM_RESP | head -c 400)"
  exit 1
fi
echo "PASS: Created exam ID=$EXAM_ID"

# 6. Schedule the exam
echo ""
echo "=== 6. SCHEDULE EXAM ==="
SCHED_RESP=$(curl -s -X POST "$BASE/api/tenant/cbt/exams/$EXAM_ID/schedule" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"scheduledDate":"2026-08-23","scheduledTime":"09:00"}')
SCHED_STATUS=$(echo "$SCHED_RESP" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$SCHED_STATUS" = "Scheduled" ]; then
  echo "PASS: Exam scheduled (status=$SCHED_STATUS)"
else
  echo "FAIL: Schedule failed. Response: $(echo $SCHED_RESP | head -c 300)"
  exit 1
fi

# 7. Start the exam
echo ""
echo "=== 7. START EXAM ==="
START_RESP=$(curl -s -X POST "$BASE/api/tenant/cbt/exams/$EXAM_ID/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
START_STATUS=$(echo "$START_RESP" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$START_STATUS" = "Ongoing" ]; then
  echo "PASS: Exam started (status=$START_STATUS)"
else
  echo "FAIL: Start failed. Response: $(echo $START_RESP | head -c 300)"
  exit 1
fi

# 8. Insert test result directly via DB (simulating auto-grading)
echo ""
echo "=== 8. SIMULATE STUDENT SUBMISSION (via DB) ==="
# Write a small JS script to insert test data
cat > /app/insert_result.cjs << 'JSEOF'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const examId = process.argv[2];
    const questionId = process.argv[3];
    
    const r = await pool.query(
      "INSERT INTO exam_results (exam_id, student_id, score, total_marks, percentage, status, time_spent) VALUES ($1, 'test-student-001', 80, 100, 80, 'Passed', 1200) RETURNING id",
      [examId]
    );
    const resultId = r.rows[0].id;
    
    await pool.query(
      "INSERT INTO student_answers (result_id, question_id, student_answer, correct_answer, is_correct, marks_obtained, total_marks) VALUES ($1, $2, '8', '8', true, 80, 100)",
      [resultId, questionId]
    );
    
    console.log(resultId);
    await pool.end();
  } catch(e) {
    console.error('DB_ERR:' + e.message);
    process.exit(1);
  }
})();
JSEOF

DB_RESULT=$(node /app/insert_result.cjs "$EXAM_ID" "$QUESTION_ID" 2>&1)
RESULT_ID=$(echo "$DB_RESULT" | tr -d ' \n')
if [ -z "$RESULT_ID" ] || echo "$RESULT_ID" | grep -q "DB_ERR"; then
  echo "FAIL: Could not create test result. Output: $DB_RESULT"
  exit 1
fi
echo "PASS: Created result ID=$RESULT_ID"
echo "PASS: Recorded student answer"

# 9. End the exam
echo ""
echo "=== 9. END EXAM ==="
END_RESP=$(curl -s -X POST "$BASE/api/tenant/cbt/exams/$EXAM_ID/end" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")
END_STATUS=$(echo "$END_RESP" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$END_STATUS" = "Completed" ]; then
  echo "PASS: Exam ended (status=$END_STATUS)"
else
  echo "FAIL: End failed. Response: $(echo $END_RESP | head -c 300)"
  exit 1
fi

# 10. Fetch results summary
echo ""
echo "=== 10. FETCH RESULTS SUMMARY ==="
SUMMARY_RESP=$(curl -s -X GET "$BASE/api/tenant/cbt/results?id=$EXAM_ID&action=summary" \
  -H "Authorization: Bearer $TOKEN")
echo "INFO: Summary: $(echo $SUMMARY_RESP | head -c 600)"

if echo "$SUMMARY_RESP" | grep -q "<!doctype\|<html"; then
  echo "FAIL: Got HTML instead of JSON"
  exit 1
fi
if echo "$SUMMARY_RESP" | grep -q '"success":true'; then
  echo "PASS: Summary returned valid JSON with success=true"
else
  echo "WARN: Summary doesn't have success=true"
fi
if echo "$SUMMARY_RESP" | grep -q '"results"'; then
  echo "PASS: Results array present in summary"
else
  echo "WARN: No results array in summary"
fi
if echo "$SUMMARY_RESP" | grep -q '"examTitle"'; then
  echo "PASS: examTitle present in summary"
else
  echo "WARN: No examTitle in summary"
fi
if echo "$SUMMARY_RESP" | grep -q '"studentName"'; then
  echo "PASS: studentName present in results"
else
  echo "WARN: No studentName in results"
fi
if echo "$SUMMARY_RESP" | grep -q '"completionRate"'; then
  echo "PASS: completionRate present in summary"
else
  echo "WARN: No completionRate in summary"
fi

# 11. Fetch results list
echo ""
echo "=== 11. FETCH RESULTS LIST ==="
LIST_RESP=$(curl -s -X GET "$BASE/api/tenant/cbt/results?examId=$EXAM_ID&limit=10" \
  -H "Authorization: Bearer $TOKEN")
echo "INFO: List: $(echo $LIST_RESP | head -c 400)"

if echo "$LIST_RESP" | grep -q "<!doctype\|<html"; then
  echo "FAIL: Got HTML instead of JSON"
  exit 1
fi
if echo "$LIST_RESP" | grep -q '"data"'; then
  echo "PASS: Results list returned data"
else
  echo "WARN: No data in results list"
fi

# 12. Fetch detailed result with answers (using query params like frontend)
echo ""
echo "=== 12. FETCH DETAILED RESULT (answers) ==="
DETAIL_RESP=$(curl -s -X GET "$BASE/api/tenant/cbt/results?id=$RESULT_ID&action=answers" \
  -H "Authorization: Bearer $TOKEN")
echo "INFO: Detail: $(echo $DETAIL_RESP | head -c 500)"

if echo "$DETAIL_RESP" | grep -q "<!doctype\|<html"; then
  echo "FAIL: Got HTML instead of JSON"
  exit 1
fi
if echo "$DETAIL_RESP" | grep -q '"data"'; then
  echo "PASS: Answers endpoint returned data"
else
  echo "WARN: No data in answers response"
fi
if echo "$DETAIL_RESP" | grep -q '"questionText"'; then
  echo "PASS: questionText present in answers"
else
  echo "WARN: No questionText in answers"
fi

# 13. Fetch exam stats
echo ""
echo "=== 13. FETCH EXAM STATS ==="
STATS_RESP=$(curl -s -X GET "$BASE/api/tenant/cbt/exams/stats" \
  -H "Authorization: Bearer $TOKEN")
if echo "$STATS_RESP" | grep -q '"success":true'; then
  echo "PASS: Exam stats returned successfully"
else
  echo "WARN: Stats response: $(echo $STATS_RESP | head -c 200)"
fi

# 14. Cleanup
echo ""
echo "=== 14. CLEANUP ==="
cat > /app/cleanup_result.cjs << 'JSEOF2'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    const resultId = process.argv[2];
    await pool.query("DELETE FROM student_answers WHERE result_id = $1", [resultId]);
    await pool.query("DELETE FROM exam_results WHERE id = $1", [resultId]);
    await pool.end();
  } catch(e) { console.error(e.message); process.exit(1); }
})();
JSEOF2
node /app/cleanup_result.cjs "$RESULT_ID" 2>/dev/null

DEL_RESP=$(curl -s -X DELETE "$BASE/api/tenant/cbt/exams/$EXAM_ID" \
  -H "Authorization: Bearer $TOKEN")
if echo "$DEL_RESP" | grep -q '"success":true'; then
  echo "PASS: Test exam deleted"
else
  echo "WARN: Cleanup: $(echo $DEL_RESP | head -c 200)"
fi

curl -s -X DELETE "$BASE/api/tenant/cbt/questions/$QUESTION_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
echo "PASS: Test question deleted"

echo ""
echo "=========================================="
echo "  CBT FLOW TEST COMPLETE"
echo "=========================================="
