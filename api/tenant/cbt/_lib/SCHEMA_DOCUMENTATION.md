# CBT & Examinations Database Schema Documentation

## Overview

This document describes the complete database schema for the CBT (Computer-Based Testing) & Examinations system. The schema consists of 10 tables designed to support exam management, question banking, real-time progress tracking, result calculation, security settings, and comprehensive audit logging.

## Table Definitions

### 1. questions_bank

**Purpose:** Repository of exam questions with metadata

**Columns:**
- `id` (UUID, PK): Unique question identifier
- `tenant_id` (UUID, FK): Reference to tenant organization
- `text` (TEXT): Question content
- `type` (VARCHAR): Question type - 'objective', 'truefalse', or 'essay'
- `options` (JSONB): Array of answer options for objective/truefalse questions
- `correct_answer` (VARCHAR): Correct answer identifier
- `difficulty` (VARCHAR): Difficulty level - 'Easy', 'Medium', or 'Hard'
- `subject` (VARCHAR): Subject/topic of the question
- `tags` (JSONB): Array of tags for categorization
- `created_by` (UUID, FK): User who created the question
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP): Soft delete timestamp

**Indexes:**
- `idx_questions_tenant`: For filtering by tenant
- `idx_questions_subject`: For filtering by subject
- `idx_questions_difficulty`: For filtering by difficulty
- `idx_questions_type`: For filtering by question type
- `idx_questions_deleted`: For soft delete queries

**Constraints:**
- `type` must be one of: 'objective', 'truefalse', 'essay'
- `difficulty` must be one of: 'Easy', 'Medium', 'Hard'

---

### 2. exams

**Purpose:** Exam definitions with scheduling and status tracking

**Columns:**
- `id` (UUID, PK): Unique exam identifier
- `tenant_id` (UUID, FK): Reference to tenant organization
- `title` (VARCHAR): Exam title
- `subject` (VARCHAR): Subject/topic
- `class` (VARCHAR): Class/grade level
- `description` (TEXT): Exam description
- `duration` (INTEGER): Exam duration in minutes (15-480)
- `pass_mark` (DECIMAL): Passing score threshold
- `total_marks` (DECIMAL): Total marks for the exam
- `status` (VARCHAR): Exam status - 'Draft', 'Scheduled', 'Ongoing', 'Completed'
- `scheduled_date` (DATE): Scheduled exam date
- `scheduled_time` (TIME): Scheduled exam time
- `created_by` (UUID, FK): User who created the exam
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `deleted_at` (TIMESTAMP): Soft delete timestamp

**Indexes:**
- `idx_exams_tenant`: For filtering by tenant
- `idx_exams_status`: For filtering by status
- `idx_exams_class`: For filtering by class
- `idx_exams_subject`: For filtering by subject
- `idx_exams_scheduled_date`: For filtering by scheduled date
- `idx_exams_deleted`: For soft delete queries

**Constraints:**
- `duration` must be between 15 and 480 minutes
- `pass_mark` must be between 0 and 100
- `total_marks` must be greater than 0
- `pass_mark` must be less than or equal to `total_marks`
- `status` must be one of: 'Draft', 'Scheduled', 'Ongoing', 'Completed'
- `scheduled_date` must be in the future or NULL

---

### 3. exam_questions

**Purpose:** Junction table linking exams to questions with ordering

