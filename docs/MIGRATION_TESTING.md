# CBT Database Migration Testing Guide

## Overview

This guide provides comprehensive instructions for testing the CBT database schema migrations. It covers verification procedures, testing strategies, and troubleshooting steps.

## Pre-Migration Checklist

Before running migrations, ensure:

- [ ] Database connection is configured correctly
- [ ] DATABASE_URL environment variable is set
- [ ] PostgreSQL version is 12 or higher
- [ ] Sufficient disk space available
- [ ] Database backups are current
- [ ] No active connections to the database
- [ ] All team members are notified

## Migration Execution

### Step 1: Verify Migration Files

```bash
# Check migration status
npx prisma migrate status

# Expected output:
# Following migration have not yet been applied:
# 0_init
```

### Step 2: Apply Migrations

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Expected output:
# Applying migration `0_init`
# Migration `0_init` applied successfully
```

### Step 3: Verify Schema Creation

```bash
# Generate Prisma client
npx prisma generate

# Expected output:
# ✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in 123ms
```

## Post-Migration Verification

### Verify All Tables Exist

```bash
# Connect to database
psql $DATABASE_URL

# List all CBT tables
\dt public.questions_bank
\dt public.exams
\dt public.exam_questions
\dt public.student_exam_progress
\dt public.exam_results
\dt public.student_answers
\dt public.security_settings
\dt public.proctoring_logs
\dt public.audit_logs
\dt public.offline_sync_queue

# Expected output: All tables should exist with correct structure
```

### Verify Table Structure

```sql
-- Check questions_bank table structure
\d public.questions_bank

-- Expected columns:
-- id, tenantId, text, type, options, correctAnswer, difficulty, subject, tags, createdBy, createdAt, updatedAt, deletedAt
```

### Verify Indexes

```sql
-- List all indexes for CBT tables
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN (
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
)
ORDER BY tablename, indexname;

-- Expected: 40+ indexes across all tables
```

### Verify Foreign Keys

```sql
-- List all foreign keys
SELECT
    constraint_name,
    table_name,
    column_name,
    foreign_table_name
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
WHERE table_name IN (
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
)
ORDER BY table_name;

-- Expected: 20+ foreign key constraints
```

### Verify Unique Constraints

```sql
-- List all unique constraints
SELECT
    constraint_name,
    table_name,
    column_name
FROM information_schema.constraint_column_usage
WHERE constraint_name LIKE '%_key'
AND table_name IN (
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
)
ORDER BY table_name;

-- Expected: Unique constraints on:
-- - users(tenantId, email)
-- - exam_questions(examId, questionId)
-- - student_exam_progress(examId, studentId)
-- - exam_results(examId, studentId)
-- - security_settings(examId)
```

## Functional Testing

### Test 1: Insert Test Data

```sql
-- Insert test tenant
INSERT INTO tenants (id, name, domain) 
VALUES ('test-tenant-1', 'Test School', 'test.example.com');

-- Insert test user
INSERT INTO users (id, tenantId, email, name, role) 
VALUES ('test-user-1', 'test-tenant-1', 'teacher@test.com', 'Test Teacher', 'invigilator');

-- Insert test question
INSERT INTO questions_bank (id, tenantId, text, type, difficulty, subject, createdBy) 
VALUES (
    'test-q-1',
    'test-tenant-1',
    'What is 2+2?',
    'objective',
    'Easy',
    'Math',
    'test-user-1'
);

-- Insert test exam
INSERT INTO exams (id, tenantId, title, subject, class, duration, passMark, totalMarks, createdBy) 
VALUES (
    'test-exam-1',
    'test-tenant-1',
    'Math Quiz',
    'Math',
    'Class 10',
    30,
    40.00,
    100.00,
    'test-user-1'
);

-- Expected: All inserts succeed without errors
```

### Test 2: Verify Soft Deletes

```sql
-- Soft delete a question
UPDATE questions_bank SET deletedAt = CURRENT_TIMESTAMP WHERE id = 'test-q-1';

-- Verify soft delete
SELECT * FROM questions_bank WHERE id = 'test-q-1';
-- Expected: deletedAt is set to current timestamp

