# Database Migration Testing and Verification Guide

## Overview

This guide provides comprehensive testing procedures to verify that database migrations have been applied correctly and the schema is ready for production use.

## Pre-Migration Checklist

Before running migrations, verify:

- [ ] PostgreSQL is installed and running
- [ ] Database credentials are correct
- [ ] User has necessary permissions
- [ ] Backup of existing database (if applicable)
- [ ] Network connectivity to database server
- [ ] Sufficient disk space for new tables

## Migration Execution

### Step 1: Verify Database Connection

```bash
# Test connection with psql
psql -h localhost -U postgres -d school_management -c "SELECT 1"

# Expected output: 
# ?column?
# ----------
#        1
```

### Step 2: Run Migrations

```bash
# Option A: Using API endpoint
curl -X POST http://localhost:3000/api/tenant/cbt/init-db \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Option B: Using direct SQL
psql -h localhost -U postgres -d school_management \
  -f api/tenant/cbt/_lib/migrations/001_create_cbt_tables.sql

# Option C: Using Node.js script
node api/tenant/cbt/_lib/migrations/run-migration.js
```

### Step 3: Verify Migration Completion

```bash
# Check for errors in logs
tail -f logs/migration.log

# Expected: "Migration completed successfully"
```

## Post-Migration Verification

### 1. Table Existence Verification

```bash
psql -h localhost -U postgres -d school_management

# List all tables
\dt

# Expected output:
#                    List of relations
#  Schema |          Name          | Type  | Owner
# --------+------------------------+-------+-------
#  public | exam_questions         | table | postgres
#  public | exam_results           | table | postgres
#  public | exams                  | table | postgres
#  public | proctoring_logs        | table | postgres
#  public | questions_bank         | table | postgres
#  public | security_settings      | table | postgres
#  public | student_answers        | table | postgres
#  public | student_exam_progress  | table | postgres
```

### 2. Column Verification

Verify each table has the correct columns:

```sql
-- Check questions_bank columns
\d questions_bank

-- Expected columns:
-- id, tenant_id, text, type, options, correct_answer, 
-- difficulty, subject, tags, created_by, created_at, updated_at, deleted_at

-- Check exams columns
\d exams

-- Expected columns:
-- id, tenant_id, title, subject, class, description, duration,
-- pass_mark, total_marks, status, scheduled_date, scheduled_time,
-- created_by, created_at, updated_at, deleted_at

-- Check exam_questions columns
\d exam_questions

-- Expected columns:
-- id, exam_id, question_id, question_order, marks, created_at

-- Check student_exam_progress columns
\d student_exam_progress

-- Expected columns:
-- id, exam_id, student_id, questions_answered, current_question,
-- status, time_remaining, last_activity_time, flag_reason, flagged_at,
-- created_at, updated_at

-- Check exam_results columns
\d exam_results

-- Expected columns:
-- id, exam_id, student_id, score, total_marks, percentage,
-- status, time_spent, submitted_at, created_at

-- Check student_answers columns
\d student_answers

-- Expected columns:
-- id, result_id, question_id, student_answer, correct_answer,
-- is_correct, marks_obtained, total_marks, created_at

-- Check security_settings columns
\d security_settings

-- Expected columns:
-- id, exam_id, enable_proctoring, disable_copy_paste,
-- disable_right_click, require_camera, randomize_questions,
-- randomize_options, allowed_ips, exam_password, created_at, updated_at

-- Check proctoring_logs columns
\d proctoring_logs

-- Expected columns:
-- id, exam_id, student_id, event_type, event_details, created_at
```

### 3. Constraint Verification

```sql
-- Check all constraints
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name, constraint_name;

-- Expected constraints:
-- questions_bank: valid_options, type check, difficulty check
-- exams: duration check, pass_mark check, total_marks check, valid_marks check, status check
-- exam_questions: marks check, unique(exam_id, question_id)
-- student_exam_progress: questions_answered check, current_question check, time_remaining check, status check, unique(exam_id, student_id)
-- exam_results: score check, total_marks check, percentage check, status check, time_spent check, unique(exam_id, student_id)
-- student_answers: marks_obtained check, total_marks check
-- security_settings: unique(exam_id)
-- proctoring_logs: (no specific constraints)
```