**Columns:**
- `id` (UUID, PK): Unique record identifier
- `exam_id` (UUID, FK): Reference to exam
- `question_id` (UUID, FK): Reference to question
- `question_order` (INTEGER): Order of question in exam
- `marks` (DECIMAL): Marks allocated for this question
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_exam_questions_exam`: For retrieving questions for an exam
- `idx_exam_questions_question`: For finding exams containing a question

**Constraints:**
- `marks` must be greater than 0
- Unique constraint on (exam_id, question_id) to prevent duplicates

---

### 4. student_exam_progress

**Purpose:** Real-time tracking of student progress during exams

**Columns:**
- `id` (UUID, PK): Unique record identifier
- `exam_id` (UUID, FK): Reference to exam
- `student_id` (UUID, FK): Reference to student user
- `questions_answered` (INTEGER): Number of questions answered
- `current_question` (INTEGER): Current question index
- `status` (VARCHAR): Progress status - 'Active', 'Completed', 'Paused', 'Flagged'
- `time_remaining` (INTEGER): Time remaining in seconds
- `last_activity_time` (TIMESTAMP): Last activity timestamp
- `flag_reason` (VARCHAR): Reason for flagging (if flagged)
- `flagged_at` (TIMESTAMP): Timestamp when flagged
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**
- `idx_progress_exam`: For retrieving progress for an exam
- `idx_progress_student`: For retrieving progress for a student
- `idx_progress_status`: For filtering by status
- `idx_progress_exam_status`: For combined exam and status queries

**Constraints:**
- `status` must be one of: 'Active', 'Completed', 'Paused', 'Flagged'
- Unique constraint on (exam_id, student_id) to prevent duplicates

---

### 5. exam_results

**Purpose:** Final exam results and scores

**Columns:**
- `id` (UUID, PK): Unique result identifier
- `exam_id` (UUID, FK): Reference to exam
- `student_id` (UUID, FK): Reference to student user
- `score` (DECIMAL): Final score obtained
- `total_marks` (DECIMAL): Total marks for the exam
- `percentage` (DECIMAL): Score percentage (0-100)
- `status` (VARCHAR): Result status - 'Pending', 'Passed', 'Failed'
- `time_spent` (INTEGER): Time spent on exam in seconds
- `submitted_at` (TIMESTAMP): Submission timestamp
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_results_exam`: For retrieving results for an exam
- `idx_results_student`: For retrieving results for a student
- `idx_results_status`: For filtering by status
- `idx_results_exam_status`: For combined exam and status queries
- `idx_results_submitted`: For filtering by submission date

**Constraints:**
- `score` must be >= 0
- `total_marks` must be > 0
- `percentage` must be between 0 and 100
- `status` must be one of: 'Pending', 'Passed', 'Failed'
- Unique constraint on (exam_id, student_id) to prevent duplicates

---

### 6. student_answers

**Purpose:** Individual student answers with correctness tracking

**Columns:**
- `id` (UUID, PK): Unique answer identifier
- `result_id` (UUID, FK): Reference to exam result
- `question_id` (UUID, FK): Reference to question
- `student_answer` (TEXT): Student's answer
- `correct_answer` (VARCHAR): Correct answer
- `is_correct` (BOOLEAN): Whether answer is correct
- `marks_obtained` (DECIMAL): Marks awarded for this answer
- `total_marks` (DECIMAL): Total marks for this question
- `created_at` (TIMESTAMP): Creation timestamp

**Indexes:**
- `idx_answers_result`: For retrieving answers for a result
- `idx_answers_question`: For analyzing question performance
- `idx_answers_correct`: For filtering by correctness

**Constraints:**
- `marks_obtained` must be >= 0
- `total_marks` must be > 0

---

### 7. security_settings

**Purpose:** Security configuration per exam

**Columns:**
- `id` (UUID, PK): Unique settings identifier
- `exam_id` (UUID, FK, UNIQUE): Reference to exam
- `enable_proctoring` (BOOLEAN): Enable camera proctoring
- `disable_copy_paste` (BOOLEAN): Disable copy/paste
- `disable_right_click` (BOOLEAN): Disable right-click context menu
- `require_camera` (BOOLEAN): Require camera access
- `randomize_questions` (BOOLEAN): Randomize question order
- `randomize_options` (BOOLEAN): Randomize answer options
- `allowed_ips` (JSONB): Array of allowed IP addresses/CIDR ranges
- `exam_password` (VARCHAR): Optional exam password
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**
- `idx_security_exam`: For retrieving settings for an exam

---

### 8. proctoring_logs

**Purpose:** Comprehensive logging of proctoring events

**Columns:**
- `id` (UUID, PK): Unique log entry identifier
- `exam_id` (UUID, FK): Reference to exam
- `student_id` (UUID, FK): Reference to student
- `event_type` (VARCHAR): Type of event - 'tab_switch', 'copy_attempt', 'right_click', 'camera_off', 'suspicious_activity', 'manual_flag', 'other'
- `event_details` (JSONB): Additional event details
- `created_at` (TIMESTAMP): Event timestamp