-- Verify active questions query
SELECT * FROM questions_bank WHERE deletedAt IS NULL;
-- Expected: test-q-1 is not in results
```

### Test 3: Verify Foreign Key Constraints

```sql
-- Try to insert exam_question with non-existent exam
INSERT INTO exam_questions (id, examId, questionId, questionOrder, marks) 
VALUES ('test-eq-1', 'non-existent-exam', 'test-q-1', 1, 10.00);

-- Expected: Foreign key constraint violation error
-- ERROR: insert or update on table "exam_questions" violates foreign key constraint
```

### Test 4: Verify Unique Constraints

```sql
-- Try to insert duplicate exam_question
INSERT INTO exam_questions (id, examId, questionId, questionOrder, marks) 
VALUES ('test-eq-1', 'test-exam-1', 'test-q-1', 1, 10.00);

INSERT INTO exam_questions (id, examId, questionId, questionOrder, marks) 
VALUES ('test-eq-2', 'test-exam-1', 'test-q-1', 2, 10.00);

-- Expected: Unique constraint violation error
-- ERROR: duplicate key value violates unique constraint "exam_questions_examId_questionId_key"
```

### Test 5: Verify Cascade Delete

```sql
-- Insert exam with questions
INSERT INTO exam_questions (id, examId, questionId, questionOrder, marks) 
VALUES ('test-eq-1', 'test-exam-1', 'test-q-1', 1, 10.00);

-- Delete exam
DELETE FROM exams WHERE id = 'test-exam-1';

-- Verify cascade delete
SELECT * FROM exam_questions WHERE examId = 'test-exam-1';
-- Expected: No rows returned (cascade delete worked)
```

## Performance Testing

### Test 1: Index Performance

```sql
-- Create test data (1000 questions)
INSERT INTO questions_bank (id, tenantId, text, type, difficulty, subject, createdBy)
SELECT
    'q-' || i,
    'test-tenant-1',
    'Question ' || i,
    CASE WHEN i % 3 = 0 THEN 'objective' WHEN i % 3 = 1 THEN 'truefalse' ELSE 'essay' END,
    CASE WHEN i % 3 = 0 THEN 'Easy' WHEN i % 3 = 1 THEN 'Medium' ELSE 'Hard' END,
    'Math',
    'test-user-1'
FROM generate_series(1, 1000) AS i;

-- Test query with index (should be fast)
EXPLAIN ANALYZE
SELECT * FROM questions_bank 
WHERE tenantId = 'test-tenant-1' AND subject = 'Math' AND difficulty = 'Easy';

-- Expected: Index scan, execution time < 10ms
```

### Test 2: Query Performance

```sql
-- Test complex query performance
EXPLAIN ANALYZE
SELECT 
    e.title,
    COUNT(eq.id) as question_count,
    COUNT(DISTINCT sep.studentId) as student_count
FROM exams e
LEFT JOIN exam_questions eq ON e.id = eq.examId
LEFT JOIN student_exam_progress sep ON e.id = sep.examId
WHERE e.tenantId = 'test-tenant-1' AND e.deletedAt IS NULL
GROUP BY e.id, e.title;

-- Expected: Execution time < 100ms
```

## Data Integrity Testing

### Test 1: Referential Integrity

```sql
-- Verify all foreign keys are valid
SELECT 
    'questions_bank' as table_name,
    COUNT(*) as invalid_count
FROM questions_bank qb
WHERE qb.tenantId NOT IN (SELECT id FROM tenants)
UNION ALL
SELECT 
    'exams',
    COUNT(*)
FROM exams e
WHERE e.tenantId NOT IN (SELECT id FROM tenants)
UNION ALL
SELECT 
    'exam_questions',
    COUNT(*)
FROM exam_questions eq
WHERE eq.examId NOT IN (SELECT id FROM exams)
   OR eq.questionId NOT IN (SELECT id FROM questions_bank);

-- Expected: All counts should be 0
```

### Test 2: Unique Constraint Integrity

```sql
-- Verify unique constraints
SELECT 
    'users' as table_name,
    COUNT(*) as duplicate_count