### 4. Index Verification

```sql
-- List all indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Expected indexes:
-- questions_bank: idx_questions_tenant, idx_questions_subject, idx_questions_difficulty, idx_questions_type, idx_questions_deleted
-- exams: idx_exams_tenant, idx_exams_status, idx_exams_scheduled_date, idx_exams_class, idx_exams_deleted
-- exam_questions: idx_exam_questions_exam, idx_exam_questions_question
-- student_exam_progress: idx_progress_exam, idx_progress_student, idx_progress_status, idx_progress_last_activity
-- exam_results: idx_results_exam, idx_results_student, idx_results_status, idx_results_submitted
-- student_answers: idx_answers_result, idx_answers_question
-- security_settings: idx_security_exam
-- proctoring_logs: idx_proctoring_exam, idx_proctoring_student, idx_proctoring_timestamp, idx_proctoring_event_type
```

### 5. Foreign Key Verification

```sql
-- Check foreign key constraints
SELECT constraint_name, table_name, column_name, foreign_table_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND foreign_table_name IS NOT NULL
ORDER BY table_name, constraint_name;

-- Expected foreign keys:
-- exam_questions -> exams(id), questions_bank(id)
-- student_exam_progress -> exams(id)
-- exam_results -> exams(id)
-- student_answers -> exam_results(id), questions_bank(id)
-- security_settings -> exams(id)
-- proctoring_logs -> exams(id)
```

### 6. Data Type Verification

```sql
-- Verify column data types
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Key data types to verify:
-- UUID columns: id, tenant_id, exam_id, question_id, student_id, result_id, created_by
-- TEXT columns: text, description, student_answer, flag_reason, event_details
-- JSONB columns: options, tags, allowed_ips
-- DECIMAL columns: pass_mark, total_marks, marks, score, percentage, marks_obtained
-- INTEGER columns: duration, questions_answered, current_question, time_remaining, time_spent
-- BOOLEAN columns: enable_proctoring, disable_copy_paste, disable_right_click, require_camera, randomize_questions, randomize_options, is_correct
-- TIMESTAMP columns: created_at, updated_at, deleted_at, last_activity_time, flagged_at, submitted_at
-- DATE columns: scheduled_date
-- TIME columns: scheduled_time
-- VARCHAR columns: type, difficulty, subject, status, event_type, exam_password
```

## Functional Testing

### Test 1: Insert Question

```sql
-- Insert a test question
INSERT INTO questions_bank (
  tenant_id, text, type, options, correct_answer,
  difficulty, subject, created_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'What is the capital of France?',
  'objective',
  '["London", "Paris", "Berlin", "Madrid"]'::jsonb,
  'Paris',
  'Easy',
  'Geography',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Verify insertion
SELECT * FROM questions_bank WHERE subject = 'Geography';

-- Expected: 1 row returned with all correct values
```

### Test 2: Insert Exam

```sql
-- Insert a test exam
INSERT INTO exams (
  tenant_id, title, subject, class, duration,
  pass_mark, total_marks, status, created_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Geography Quiz',
  'Geography',
  '10A',
  30,
  50,
  100,
  'Draft',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Verify insertion
SELECT * FROM exams WHERE title = 'Geography Quiz';

-- Expected: 1 row returned with status = 'Draft'
```

### Test 3: Link Question to Exam

