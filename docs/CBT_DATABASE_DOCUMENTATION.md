# CBT & Examinations Database Documentation

## Overview

This document provides comprehensive documentation for the CBT (Computer-Based Testing) & Examinations system database schema. The database is built on PostgreSQL and supports multi-tenant architecture with 10 core tables managing questions, exams, student progress, results, security, and audit logging.

## Database Architecture

### Multi-Tenant Design
- All tables include `tenant_id` foreign key for tenant isolation
- Soft deletes supported via `deleted_at` timestamp columns
- Comprehensive audit logging for compliance and debugging
- Real-time progress tracking for live monitoring

### Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CBT Database Schema                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  questions_bank ──┐                                              │
│                   ├──> exam_questions ──> exams                  │
│                   │                         │                    │
│                   │                         ├──> security_settings
│                   │                         │                    │
│                   │                         ├──> student_exam_progress
│                   │                         │                    │
│                   │                         └──> exam_results    │
│                   │                              │                │
│                   └──────────────────────────────┤                │
│                                                  ├──> student_answers
│                                                  │                │
│  proctoring_logs ◄─────────────────────────────┘                │
│                                                                   │
│  audit_logs (tracks all CRUD operations)                         │
│  offline_sync_queue (offline data synchronization)               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Table Definitions

### 1. questions_bank

**Purpose**: Stores all questions in the question bank for reuse across exams.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique question identifier |
| tenant_id | UUID | NOT NULL, FK(tenants) | Multi-tenant isolation |
| text | TEXT | NOT NULL | Question text/content |
| type | VARCHAR(20) | NOT NULL, CHECK | Question type: 'objective', 'truefalse', 'essay' |
| options | JSONB | NULL | Question options (for objective/truefalse) |
| correct_answer | VARCHAR(255) | NULL | Correct answer reference |
| difficulty | VARCHAR(10) | NOT NULL, CHECK | Difficulty level: 'Easy', 'Medium', 'Hard' |
| subject | VARCHAR(100) | NOT NULL | Subject/topic area |
| tags | JSONB | DEFAULT '[]' | Question tags for categorization |
| created_by | UUID | NOT NULL, FK(users) | User who created the question |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes**:
- `idx_questions_tenant` on `tenant_id` - Multi-tenant filtering
- `idx_questions_subject` on `subject` - Subject-based filtering
- `idx_questions_difficulty` on `difficulty` - Difficulty filtering
- `idx_questions_type` on `type` - Question type filtering
- `idx_questions_deleted` on `deleted_at` - Soft delete filtering

**Constraints**:
- CHECK: type IN ('objective', 'truefalse', 'essay')
- CHECK: difficulty IN ('Easy', 'Medium', 'Hard')
- FOREIGN KEY: tenant_id → tenants(id) ON DELETE CASCADE
- FOREIGN KEY: created_by → users(id)

**Performance Notes**:
- Composite index recommended: (tenant_id, subject, difficulty) for common queries
- JSONB options column supports flexible question formats
- Soft deletes preserve historical data for audit trails

---

### 2. exams

**Purpose**: Stores exam metadata, scheduling, and status information.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique exam identifier |
| tenant_id | UUID | NOT NULL, FK(tenants) | Multi-tenant isolation |
| title | VARCHAR(255) | NOT NULL | Exam title |
| subject | VARCHAR(100) | NOT NULL | Subject area |
| class | VARCHAR(50) | NOT NULL | Class/grade level |
| description | TEXT | NULL | Exam description |
| duration | INTEGER | NOT NULL, CHECK | Exam duration in minutes (15-480) |
| pass_mark | DECIMAL(5,2) | NOT NULL, CHECK | Passing score threshold |
| total_marks | DECIMAL(5,2) | NOT NULL, CHECK | Total marks for exam |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'Draft' | Status: Draft, Scheduled, Ongoing, Completed |
| scheduled_date | DATE | NULL | Scheduled exam date |
| scheduled_time | TIME | NULL | Scheduled exam time |
| created_by | UUID | NOT NULL, FK(users) | User who created exam |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes**:
- `idx_exams_tenant` on `tenant_id` - Multi-tenant filtering
- `idx_exams_status` on `status` - Status-based filtering
- `idx_exams_class` on `class` - Class-based filtering
- `idx_exams_subject` on `subject` - Subject-based filtering
- `idx_exams_scheduled_date` on `scheduled_date` - Date-based filtering
- `idx_exams_deleted` on `deleted_at` - Soft delete filtering

