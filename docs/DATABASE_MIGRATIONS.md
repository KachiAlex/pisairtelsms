# CBT Dashboard Database Migrations Guide

## Overview

This guide documents the database migration process for the CBT (Computer-Based Testing) Dashboard. The system uses PostgreSQL with 8 interconnected tables to support exam management, question banking, live monitoring, results tracking, and security settings.

## Table of Contents

1. [Migration Architecture](#migration-architecture)
2. [Database Schema](#database-schema)
3. [Running Migrations](#running-migrations)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Procedures](#rollback-procedures)
7. [Performance Considerations](#performance-considerations)

## Migration Architecture

### Migration Files

The migration system uses numbered SQL files executed in order:

```
001_create_cbt_tables.sql    - Creates all 8 tables with constraints and indexes
```

### Migration Runner

The migration runner (`api/tenant/cbt/_lib/migration-runner.ts`) provides:

- **Automatic execution** of all pending migrations
- **Status checking** to verify if migrations have been applied
- **Error handling** with detailed logging
- **Idempotent operations** using `IF NOT EXISTS` clauses

### Key Features

- **Idempotent**: Safe to run multiple times
- **Ordered**: Migrations execute in numeric order
- **Validated**: Schema verification after execution
- **Logged**: Detailed execution logs for debugging
- **Reversible**: Rollback procedures available

## Database Schema

### 1. questions_bank Table

Stores all exam questions with support for multiple question types.

**Purpose**: Central repository for all exam questions

**Columns**:
- `id` (UUID) - Primary key
- `tenant_id` (UUID) - Multi-tenant support
- `text` (TEXT) - Question content
- `type` (VARCHAR) - Question type: 'objective', 'truefalse', 'essay'
- `options` (JSONB) - Answer options for objective/true-false questions
- `correct_answer` (VARCHAR) - Correct answer identifier
- `difficulty` (VARCHAR) - Difficulty level: 'Easy', 'Medium', 'Hard'
- `subject` (VARCHAR) - Subject area
- `tags` (JSONB) - Array of tags for categorization
- `created_by` (UUID) - User who created the question
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp
- `deleted_at` (TIMESTAMP) - Soft delete timestamp

**Constraints**:
- `type` must be one of: 'objective', 'truefalse', 'essay'
- `difficulty` must be one of: 'Easy', 'Medium', 'Hard'
- `options` required for objective/true-false, NULL for essay
- Soft delete support via `deleted_at`

**Indexes**:
- `idx_questions_tenant` - Tenant filtering
- `idx_questions_subject` - Subject-based queries
- `idx_questions_difficulty` - Difficulty filtering
- `idx_questions_type` - Question type filtering
- `idx_questions_deleted` - Soft delete queries

**Example**:
```sql
INSERT INTO questions_bank (
  tenant_id, text, type, options, correct_answer, 
  difficulty, subject, created_by
) VALUES (
  'tenant-123', 
  'What is 2 + 2?',
  'objective',
  '["3", "4", "5", "6"]'::jsonb,
  '4',
  'Easy',
  'Mathematics',
  'user-456'
);
```

### 2. exams Table

Stores exam configurations with status tracking.

**Purpose**: Exam metadata and scheduling

**Columns**:
- `id` (UUID) - Primary key
- `tenant_id` (UUID) - Multi-tenant support
- `title` (VARCHAR) - Exam title
- `subject` (VARCHAR) - Subject area
- `class` (VARCHAR) - Class/grade level
- `description` (TEXT) - Exam description
- `duration` (INTEGER) - Duration in minutes (15-480)
- `pass_mark` (DECIMAL) - Pass mark (0-100)
- `total_marks` (DECIMAL) - Total marks
- `status` (VARCHAR) - Status: 'Draft', 'Scheduled', 'Ongoing', 'Completed'
- `scheduled_date` (DATE) - Scheduled date
- `scheduled_time` (TIME) - Scheduled time
- `created_by` (UUID) - User who created the exam
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp
- `deleted_at` (TIMESTAMP) - Soft delete timestamp

**Constraints**:
- `duration` between 15 and 480 minutes
- `pass_mark` between 0 and 100
- `total_marks` > 0
- `total_marks` > `pass_mark`
- `status` one of: 'Draft', 'Scheduled', 'Ongoing', 'Completed'

**Indexes**:
- `idx_exams_tenant` - Tenant filtering
- `idx_exams_status` - Status filtering
- `idx_exams_scheduled_date` - Date-based queries
- `idx_exams_class` - Class filtering
- `idx_exams_deleted` - Soft delete queries

**Status Transitions**:
```
Draft → Scheduled → Ongoing → Completed
```

### 3. exam_questions Table

Junction table linking exams to questions with ordering and marks allocation.

**Purpose**: Define which questions belong to which exams

**Columns**:
- `id` (UUID) - Primary key
- `exam_id` (UUID) - Foreign key to exams
- `question_id` (UUID) - Foreign key to questions_bank
- `question_order` (INTEGER) - Order of question in exam
- `marks` (DECIMAL) - Marks for this question
- `created_at` (TIMESTAMP) - Creation timestamp

**Constraints**:
- `marks` > 0
- Unique combination of `exam_id` and `question_id`
- Cascade delete on exam deletion

**Indexes**:
- `idx_exam_questions_exam` - Query questions for an exam
- `idx_exam_questions_question` - Query exams containing a question

**Example**:
```sql
INSERT INTO exam_questions (exam_id, question_id, question_order, marks)
VALUES ('exam-123', 'question-456', 1, 5);
```

### 4. student_exam_progress Table

Tracks real-time student progress during exams.

**Purpose**: Live monitoring of student exam progress

**Columns**:
- `id` (UUID) - Primary key
- `exam_id` (UUID) - Foreign key to exams
- `student_id` (UUID) - Student identifier
- `questions_answered` (INTEGER) - Number of questions answered
- `current_question` (INTEGER) - Current question index
- `status` (VARCHAR) - Status: 'Active', 'Completed', 'Paused', 'Flagged'
- `time_remaining` (INTEGER) - Time remaining in seconds
- `last_activity_time` (TIMESTAMP) - Last activity timestamp
- `flag_reason` (VARCHAR) - Reason for flagging (if flagged)
- `flagged_at` (TIMESTAMP) - Timestamp when flagged
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Constraints**:
- `questions_answered` >= 0
- `current_question` >= 0
- `time_remaining` >= 0
- `status` one of: 'Active', 'Completed', 'Paused', 'Flagged'
- Unique combination of `exam_id` and `student_id`

**Indexes**:
- `idx_progress_exam` - Query students in an exam
- `idx_progress_student` - Query student's exams
- `idx_progress_status` - Filter by status
- `idx_progress_last_activity` - Recent activity queries

**Status Meanings**:
- `Active` - Student is currently taking the exam
- `Completed` - Student has submitted the exam
- `Paused` - Student has paused the exam
- `Flagged` - Student flagged for suspicious activity

### 5. exam_results Table

Stores final exam results and scores.

**Purpose**: Store completed exam results and analytics

**Columns**:
- `id` (UUID) - Primary key
- `exam_id` (UUID) - Foreign key to exams
- `student_id` (UUID) - Student identifier
- `score` (DECIMAL) - Student's score
- `total_marks` (DECIMAL) - Total marks for exam
- `percentage` (DECIMAL) - Percentage score (0-100)
- `status` (VARCHAR) - Status: 'Passed' or 'Failed'
- `time_spent` (INTEGER) - Time spent in seconds
- `submitted_at` (TIMESTAMP) - Submission timestamp
- `created_at` (TIMESTAMP) - Creation timestamp

**Constraints**:
- `score` >= 0
- `total_marks` > 0
- `percentage` between 0 and 100
- `status` one of: 'Passed', 'Failed'
- `time_spent` >= 0
- Unique combination of `exam_id` and `student_id`

**Indexes**:
- `idx_results_exam` - Query results for an exam
- `idx_results_student` - Query student's results
- `idx_results_status` - Filter by pass/fail status
- `idx_results_submitted` - Date-based queries

**Pass/Fail Logic**:
```
IF score >= pass_mark THEN status = 'Passed'
ELSE status = 'Failed'
```

### 6. student_answers Table

Stores detailed answer data for each student.

**Purpose**: Store individual student answers for detailed analysis

**Columns**:
- `id` (UUID) - Primary key
- `result_id` (UUID) - Foreign key to exam_results
- `question_id` (UUID) - Foreign key to questions_bank
- `student_answer` (TEXT) - Student's answer
- `correct_answer` (VARCHAR) - Correct answer
- `is_correct` (BOOLEAN) - Whether answer is correct
- `marks_obtained` (DECIMAL) - Marks obtained for this question
- `total_marks` (DECIMAL) - Total marks for this question
- `created_at` (TIMESTAMP) - Creation timestamp

**Constraints**:
- `marks_obtained` >= 0
- `total_marks` > 0
- Cascade delete on result deletion

**Indexes**:
- `idx_answers_result` - Query answers for a result
- `idx_answers_question` - Query answers for a question

**Example**:
```sql
INSERT INTO student_answers (
  result_id, question_id, student_answer, correct_answer,
  is_correct, marks_obtained, total_marks
) VALUES (
  'result-123', 'question-456', '4', '4',
  true, 5, 5
);
```

### 7. security_settings Table

Stores security configuration per exam.

**Purpose**: Configure exam security and proctoring settings

**Columns**:
- `id` (UUID) - Primary key
- `exam_id` (UUID) - Foreign key to exams (unique)
- `enable_proctoring` (BOOLEAN) - Enable camera proctoring
- `disable_copy_paste` (BOOLEAN) - Disable copy/paste
- `disable_right_click` (BOOLEAN) - Disable right-click menu
- `require_camera` (BOOLEAN) - Require camera access
- `randomize_questions` (BOOLEAN) - Randomize question order
- `randomize_options` (BOOLEAN) - Randomize answer options
- `allowed_ips` (JSONB) - Array of allowed IP addresses/CIDR ranges
- `exam_password` (VARCHAR) - Optional exam password (hashed)
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Constraints**:
- One-to-one relationship with exams (unique exam_id)
- Cascade delete on exam deletion

**Indexes**:
- `idx_security_exam` - Query settings for an exam

**Example**:
```sql
INSERT INTO security_settings (
  exam_id, enable_proctoring, require_camera,
  randomize_questions, allowed_ips
) VALUES (
  'exam-123', true, true, true,
  '["192.168.1.0/24", "10.0.0.0/8"]'::jsonb
);
```

### 8. proctoring_logs Table

Logs all proctoring events.

**Purpose**: Audit trail for security and compliance

**Columns**:
- `id` (UUID) - Primary key
- `exam_id` (UUID) - Foreign key to exams
- `student_id` (UUID) - Student identifier
- `event_type` (VARCHAR) - Type of event
- `event_details` (JSONB) - Event-specific details
- `created_at` (TIMESTAMP) - Event timestamp

**Constraints**:
- Cascade delete on exam deletion

**Indexes**:
- `idx_proctoring_exam` - Query logs for an exam
- `idx_proctoring_student` - Query logs for a student
- `idx_proctoring_timestamp` - Time-based queries
- `idx_proctoring_event_type` - Event type filtering

**Event Types**:
- `camera_on` - Camera activated
- `camera_off` - Camera deactivated
- `tab_switch` - Student switched tabs
- `copy_attempt` - Copy operation attempted
- `right_click` - Right-click attempted
- `suspicious_activity` - Suspicious activity detected

**Example**:
```sql
INSERT INTO proctoring_logs (
  exam_id, student_id, event_type, event_details
) VALUES (
  'exam-123', 'student-456', 'tab_switch',
  '{"from_tab": "exam", "to_tab": "other", "timestamp": "2024-01-15T10:30:00Z"}'::jsonb
);
```

## Running Migrations

### Method 1: Automatic Initialization (Recommended)

The system automatically runs migrations on first use:

```bash
# Call the initialization endpoint
curl -X POST http://localhost:3000/api/tenant/cbt/init-db \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Method 2: Manual Migration via API

```typescript
import { runMigrations } from 'api/tenant/cbt/_lib/migration-runner'

const results = await runMigrations()
console.log('Migration results:', results)
```

### Method 3: Direct SQL Execution

```bash
# Using psql
psql -h localhost -U postgres -d school_management \
  -f api/tenant/cbt/_lib/migrations/001_create_cbt_tables.sql

# Using environment variables
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f api/tenant/cbt/_lib/migrations/001_create_cbt_tables.sql
```

### Method 4: Using Migration Scripts

```bash
# Linux/Mac
bash api/tenant/cbt/_lib/migrations/run-migration.sh

# Windows
cmd /c api/tenant/cbt/_lib/migrations/run-migration.bat

# Node.js
node api/tenant/cbt/_lib/migrations/run-migration.js
```

### Environment Variables

Configure these variables before running migrations:

```bash
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_management
DB_USER=postgres
DB_PASSWORD=postgres

# Optional: Vercel Postgres
POSTGRES_URL=postgresql://user:password@host:port/database
```

## Verification

### Verify Schema Creation

```bash
# Connect to database
psql -h localhost -U postgres -d school_management

# List all tables
\dt

# Expected output:
# questions_bank
# exams
# exam_questions
# student_exam_progress
# exam_results
# student_answers
# security_settings
# proctoring_logs
```

### Verify Indexes

```sql
-- Check all indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;

-- Expected indexes:
-- idx_questions_tenant
-- idx_questions_subject
-- idx_questions_difficulty
-- idx_questions_type
-- idx_questions_deleted
-- idx_exams_tenant
-- idx_exams_status
-- idx_exams_scheduled_date
-- idx_exams_class
-- idx_exams_deleted
-- idx_exam_questions_exam
-- idx_exam_questions_question
-- idx_progress_exam
-- idx_progress_student
-- idx_progress_status
-- idx_progress_last_activity
-- idx_results_exam
-- idx_results_student
-- idx_results_status
-- idx_results_submitted
-- idx_answers_result
-- idx_answers_question
-- idx_security_exam
-- idx_proctoring_exam
-- idx_proctoring_student
-- idx_proctoring_timestamp
-- idx_proctoring_event_type
```

### Verify Constraints

```sql
-- Check table constraints
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name, constraint_name;
```

### Run Property-Based Tests

```bash
# Run schema verification tests
npm run test -- api/tenant/cbt/_lib/migrations/schema.test.ts

# Expected: All tests pass
```

## Troubleshooting

### Issue: "Table already exists"

**Cause**: Migration has already been executed

**Solution**: This is normal. The migration uses `IF NOT EXISTS` to prevent errors.

```bash
# Verify tables exist
psql -h localhost -U postgres -d school_management -c "\dt"
```

### Issue: "Permission denied" error

**Cause**: User doesn't have necessary permissions

**Solution**: Grant permissions to the database user

```sql
-- Connect as superuser
psql -h localhost -U postgres -d school_management

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE school_management TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

### Issue: "Connection refused"

**Cause**: PostgreSQL not running or connection parameters incorrect

**Solution**: Verify PostgreSQL is running and connection parameters

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d postgres -c "SELECT 1"

# Verify environment variables
echo $DB_HOST
echo $DB_PORT
echo $DB_NAME
echo $DB_USER
```

### Issue: "Foreign key constraint failed"

**Cause**: Attempting to insert data before all tables are created

**Solution**: Ensure all migrations have completed

```sql
-- Check if all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Issue: "Index creation failed"

**Cause**: Index already exists or column doesn't exist

**Solution**: Check if index exists and verify column names

```sql
-- Check existing indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'questions_bank';

-- Check table columns
\d questions_bank
```

## Rollback Procedures

### Development Environment

For development, you can drop and recreate tables:

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS proctoring_logs CASCADE;
DROP TABLE IF EXISTS security_settings CASCADE;
DROP TABLE IF EXISTS student_answers CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS student_exam_progress CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS questions_bank CASCADE;

-- Then re-run migrations
```

### Production Environment

For production, use soft deletes and data archiving:

```sql
-- Archive old data
CREATE TABLE questions_bank_archive AS 
SELECT * FROM questions_bank WHERE deleted_at IS NOT NULL;

-- Delete archived data
DELETE FROM questions_bank WHERE deleted_at IS NOT NULL;

-- Verify data integrity
SELECT COUNT(*) FROM questions_bank;
SELECT COUNT(*) FROM questions_bank_archive;
```

### Partial Rollback

To rollback specific changes:

```sql
-- Disable a security setting
UPDATE security_settings 
SET enable_proctoring = false 
WHERE exam_id = 'exam-123';

-- Restore a soft-deleted question
UPDATE questions_bank 
SET deleted_at = NULL 
WHERE id = 'question-456';
```

## Performance Considerations

### Index Strategy

All foreign key columns and frequently queried columns are indexed:

- **Tenant filtering**: `idx_questions_tenant`, `idx_exams_tenant`
- **Status filtering**: `idx_exams_status`, `idx_progress_status`, `idx_results_status`
- **Date-based queries**: `idx_exams_scheduled_date`, `idx_results_submitted`
- **Soft delete queries**: `idx_questions_deleted`, `idx_exams_deleted`

### Query Optimization

```sql
-- Good: Uses index
SELECT * FROM questions_bank 
WHERE tenant_id = 'tenant-123' AND deleted_at IS NULL;

-- Good: Uses index
SELECT * FROM exams 
WHERE status = 'Scheduled' AND scheduled_date > NOW();

-- Good: Uses index
SELECT * FROM exam_results 
WHERE exam_id = 'exam-123' AND status = 'Passed';
```

### Maintenance

```sql
-- Analyze table statistics (improves query planning)
ANALYZE questions_bank;
ANALYZE exams;
ANALYZE exam_results;

-- Reindex if performance degrades
REINDEX TABLE questions_bank;
REINDEX TABLE exams;
REINDEX TABLE exam_results;

-- Vacuum to reclaim space
VACUUM ANALYZE questions_bank;
VACUUM ANALYZE exams;
VACUUM ANALYZE exam_results;
```

### Scaling Considerations

For large datasets:

1. **Partitioning**: Partition `exam_results` and `student_answers` by date
2. **Archiving**: Archive old results to separate tables
3. **Caching**: Cache frequently accessed questions and statistics
4. **Read Replicas**: Use read replicas for reporting queries

## Data Retention Policy

- **Questions**: Soft delete (retained for audit trail)
- **Exams**: Soft delete (retained for audit trail)
- **Results**: Permanent (required for compliance)
- **Answers**: Permanent (required for compliance)
- **Proctoring Logs**: Permanent (required for compliance)

## Next Steps

After successful migration:

1. ✅ Verify schema with provided SQL queries
2. ✅ Run property-based tests
3. ✅ Populate initial data (questions, exams)
4. ✅ Test API endpoints
5. ✅ Deploy to production

## Support

For migration issues:

1. Check logs: `api/tenant/cbt/_lib/migrations/README.md`
2. Review schema: `api/tenant/cbt/_lib/migrations/001_create_cbt_tables.sql`
3. Run tests: `npm run test -- api/tenant/cbt/_lib/migrations/schema.test.ts`
4. Contact: Development team

</content>