```sql
-- Get IDs from previous tests
SELECT id INTO exam_id FROM exams WHERE title = 'Geography Quiz' LIMIT 1;
SELECT id INTO question_id FROM questions_bank WHERE subject = 'Geography' LIMIT 1;

-- Link question to exam
INSERT INTO exam_questions (exam_id, question_id, question_order, marks)
VALUES (exam_id, question_id, 1, 10);

-- Verify linking
SELECT eq.*, q.text, e.title
FROM exam_questions eq
JOIN questions_bank q ON eq.question_id = q.id
JOIN exams e ON eq.exam_id = e.id
WHERE e.title = 'Geography Quiz';

-- Expected: 1 row with question linked to exam
```

### Test 4: Create Student Progress

```sql
-- Create student progress record
INSERT INTO student_exam_progress (
  exam_id, student_id, status
) VALUES (
  exam_id,
  '550e8400-e29b-41d4-a716-446655440002',
  'Active'
);

-- Verify creation
SELECT * FROM student_exam_progress WHERE status = 'Active';

-- Expected: 1 row with status = 'Active'
```

### Test 5: Record Exam Result

```sql
-- Record exam result
INSERT INTO exam_results (
  exam_id, student_id, score, total_marks, percentage, status, time_spent
) VALUES (
  exam_id,
  '550e8400-e29b-41d4-a716-446655440002',
  75,
  100,
  75,
  'Passed',
  1800
);

-- Verify result
SELECT * FROM exam_results WHERE status = 'Passed';

-- Expected: 1 row with score = 75, status = 'Passed'
```

### Test 6: Record Student Answer

```sql
-- Get result ID
SELECT id INTO result_id FROM exam_results WHERE status = 'Passed' LIMIT 1;

-- Record student answer
INSERT INTO student_answers (
  result_id, question_id, student_answer, correct_answer,
  is_correct, marks_obtained, total_marks
) VALUES (
  result_id,
  question_id,
  'Paris',
  'Paris',
  true,
  10,
  10
);

-- Verify answer
SELECT * FROM student_answers WHERE is_correct = true;

-- Expected: 1 row with is_correct = true, marks_obtained = 10
```

### Test 7: Create Security Settings

```sql
-- Create security settings
INSERT INTO security_settings (
  exam_id, enable_proctoring, require_camera,
  randomize_questions, allowed_ips
) VALUES (
  exam_id,
  true,
  true,
  true,
  '["192.168.1.0/24"]'::jsonb
);

-- Verify settings
SELECT * FROM security_settings WHERE enable_proctoring = true;

-- Expected: 1 row with enable_proctoring = true
```

### Test 8: Log Proctoring Event

```sql
-- Log proctoring event
INSERT INTO proctoring_logs (
  exam_id, student_id, event_type, event_details
) VALUES (
  exam_id,
  '550e8400-e29b-41d4-a716-446655440002',
  'camera_on',
  '{"timestamp": "2024-01-15T10:30:00Z"}'::jsonb
);

-- Verify logging
SELECT * FROM proctoring_logs WHERE event_type = 'camera_on';

-- Expected: 1 row with event_type = 'camera_on'
```

## Constraint Testing

### Test 1: Invalid Question Type

```sql
-- Try to insert question with invalid type
INSERT INTO questions_bank (
  tenant_id, text, type, options, correct_answer,
  difficulty, subject, created_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test question',
  'invalid_type',  -- Invalid!
  '["A", "B"]'::jsonb,
  'A',
  'Easy',
  'Test',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Expected: ERROR - violates check constraint "questions_bank_type_check"
```

### Test 2: Invalid Exam Duration

```sql
-- Try to insert exam with invalid duration
INSERT INTO exams (
  tenant_id, title, subject, class, duration,
  pass_mark, total_marks, status, created_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Invalid Exam',
  'Test',
  '10A',
  10,  -- Invalid! Must be 15-480
  50,
  100,
  'Draft',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Expected: ERROR - violates check constraint "exams_duration_check"
```

### Test 3: Invalid Pass Mark