**Constraints**:
- CHECK: duration >= 15 AND duration <= 480
- CHECK: pass_mark >= 0 AND pass_mark <= 100
- CHECK: total_marks > 0
- CHECK: pass_mark <= total_marks
- CHECK: status IN ('Draft', 'Scheduled', 'Ongoing', 'Completed')
- CHECK: scheduled_date IS NULL OR scheduled_date >= CURRENT_DATE
- FOREIGN KEY: tenant_id → tenants(id) ON DELETE CASCADE
- FOREIGN KEY: created_by → users(id)

**Performance Notes**:
- Composite index recommended: (tenant_id, status, scheduled_date) for common queries
- Status transitions: Draft → Scheduled → Ongoing → Completed
- Soft deletes preserve exam history for reporting

---

### 3. exam_questions

**Purpose**: Junction table linking exams to questions with ordering and marks allocation.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique record identifier |
| exam_id | UUID | NOT NULL, FK(exams) | Reference to exam |
| question_id | UUID | NOT NULL, FK(questions_bank) | Reference to question |
| question_order | INTEGER | NOT NULL | Question sequence in exam |
| marks | DECIMAL(5,2) | NOT NULL, CHECK | Marks allocated to question |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes**:
- `idx_exam_questions_exam` on `exam_id` - Exam-based filtering
- `idx_exam_questions_question` on `question_id` - Question-based filtering
- UNIQUE(exam_id, question_id) - Prevent duplicate question assignments

**Constraints**:
- CHECK: marks > 0
- FOREIGN KEY: exam_id → exams(id) ON DELETE CASCADE
- FOREIGN KEY: question_id → questions_bank(id) ON DELETE CASCADE
- UNIQUE: (exam_id, question_id)

**Performance Notes**:
- Composite index recommended: (exam_id, question_order) for ordered retrieval
- Supports flexible marks allocation per question
- Cascading deletes ensure referential integrity

---

### 4. student_exam_progress