**Indexes:**
- `idx_proctoring_exam`: For retrieving events for an exam
- `idx_proctoring_student`: For retrieving events for a student
- `idx_proctoring_event_type`: For filtering by event type
- `idx_proctoring_created`: For time-based queries

**Constraints:**
- `event_type` must be one of the defined types

---

### 9. audit_logs

**Purpose:** Comprehensive audit trail for compliance

**Columns:**
- `id` (UUID, PK): Unique log entry identifier
- `tenant_id` (UUID, FK): Reference to tenant
- `user_id` (UUID, FK): Reference to user performing action
- `action` (VARCHAR): Action performed - 'create', 'update', 'delete', 'read', 'export', 'import', 'start_exam', 'pause_exam', 'resume_exam', 'complete_exam', 'flag_student', 'approve_results', 'sync_offline'
- `entity_type` (VARCHAR): Type of entity - 'question', 'exam', 'exam_result', 'security_settings', 'student_answer'
- `entity_id` (UUID): ID of affected entity
- `changes` (JSONB): Before/after values for updates
- `created_at` (TIMESTAMP): Action timestamp

**Indexes:**
- `idx_audit_tenant`: For retrieving logs for a tenant
- `idx_audit_user`: For retrieving logs for a user
- `idx_audit_action`: For filtering by action type
- `idx_audit_entity`: For retrieving logs for an entity
- `idx_audit_created`: For time-based queries

**Constraints:**
- `action` must be one of the defined actions
- `entity_type` must be one of the defined types

---

### 10. offline_sync_queue

**Purpose:** Queue for offline data synchronization

**Columns:**
- `id` (UUID, PK): Unique queue entry identifier
- `student_id` (UUID, FK): Reference to student
- `exam_id` (UUID, FK): Reference to exam
- `answers` (JSONB): Array of student answers to sync
- `sync_status` (VARCHAR): Sync status - 'pending', 'synced', 'failed'
- `retry_count` (INTEGER): Number of sync retry attempts
- `last_error` (TEXT): Last error message if sync failed
- `created_at` (TIMESTAMP): Entry creation timestamp
- `synced_at` (TIMESTAMP): Successful sync timestamp

**Indexes:**
- `idx_sync_student`: For retrieving queue entries for a student
- `idx_sync_exam`: For retrieving queue entries for an exam
- `idx_sync_status`: For filtering by sync status
- `idx_sync_created`: For time-based queries

**Constraints:**
- `sync_status` must be one of: 'pending', 'synced', 'failed'

---

## Relationships

```
questions_bank
  ├── exam_questions (1:N)
  │   └── exams (N:1)
  │       ├── exam_questions (1:N)
  │       ├── student_exam_progress (1:N)
  │       ├── exam_results (1:N)
  │       │   └── student_answers (1:N)
  │       ├── security_settings (1:1)
  │       ├── proctoring_logs (1:N)
  │       └── offline_sync_queue (1:N)
  │
  └── student_answers (1:N)

users (students)
  ├── student_exam_progress (1:N)
  ├── exam_results (1:N)
  ├── proctoring_logs (1:N)
  ├── offline_sync_queue (1:N)
  └── audit_logs (1:N)

tenants
  ├── questions_bank (1:N)
  ├── exams (1:N)
  ├── audit_logs (1:N)
  └── security_settings (1:N)
```

## Performance Considerations

1. **Indexing Strategy:**
   - Foreign keys are indexed for join performance
   - Status columns are indexed for filtering
   - Tenant ID is indexed for multi-tenant queries
   - Soft delete columns are indexed to exclude deleted records

2. **Query Optimization:**
   - Use indexes for WHERE clauses
   - Combine indexes for common filter combinations
   - Consider materialized views for complex aggregations

3. **Partitioning:**
   - Consider partitioning large tables by tenant_id or date
   - Partition exam_results and student_answers by exam_id for large datasets

## Backup and Recovery

- Regular backups recommended (daily minimum)
- Test restore procedures regularly
- Maintain transaction logs for point-in-time recovery
- Archive old audit logs periodically

## Migration Notes

- All migrations are reversible
- Schema version tracking in `schema_migrations` table
- Run migrations before deploying application code
- Test migrations in staging environment first