```sql
-- Try to insert exam with invalid pass mark
INSERT INTO exams (
  tenant_id, title, subject, class, duration,
  pass_mark, total_marks, status, created_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Invalid Exam',
  'Test',
  '10A',
  30,
  150,  -- Invalid! Must be 0-100
  100,
  'Draft',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Expected: ERROR - violates check constraint "exams_pass_mark_check"
```

### Test 4: Invalid Total Marks

```sql
-- Try to insert exam with total_marks <= pass_mark
INSERT INTO exams (
  tenant_id, title, subject, class, duration,
  pass_mark, total_marks, status, created_by
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Invalid Exam',
  'Test',
  '10A',
  30,
  80,
  50,  -- Invalid! Must be > pass_mark
  'Draft',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Expected: ERROR - violates check constraint "exams_valid_marks"
```

## Performance Testing

### Test 1: Index Performance

```sql
-- Test index usage for tenant filtering
EXPLAIN ANALYZE
SELECT * FROM questions_bank 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Expected: Uses index idx_questions_tenant
-- Seq Scan should NOT appear (unless table is very small)
```

### Test 2: Foreign Key Performance

```sql
-- Test join performance
EXPLAIN ANALYZE
SELECT e.title, COUNT(eq.id) as question_count
FROM exams e
LEFT JOIN exam_questions eq ON e.id = eq.exam_id
WHERE e.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY e.id, e.title;

-- Expected: Uses indexes for joins
```

### Test 3: Soft Delete Performance

```sql
-- Test soft delete query performance
EXPLAIN ANALYZE
SELECT * FROM questions_bank 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
AND deleted_at IS NULL;

-- Expected: Uses index idx_questions_deleted
```

## Cleanup

After testing, clean up test data:

```sql
-- Delete test data (in reverse order of dependencies)
DELETE FROM proctoring_logs WHERE exam_id = exam_id;
DELETE FROM security_settings WHERE exam_id = exam_id;
DELETE FROM student_answers WHERE result_id IN (
  SELECT id FROM exam_results WHERE exam_id = exam_id
);
DELETE FROM exam_results WHERE exam_id = exam_id;
DELETE FROM student_exam_progress WHERE exam_id = exam_id;
DELETE FROM exam_questions WHERE exam_id = exam_id;
DELETE FROM exams WHERE id = exam_id;
DELETE FROM questions_bank WHERE subject = 'Geography';

-- Verify cleanup
SELECT COUNT(*) FROM exams;
SELECT COUNT(*) FROM questions_bank;
```

## Verification Checklist

After running all tests, verify:

- [ ] All 8 tables created successfully
- [ ] All columns have correct data types
- [ ] All constraints are enforced
- [ ] All indexes are created
- [ ] All foreign keys are working
- [ ] Insert operations work correctly
- [ ] Update operations work correctly
- [ ] Delete operations work correctly
- [ ] Soft delete functionality works
- [ ] Constraint violations are caught
- [ ] Index performance is good
- [ ] No orphaned data exists

## Troubleshooting

### Issue: "Relation does not exist"

```bash
# Verify table exists
psql -h localhost -U postgres -d school_management -c "\dt questions_bank"

# If not found, re-run migrations
psql -h localhost -U postgres -d school_management \
  -f api/tenant/cbt/_lib/migrations/001_create_cbt_tables.sql
```

### Issue: "Constraint violation"

```bash
# Check constraint definition
SELECT constraint_name, constraint_definition
FROM information_schema.check_constraints
WHERE table_name = 'exams';

# Verify data meets constraints before inserting
```

### Issue: "Index not being used"

```bash
# Analyze table statistics
ANALYZE questions_bank;

# Reindex if necessary
REINDEX TABLE questions_bank;

# Check query plan
EXPLAIN ANALYZE SELECT * FROM questions_bank WHERE tenant_id = '...';
```

## Next Steps

After successful verification:

1. ✅ Document any custom configurations
2. ✅ Set up automated backups
3. ✅ Configure monitoring and alerts
4. ✅ Deploy to production
5. ✅ Monitor performance in production

</content>