**Purpose**: Tracks real-time student progress during exam taking.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique record identifier |
| exam_id | UUID | NOT NULL, FK(exams) | Reference to exam |
| student_id | UUID | NOT NULL, FK(users) | Reference to student |
| questions_answered | INTEGER | DEFAULT 0 | Number of questions answered |
| current_question | INTEGER | DEFAULT 0 | Current question index |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'Active' | Status: Active, Completed, Paused, Flagged |
| time_remaining | INTEGER | NULL | Seconds remaining in exam |
| last_activity_time | TIMESTAMP | DEFAULT NOW() | Last activity timestamp |
| flag_reason | VARCHAR(255) | NULL | Reason for flagging student |
| flagged_at | TIMESTAMP | NULL | When student was flagged |
| created_at | TIMESTAMP | DEFAULT NOW() | Progress start timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_progress_exam` on `exam_id` - Exam-based filtering
- `idx_progress_student` on `student_id` - Student-based filtering
- `idx_progress_status` on `status` - Status-based filtering
- `idx_progress_exam_status` on `(exam_id, status)` - Composite for live monitoring
- UNIQUE(exam_id, student_id) - One progress record per student per exam

**Constraints**:
- CHECK: status IN ('Active', 'Completed', 'Paused', 'Flagged')
- FOREIGN KEY: exam_id → exams(id) ON DELETE CASCADE
- FOREIGN KEY: student_id → users(id) ON DELETE CASCADE
- UNIQUE: (exam_id, student_id)

**Performance Notes**:
- Frequently updated during exam - consider partitioning by exam_id
- Composite index (exam_id, status) critical for live monitoring queries
- Real-time updates require efficient indexing

---

### 5. exam_results

**Purpose**: Stores final exam results and scores for each student.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique result identifier |
| exam_id | UUID | NOT NULL, FK(exams) | Reference to exam |
| student_id | UUID | NOT NULL, FK(users) | Reference to student |
| score | DECIMAL(5,2) | NOT NULL, CHECK | Total score obtained |
| total_marks | DECIMAL(5,2) | NOT NULL, CHECK | Total marks for exam |
| percentage | DECIMAL(5,2) | NOT NULL, CHECK | Score percentage (0-100) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'Pending' | Status: Pending, Passed, Failed |
| time_spent | INTEGER | NOT NULL | Total time spent in seconds |
| submitted_at | TIMESTAMP | DEFAULT NOW() | Submission timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Result creation timestamp |

**Indexes**:
- `idx_results_exam` on `exam_id` - Exam-based filtering
- `idx_results_student` on `student_id` - Student-based filtering
- `idx_results_status` on `status` - Status-based filtering
- `idx_results_exam_status` on `(exam_id, status)` - Composite for analytics
- `idx_results_submitted` on `submitted_at` - Date-based filtering
- UNIQUE(exam_id, student_id) - One result per student per exam

**Constraints**:
- CHECK: score >= 0
- CHECK: total_marks > 0
- CHECK: percentage >= 0 AND percentage <= 100
- CHECK: status IN ('Pending', 'Passed', 'Failed')
- FOREIGN KEY: exam_id → exams(id) ON DELETE CASCADE
- FOREIGN KEY: student_id → users(id) ON DELETE CASCADE
- UNIQUE: (exam_id, student_id)

**Performance Notes**:
- Composite index (exam_id, status) critical for analytics queries
- Percentage calculated from score/total_marks
- Status determined by: score >= pass_mark ? 'Passed' : 'Failed'

---

### 6. student_answers

**Purpose**: Stores detailed answer tracking for each question answered by each student.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique answer record identifier |
| result_id | UUID | NOT NULL, FK(exam_results) | Reference to exam result |
| question_id | UUID | NOT NULL, FK(questions_bank) | Reference to question |
| student_answer | TEXT | NULL | Student's answer |
| correct_answer | VARCHAR(255) | NULL | Correct answer |
| is_correct | BOOLEAN | NOT NULL | Whether answer is correct |
| marks_obtained | DECIMAL(5,2) | NOT NULL, CHECK | Marks awarded |
| total_marks | DECIMAL(5,2) | NOT NULL, CHECK | Total marks for question |
| created_at | TIMESTAMP | DEFAULT NOW() | Answer timestamp |

**Indexes**:
- `idx_answers_result` on `result_id` - Result-based filtering
- `idx_answers_question` on `question_id` - Question-based filtering
- `idx_answers_correct` on `is_correct` - Correctness filtering

**Constraints**:
- CHECK: marks_obtained >= 0
- CHECK: total_marks > 0
- FOREIGN KEY: result_id → exam_results(id) ON DELETE CASCADE
- FOREIGN KEY: question_id → questions_bank(id)

**Performance Notes**:
- Composite index recommended: (result_id, question_id) for detailed result queries
- Supports detailed answer review and analytics
- Cascading delete ensures data consistency

---

### 7. security_settings

**Purpose**: Stores security configuration for each exam (proctoring, copy prevention, etc.).

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique settings identifier |
| exam_id | UUID | NOT NULL, UNIQUE, FK(exams) | Reference to exam (one-to-one) |
| enable_proctoring | BOOLEAN | DEFAULT false | Enable proctoring |
| disable_copy_paste | BOOLEAN | DEFAULT false | Disable copy/paste |
| disable_right_click | BOOLEAN | DEFAULT false | Disable right-click |
| require_camera | BOOLEAN | DEFAULT false | Require camera access |
| randomize_questions | BOOLEAN | DEFAULT false | Randomize question order |
| randomize_options | BOOLEAN | DEFAULT false | Randomize answer options |
| allowed_ips | JSONB | DEFAULT '[]' | Allowed IP addresses (CIDR) |
| exam_password | VARCHAR(255) | NULL | Optional exam password |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_security_exam` on `exam_id` - Exam-based lookup

**Constraints**:
- UNIQUE: exam_id (one-to-one relationship)
- FOREIGN KEY: exam_id → exams(id) ON DELETE CASCADE

**Performance Notes**:
- One-to-one relationship with exams table
- JSONB allowed_ips supports flexible IP list management
- Settings applied at exam start time

---

### 8. proctoring_logs

**Purpose**: Logs security events and suspicious activities during exams.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique log entry identifier |
| exam_id | UUID | NOT NULL, FK(exams) | Reference to exam |
| student_id | UUID | NOT NULL, FK(users) | Reference to student |
| event_type | VARCHAR(50) | NOT NULL, CHECK | Event type (see constraints) |
| event_details | JSONB | NULL | Additional event details |
| created_at | TIMESTAMP | DEFAULT NOW() | Event timestamp |

**Indexes**:
- `idx_proctoring_exam` on `exam_id` - Exam-based filtering
- `idx_proctoring_student` on `student_id` - Student-based filtering
- `idx_proctoring_event_type` on `event_type` - Event type filtering
- `idx_proctoring_created` on `created_at` - Time-based filtering