FROM (
    SELECT tenantId, email, COUNT(*) as cnt
    FROM users
    WHERE deletedAt IS NULL
    GROUP BY tenantId, email
    HAVING COUNT(*) > 1
) t
UNION ALL
SELECT 
    'exam_questions',
    COUNT(*)
FROM (
    SELECT examId, questionId, COUNT(*) as cnt
    FROM exam_questions
    GROUP BY examId, questionId
    HAVING COUNT(*) > 1
) t;

-- Expected: All counts should be 0
```

## Rollback Testing

### Test Rollback Procedure

```bash
# Create a backup before testing rollback
pg_dump $DATABASE_URL > backup_before_rollback.sql

# Execute rollback (DEVELOPMENT ONLY)
psql $DATABASE_URL < prisma/migrations/rollback.sql

# Verify tables are dropped
psql $DATABASE_URL -c "\dt public.*"

# Expected: No CBT tables should exist

# Restore from backup
psql $DATABASE_URL < backup_before_rollback.sql

# Verify tables are restored
psql $DATABASE_URL -c "\dt public.*"

# Expected: All CBT tables should exist
```

## Troubleshooting

### Issue: Migration Fails with "Table Already Exists"

**Cause:** Tables already exist from previous migration attempt

**Solution:**
```bash
# Check migration history
npx prisma migrate status

# If migration is marked as applied but tables don't exist:
npx prisma migrate resolve --rolled-back 0_init

# Re-apply migration
npx prisma migrate deploy
```

### Issue: Foreign Key Constraint Violation

**Cause:** Attempting to delete a record that is referenced by other records

**Solution:**
```sql
-- Find referencing records
SELECT * FROM exam_questions WHERE examId = 'exam-id';

-- Delete referencing records first
DELETE FROM exam_questions WHERE examId = 'exam-id';

-- Then delete the exam
DELETE FROM exams WHERE id = 'exam-id';
```

### Issue: Unique Constraint Violation

**Cause:** Attempting to insert duplicate data

**Solution:**
```sql
-- Check for existing records
SELECT * FROM exam_questions 
WHERE examId = 'exam-id' AND questionId = 'question-id';

-- If record exists, update instead of insert
UPDATE exam_questions 
SET marks = 10.00 
WHERE examId = 'exam-id' AND questionId = 'question-id';
```

### Issue: Index Performance Degradation

**Cause:** Indexes not being used or statistics are stale

**Solution:**
```sql
-- Analyze table statistics
ANALYZE questions_bank;
ANALYZE exams;
ANALYZE exam_questions;

-- Reindex if necessary
REINDEX TABLE questions_bank;
REINDEX TABLE exams;
REINDEX TABLE exam_questions;
```

## Verification Checklist

After migration, verify:

- [ ] All 10 tables exist
- [ ] All columns have correct data types
- [ ] All indexes are created (40+)
- [ ] All foreign keys are established (20+)
- [ ] All unique constraints are in place
- [ ] Soft delete columns exist (deletedAt)
- [ ] Test data can be inserted
- [ ] Soft deletes work correctly
- [ ] Foreign key constraints are enforced
- [ ] Unique constraints are enforced
- [ ] Cascade deletes work correctly
- [ ] Query performance is acceptable
- [ ] Referential integrity is maintained
- [ ] No orphaned records exist

## Post-Migration Steps

1. **Update API Layer**
   - Ensure all API endpoints use the new schema
   - Update validation rules
   - Test all CRUD operations

2. **Update Frontend Components**
   - Verify components work with new schema
   - Test data fetching and display
   - Test form submissions

3. **Run Integration Tests**
   - Execute full test suite
   - Verify all tests pass
   - Check code coverage

4. **Monitor Performance**
   - Monitor query performance
   - Check for slow queries
   - Monitor database size growth

5. **Document Changes**
   - Update API documentation
   - Update database documentation
   - Update deployment guide

## Support

For migration issues or questions, please refer to:
- Database Schema Documentation: `docs/CBT_DATABASE_SCHEMA.md`
- API Documentation: `docs/API_DOCUMENTATION.md`
- Troubleshooting Guide: `docs/TROUBLESHOOTING.md`