**Constraints**:
- CHECK: event_type IN ('tab_switch', 'copy_attempt', 'right_click', 'camera_off', 'suspicious_activity', 'manual_flag', 'other')
- FOREIGN KEY: exam_id → exams(id) ON DELETE CASCADE
- FOREIGN KEY: student_id → users(id) ON DELETE CASCADE

**Performance Notes**:
- High-volume table - consider partitioning by exam_id or date
- Composite index recommended: (exam_id, created_at) for time-range queries
- JSONB event_details supports flexible event information

---

### 9. audit_logs

**Purpose**: Comprehensive audit trail of all CRUD operations for compliance and debugging.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique audit entry identifier |
| tenant_id | UUID | NOT NULL, FK(tenants) | Multi-tenant isolation |
| user_id | UUID | NOT NULL, FK(users) | User performing action |
| action | VARCHAR(100) | NOT NULL, CHECK | Action type (see constraints) |
| entity_type | VARCHAR(50) | NOT NULL, CHECK | Entity type (see constraints) |
| entity_id | UUID | NULL | ID of affected entity |
| changes | JSONB | NULL | Before/after values for updates |
| created_at | TIMESTAMP | DEFAULT NOW() | Action timestamp |

**Indexes**:
- `idx_audit_tenant` on `tenant_id` - Multi-tenant filtering
- `idx_audit_user` on `user_id` - User-based filtering
- `idx_audit_action` on `action` - Action-based filtering
- `idx_audit_entity` on `(entity_type, entity_id)` - Entity-based filtering
- `idx_audit_created` on `created_at` - Time-based filtering

**Constraints**:
- CHECK: action IN ('create', 'update', 'delete', 'read', 'export', 'import', 'start_exam', 'pause_exam', 'resume_exam', 'complete_exam', 'flag_student', 'approve_results', 'sync_offline')
- CHECK: entity_type IN ('question', 'exam', 'exam_result', 'security_settings', 'student_answer')
- FOREIGN KEY: tenant_id → tenants(id) ON DELETE CASCADE
- FOREIGN KEY: user_id → users(id)

**Performance Notes**:
- High-volume table - consider partitioning by created_at (monthly)
- Composite index (tenant_id, created_at) critical for audit queries
- JSONB changes column stores before/after values for updates

---

### 10. offline_sync_queue

**Purpose**: Manages offline data synchronization with retry logic and conflict resolution.

**Columns**:
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique queue entry identifier |
| student_id | UUID | NOT NULL, FK(users) | Reference to student |
| exam_id | UUID | NOT NULL, FK(exams) | Reference to exam |
| answers | JSONB | NOT NULL | Offline answers data |
| sync_status | VARCHAR(20) | DEFAULT 'pending' | Status: pending, synced, failed |
| retry_count | INTEGER | DEFAULT 0 | Number of sync attempts |
| last_error | TEXT | NULL | Last error message |
| created_at | TIMESTAMP | DEFAULT NOW() | Queue entry timestamp |
| synced_at | TIMESTAMP | NULL | Successful sync timestamp |

**Indexes**:
- `idx_sync_student` on `student_id` - Student-based filtering
- `idx_sync_exam` on `exam_id` - Exam-based filtering
- `idx_sync_status` on `sync_status` - Status-based filtering
- `idx_sync_created` on `created_at` - Time-based filtering

**Constraints**:
- CHECK: sync_status IN ('pending', 'synced', 'failed')
- FOREIGN KEY: student_id → users(id) ON DELETE CASCADE
- FOREIGN KEY: exam_id → exams(id) ON DELETE CASCADE

**Performance Notes**:
- Composite index recommended: (sync_status, created_at) for sync processing
- JSONB answers column stores flexible answer data
- Retry logic with exponential backoff

---

## Relationships and Foreign Keys

### Relationship Diagram

```
tenants (1) ──────────────────┐
                               │
users (1) ──────────────────┐  │
                            │  │
                    ┌───────┴──┴─────────┐
                    │                    │
            questions_bank (N)      exams (N)
                    │                    │
                    │            ┌───────┴────────┐
                    │            │                │
                    └────────────┤                │
                            exam_questions       security_settings
                                 │                │
                                 │        ┌───────┘
                                 │        │
                            student_exam_progress
                                 │
                            exam_results
                                 │
                    ┌────────────┬┴────────────┐
                    │            │            │
            student_answers  proctoring_logs  audit_logs
                    │
            offline_sync_queue
```

### Cascading Delete Rules

- **exams** → exam_questions, exam_results, student_exam_progress, security_settings, proctoring_logs (CASCADE)
- **exam_results** → student_answers (CASCADE)
- **questions_bank** → exam_questions (CASCADE)
- **users** → student_exam_progress, exam_results, proctoring_logs (CASCADE)
- **tenants** → All tables with tenant_id (CASCADE)

---

## Query Optimization

### Common Queries and Recommended Indexes

**1. Get all questions for a subject**
```sql
SELECT * FROM questions_bank 
WHERE tenant_id = $1 AND subject = $2 AND deleted_at IS NULL
ORDER BY created_at DESC;
```
Index: `(tenant_id, subject, deleted_at)`

**2. Get exam with all questions**
```sql
SELECT e.*, eq.question_order, q.* 
FROM exams e
JOIN exam_questions eq ON e.id = eq.exam_id
JOIN questions_bank q ON eq.question_id = q.id
WHERE e.id = $1
ORDER BY eq.question_order;
```
Index: `exam_questions(exam_id, question_order)`

**3. Get live monitoring data**
```sql
SELECT sep.*, u.name, u.email
FROM student_exam_progress sep
JOIN users u ON sep.student_id = u.id
WHERE sep.exam_id = $1 AND sep.status = 'Active'
ORDER BY sep.last_activity_time DESC;
```
Index: `(exam_id, status, last_activity_time)`

**4. Get exam results with analytics**
```sql
SELECT 
  exam_id,
  COUNT(*) as total_students,
  AVG(percentage) as avg_percentage,
  COUNT(CASE WHEN status = 'Passed' THEN 1 END) as passed_count
FROM exam_results
WHERE exam_id = $1
GROUP BY exam_id;
```
Index: `(exam_id, status)`

**5. Get student detailed result**
```sql
SELECT er.*, sa.* 
FROM exam_results er
LEFT JOIN student_answers sa ON er.id = sa.result_id
WHERE er.exam_id = $1 AND er.student_id = $2
ORDER BY sa.created_at;
```
Index: `student_answers(result_id, created_at)`

---

## Migration and Deployment

### Running Migrations

```bash
# Apply migration
psql -U postgres -d cbt_db -f api/tenant/cbt/_migrations/001_create_cbt_schema.sql

# Verify schema
psql -U postgres -d cbt_db -c "\dt"
```

### Backup and Recovery

```bash
# Full backup
pg_dump -U postgres cbt_db > cbt_backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres cbt_db < cbt_backup_20260504.sql

# Point-in-time recovery (requires WAL archiving)
pg_basebackup -D /backup/cbt_db -Ft -z -P
```

### Performance Tuning

1. **Connection Pooling**: Use PgBouncer for connection management
2. **Query Caching**: Implement Redis for frequently accessed data
3. **Partitioning**: Consider partitioning large tables (proctoring_logs, audit_logs) by date
4. **Vacuum**: Regular VACUUM and ANALYZE for query optimization
5. **Monitoring**: Use pg_stat_statements to identify slow queries

---

## Troubleshooting

### Common Issues

**Issue**: Slow exam results queries
- **Solution**: Ensure composite index on (exam_id, status) exists
- **Query**: `CREATE INDEX idx_results_exam_status ON exam_results(exam_id, status);`

**Issue**: Offline sync queue growing indefinitely
- **Solution**: Implement cleanup job for synced entries older than 30 days
- **Query**: `DELETE FROM offline_sync_queue WHERE sync_status = 'synced' AND synced_at < NOW() - INTERVAL '30 days';`

**Issue**: Audit logs consuming excessive disk space
- **Solution**: Archive old audit logs to separate table or external storage
- **Query**: `CREATE TABLE audit_logs_archive AS SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';`

**Issue**: Real-time monitoring lag
- **Solution**: Optimize student_exam_progress queries with composite indexes
- **Query**: `CREATE INDEX idx_progress_exam_status_activity ON student_exam_progress(exam_id, status, last_activity_time);`

---

## Maintenance Tasks

### Daily
- Monitor query performance with `pg_stat_statements`
- Check for failed offline sync entries
- Verify backup completion

### Weekly
- Run VACUUM ANALYZE on all tables
- Review audit logs for suspicious activities
- Check disk space usage

### Monthly
- Archive old audit logs
- Analyze query patterns and optimize indexes
- Review and update statistics

---

## References

- Migration file: `api/tenant/cbt/_migrations/001_create_cbt_schema.sql`
- Design document: `.kiro/specs/cbt-examinations-rebuild/design.md`
- API documentation: `docs/CBT_API_DOCUMENTATION.md`
