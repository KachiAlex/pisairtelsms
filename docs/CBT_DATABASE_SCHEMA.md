# CBT & Examinations Database Schema Documentation

## Overview

This document provides comprehensive documentation of the CBT (Computer-Based Testing) & Examinations database schema. The schema consists of 10 tables designed to support the complete exam lifecycle: creation, question management, live monitoring, result calculation, and security enforcement.

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Table Definitions](#table-definitions)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Constraints](#constraints)
6. [Soft Deletes](#soft-deletes)
7. [Data Types](#data-types)
8. [Migration Information](#migration-information)

## Schema Overview

### Tables

| Table Name | Purpose | Records |
|------------|---------|---------|
| `questions_bank` | Repository of exam questions | 1000s |
| `exams` | Exam definitions and scheduling | 100s |
| `exam_questions` | Junction table linking exams to questions | 1000s |
| `student_exam_progress` | Real-time student progress tracking | 100s-1000s |
| `exam_results` | Final exam results and scores | 1000s |
| `student_answers` | Individual student answers with correctness | 10000s |
| `security_settings` | Security configuration per exam | 100s |
| `proctoring_logs` | Proctoring events and suspicious activities | 1000s-10000s |
| `audit_logs` | Comprehensive action logging | 10000s |
| `offline_sync_queue` | Offline data synchronization queue | 100s-1000s |

## Table Definitions

### 1. questions_bank

Stores the repository of exam questions with metadata.

```sql
CREATE TABLE questions_bank (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB,
    correctAnswer TEXT,
    difficulty TEXT NOT NULL,
    subject TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    createdBy TEXT NOT NULL,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3),
    deletedAt TIMESTAMP(3),
    
    FOREIGN KEY (tenantId) REFERENCES tenants(id),
    FOREIGN KEY (createdBy) REFERENCES users(id)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `tenantId`: Organization/school identifier
- `text`: Question text (max 1000 characters)
- `type`: Question type - 'objective', 'truefalse', 'essay'
- `options`: JSON array of answer options for objective/truefalse questions
- `correctAnswer`: Correct answer identifier or text
- `difficulty`: 'Easy', 'Medium', or 'Hard'
- `subject`: Subject/topic of the question
- `tags`: JSON array of tags for categorization
- `createdBy`: User ID of question creator
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Timestamp of soft delete (NULL if not deleted)

**Indexes:**
- `idx_questions_tenant`: On `tenantId` for tenant isolation
- `idx_questions_subject`: On `subject` for filtering
- `idx_questions_difficulty`: On `difficulty` for filtering
- `idx_questions_createdAt`: On `createdAt` for sorting

**Constraints:**
- Primary key on `id`
- Foreign key to `tenants(id)`
- Foreign key to `users(id)` via `createdBy`

---

### 2. exams

Stores exam definitions and scheduling information.

```sql
CREATE TABLE exams (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    passMark DECIMAL(5,2) NOT NULL,
    totalMarks DECIMAL(5,2) NOT NULL,
    status TEXT DEFAULT 'Draft',
    scheduledDate TIMESTAMP(3),
    scheduledTime TEXT,
    createdBy TEXT NOT NULL,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3),
    deletedAt TIMESTAMP(3),
    
    FOREIGN KEY (tenantId) REFERENCES tenants(id),
    FOREIGN KEY (createdBy) REFERENCES users(id)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `tenantId`: Organization/school identifier
- `title`: Exam title (max 255 characters)
- `subject`: Subject of the exam
- `class`: Class/grade level
- `description`: Detailed exam description
- `duration`: Exam duration in minutes (15-480)
- `passMark`: Passing score (0-100)
- `totalMarks`: Total marks for the exam
- `status`: 'Draft', 'Scheduled', 'Ongoing', 'Completed'
- `scheduledDate`: Date when exam is scheduled
- `scheduledTime`: Time when exam is scheduled (HH:MM format)
- `createdBy`: User ID of exam creator
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update
- `deletedAt`: Timestamp of soft delete (NULL if not deleted)

**Indexes:**
- `idx_exams_tenant`: On `tenantId` for tenant isolation
- `idx_exams_status`: On `status` for filtering by status
- `idx_exams_createdAt`: On `createdAt` for sorting

**Constraints:**
- Primary key on `id`
- Foreign key to `tenants(id)`
- Foreign key to `users(id)` via `createdBy`

---

### 3. exam_questions

Junction table linking exams to questions with ordering and marks.

```sql
CREATE TABLE exam_questions (
    id TEXT PRIMARY KEY,
    examId TEXT NOT NULL,
    questionId TEXT NOT NULL,
    questionOrder INTEGER NOT NULL,
    marks DECIMAL(5,2) NOT NULL,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES questions_bank(id),
    UNIQUE(examId, questionId)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `examId`: Reference to exam
- `questionId`: Reference to question
- `questionOrder`: Order of question in exam (1-based)
- `marks`: Marks allocated for this question
- `createdAt`: Timestamp of creation

**Indexes:**
- `idx_exam_questions_exam`: On `examId` for exam queries
- `idx_exam_questions_question`: On `questionId` for question queries
- Unique constraint on `(examId, questionId)` to prevent duplicates

**Constraints:**
- Primary key on `id`
- Foreign key to `exams(id)` with ON DELETE CASCADE
- Foreign key to `questions_bank(id)`
- Unique constraint on `(examId, questionId)`

---

### 4. student_exam_progress

Tracks real-time student progress during exams.

```sql
CREATE TABLE student_exam_progress (
    id TEXT PRIMARY KEY,
    examId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    questionsAnswered INTEGER DEFAULT 0,
    currentQuestion INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    timeRemaining INTEGER,
    lastActivityTime TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    flagReason TEXT,
    flaggedAt TIMESTAMP(3),
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3),
    
    FOREIGN KEY (examId) REFERENCES exams(id),
    FOREIGN KEY (studentId) REFERENCES users(id),
    UNIQUE(examId, studentId)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `examId`: Reference to exam
- `studentId`: Reference to student user
- `questionsAnswered`: Number of questions answered
- `currentQuestion`: Current question number
- `status`: 'Active', 'Paused', 'Completed', 'Flagged'
- `timeRemaining`: Remaining time in seconds
- `lastActivityTime`: Timestamp of last activity
- `flagReason`: Reason for flagging (if flagged)
- `flaggedAt`: Timestamp when flagged
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Indexes:**
- `idx_progress_exam`: On `examId` for exam queries
- `idx_progress_student`: On `studentId` for student queries
- `idx_progress_status`: On `status` for filtering
- Unique constraint on `(examId, studentId)`

**Constraints:**
- Primary key on `id`
- Foreign key to `exams(id)`
- Foreign key to `users(id)` via `studentId`
- Unique constraint on `(examId, studentId)`

---

### 5. exam_results

Stores final exam results and scores.

```sql
CREATE TABLE exam_results (
    id TEXT PRIMARY KEY,
    examId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    totalMarks DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    status TEXT NOT NULL,
    timeSpent INTEGER NOT NULL,
    submittedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (examId) REFERENCES exams(id),
    FOREIGN KEY (studentId) REFERENCES users(id),
    UNIQUE(examId, studentId)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `examId`: Reference to exam
- `studentId`: Reference to student user
- `score`: Student's score
- `totalMarks`: Total marks for the exam
- `percentage`: Score as percentage
- `status`: 'Passed' or 'Failed'
- `timeSpent`: Time spent on exam in seconds
- `submittedAt`: Timestamp of submission
- `createdAt`: Timestamp of creation

**Indexes:**
- `idx_results_exam`: On `examId` for exam queries
- `idx_results_student`: On `studentId` for student queries
- `idx_results_createdAt`: On `createdAt` for sorting
- Unique constraint on `(examId, studentId)`

**Constraints:**
- Primary key on `id`
- Foreign key to `exams(id)`
- Foreign key to `users(id)` via `studentId`
- Unique constraint on `(examId, studentId)`

---

### 6. student_answers

Stores individual student answers with correctness information.

```sql
CREATE TABLE student_answers (
    id TEXT PRIMARY KEY,
    resultId TEXT NOT NULL,
    questionId TEXT NOT NULL,
    studentAnswer TEXT,
    correctAnswer TEXT,
    isCorrect BOOLEAN NOT NULL,
    marksObtained DECIMAL(5,2) NOT NULL,
    totalMarks DECIMAL(5,2) NOT NULL,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (resultId) REFERENCES exam_results(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES questions_bank(id)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `resultId`: Reference to exam result
- `questionId`: Reference to question
- `studentAnswer`: Student's answer text
- `correctAnswer`: Correct answer text
- `isCorrect`: Boolean indicating if answer is correct
- `marksObtained`: Marks obtained for this answer
- `totalMarks`: Total marks for this question
- `createdAt`: Timestamp of creation

**Indexes:**
- `idx_answers_result`: On `resultId` for result queries
- `idx_answers_question`: On `questionId` for question queries

**Constraints:**
- Primary key on `id`
- Foreign key to `exam_results(id)` with ON DELETE CASCADE
- Foreign key to `questions_bank(id)`

---

### 7. security_settings

Stores security configuration per exam.

```sql
CREATE TABLE security_settings (
    id TEXT PRIMARY KEY,
    examId TEXT NOT NULL UNIQUE,
    enableProctoring BOOLEAN DEFAULT false,
    disableCopyPaste BOOLEAN DEFAULT false,
    disableRightClick BOOLEAN DEFAULT false,
    requireCamera BOOLEAN DEFAULT false,
    randomizeQuestions BOOLEAN DEFAULT false,
    randomizeOptions BOOLEAN DEFAULT false,
    allowedIps JSONB DEFAULT '[]'::jsonb,
    examPassword TEXT,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3),
    
    FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE CASCADE
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `examId`: Reference to exam (unique)
- `enableProctoring`: Enable camera monitoring
- `disableCopyPaste`: Prevent copy/paste
- `disableRightClick`: Disable right-click context menu
- `requireCamera`: Require camera access
- `randomizeQuestions`: Randomize question order
- `randomizeOptions`: Randomize answer options
- `allowedIps`: JSON array of allowed IP addresses/CIDR ranges
- `examPassword`: Password required to access exam
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last update

**Indexes:**
- `idx_security_exam`: On `examId` for exam queries
- Unique constraint on `examId`

**Constraints:**
- Primary key on `id`
- Foreign key to `exams(id)` with ON DELETE CASCADE
- Unique constraint on `examId`

---

### 8. proctoring_logs

Records proctoring events and suspicious activities.

```sql
CREATE TABLE proctoring_logs (
    id TEXT PRIMARY KEY,
    examId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    eventDetails JSONB,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (examId) REFERENCES exams(id),
    FOREIGN KEY (studentId) REFERENCES users(id)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `examId`: Reference to exam
- `studentId`: Reference to student user
- `eventType`: Type of event (e.g., 'tab_switch', 'copy_attempt', 'camera_off')
- `eventDetails`: JSON object with event-specific details
- `createdAt`: Timestamp of event

**Indexes:**
- `idx_proctoring_exam`: On `examId` for exam queries
- `idx_proctoring_student`: On `studentId` for student queries
- `idx_proctoring_createdAt`: On `createdAt` for sorting

**Constraints:**
- Primary key on `id`
- Foreign key to `exams(id)`
- Foreign key to `users(id)` via `studentId`

---

### 9. audit_logs

Comprehensive action logging for compliance and security.

```sql
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT,
    changes JSONB,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenantId) REFERENCES tenants(id),
    FOREIGN KEY (userId) REFERENCES users(id)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `tenantId`: Reference to tenant
- `userId`: Reference to user performing action
- `action`: Action type (e.g., 'create', 'update', 'delete', 'flag', 'approve')
- `entityType`: Type of entity affected (e.g., 'question', 'exam', 'result')
- `entityId`: ID of entity affected
- `changes`: JSON object with before/after values
- `createdAt`: Timestamp of action

**Indexes:**
- `idx_audit_tenant`: On `tenantId` for tenant queries
- `idx_audit_user`: On `userId` for user queries
- `idx_audit_createdAt`: On `createdAt` for sorting
- `idx_audit_entityType`: On `entityType` for filtering

**Constraints:**
- Primary key on `id`
- Foreign key to `tenants(id)`
- Foreign key to `users(id)` via `userId`

---

### 10. offline_sync_queue

Manages offline data synchronization queue.

```sql
CREATE TABLE offline_sync_queue (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    examId TEXT NOT NULL,
    tenantId TEXT NOT NULL,
    answers JSONB NOT NULL,
    syncStatus TEXT DEFAULT 'pending',
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    syncedAt TIMESTAMP(3),
    
    FOREIGN KEY (studentId) REFERENCES users(id),
    FOREIGN KEY (examId) REFERENCES exams(id),
    FOREIGN KEY (tenantId) REFERENCES tenants(id)
);
```

**Columns:**
- `id`: Unique identifier (CUID)
- `studentId`: Reference to student user
- `examId`: Reference to exam
- `tenantId`: Reference to tenant
- `answers`: JSON array of answers to sync
- `syncStatus`: 'pending', 'synced', or 'failed'
- `createdAt`: Timestamp of creation
- `syncedAt`: Timestamp of successful sync

**Indexes:**
- `idx_sync_student`: On `studentId` for student queries
- `idx_sync_exam`: On `examId` for exam queries
- `idx_sync_status`: On `syncStatus` for filtering
- `idx_sync_createdAt`: On `createdAt` for sorting

**Constraints:**
- Primary key on `id`
- Foreign key to `users(id)` via `studentId`
- Foreign key to `exams(id)` via `examId`
- Foreign key to `tenants(id)` via `tenantId`

---

## Relationships

### Entity Relationship Diagram

```
Tenant
├── User (many)
├── QuestionBank (many)
├── Exam (many)
├── StudentExamProgress (many)
├── ExamResult (many)
├── SecuritySettings (many)
├── ProctoringLog (many)
├── AuditLog (many)
└── OfflineSyncQueue (many)

User
├── QuestionBank (created_by)
├── Exam (created_by)
├── StudentExamProgress (student)
├── ExamResult (student)
├── StudentAnswer (student)
├── ProctoringLog (student)
├── AuditLog (user)
└── OfflineSyncQueue (student)

Exam
├── ExamQuestion (many)
├── StudentExamProgress (many)
├── ExamResult (many)
├── SecuritySettings (one)
├── ProctoringLog (many)
└── OfflineSyncQueue (many)

ExamQuestion
├── Exam (one)
└── QuestionBank (one)

ExamResult
├── Exam (one)
├── User (student)
└── StudentAnswer (many)

StudentAnswer
├── ExamResult (one)
└── QuestionBank (one)

SecuritySettings
└── Exam (one)

ProctoringLog
├── Exam (one)
└── User (student)

AuditLog
├── Tenant (one)
└── User (one)

OfflineSyncQueue
├── User (student)
├── Exam (one)
└── Tenant (one)
```

## Indexes

### Performance Indexes

All frequently queried columns have indexes to ensure optimal query performance:

**questions_bank:**
- `tenantId` - For tenant isolation
- `subject` - For filtering by subject
- `difficulty` - For filtering by difficulty
- `createdAt` - For sorting

**exams:**
- `tenantId` - For tenant isolation
- `status` - For filtering by status
- `createdAt` - For sorting

**exam_questions:**
- `examId` - For retrieving questions in an exam
- `questionId` - For finding exams containing a question

**student_exam_progress:**
- `examId` - For monitoring an exam
- `studentId` - For tracking a student
- `status` - For filtering by status

**exam_results:**
- `examId` - For exam results
- `studentId` - For student results
- `createdAt` - For sorting

**student_answers:**
- `resultId` - For retrieving answers in a result
- `questionId` - For finding answers to a question

**security_settings:**
- `examId` - For retrieving settings

**proctoring_logs:**
- `examId` - For exam logs
- `studentId` - For student logs
- `createdAt` - For sorting

**audit_logs:**
- `tenantId` - For tenant logs
- `userId` - For user actions
- `createdAt` - For sorting
- `entityType` - For filtering by entity type

**offline_sync_queue:**
- `studentId` - For student sync queue
- `examId` - For exam sync queue
- `syncStatus` - For filtering by status
- `createdAt` - For sorting

## Constraints

### Primary Keys

All tables have a primary key on the `id` column using CUID (Collision-resistant IDs).

### Foreign Keys

**Referential Integrity:**
- `questions_bank.tenantId` → `tenants.id`
- `questions_bank.createdBy` → `users.id`
- `exams.tenantId` → `tenants.id`
- `exams.createdBy` → `users.id`
- `exam_questions.examId` → `exams.id` (ON DELETE CASCADE)
- `exam_questions.questionId` → `questions_bank.id`
- `student_exam_progress.examId` → `exams.id`
- `student_exam_progress.studentId` → `users.id`
- `exam_results.examId` → `exams.id`
- `exam_results.studentId` → `users.id`
- `student_answers.resultId` → `exam_results.id` (ON DELETE CASCADE)
- `student_answers.questionId` → `questions_bank.id`
- `security_settings.examId` → `exams.id` (ON DELETE CASCADE)
- `proctoring_logs.examId` → `exams.id`
- `proctoring_logs.studentId` → `users.id`
- `audit_logs.tenantId` → `tenants.id`
- `audit_logs.userId` → `users.id`
- `offline_sync_queue.studentId` → `users.id`
- `offline_sync_queue.examId` → `exams.id`
- `offline_sync_queue.tenantId` → `tenants.id`

### Unique Constraints

- `users.tenantId + email` - Unique email per tenant
- `exam_questions.examId + questionId` - Prevent duplicate questions in exam
- `student_exam_progress.examId + studentId` - One progress record per student per exam
- `exam_results.examId + studentId` - One result per student per exam
- `security_settings.examId` - One security settings per exam

## Soft Deletes

The following tables support soft deletes via a `deletedAt` column:

- `questions_bank` - Soft delete questions to maintain historical data
- `exams` - Soft delete exams to maintain historical data
- `users` - Soft delete users to maintain historical data

**Query Pattern for Active Records:**
```sql
SELECT * FROM questions_bank WHERE deletedAt IS NULL;
SELECT * FROM exams WHERE deletedAt IS NULL;
SELECT * FROM users WHERE deletedAt IS NULL;
```

**Soft Delete Operation:**
```sql
UPDATE questions_bank SET deletedAt = CURRENT_TIMESTAMP WHERE id = $1;
UPDATE exams SET deletedAt = CURRENT_TIMESTAMP WHERE id = $1;
UPDATE users SET deletedAt = CURRENT_TIMESTAMP WHERE id = $1;
```

## Data Types

### PostgreSQL Data Types Used

- `TEXT` - Variable-length text (questions, descriptions)
- `INTEGER` - Whole numbers (duration, marks, counts)
- `DECIMAL(5,2)` - Fixed-point decimal (scores, marks)
- `BOOLEAN` - True/false values (security settings)
- `JSONB` - JSON binary format (options, tags, event details)
- `TIMESTAMP(3)` - Timestamp with millisecond precision
- `CUID` - Collision-resistant unique identifier (primary keys)

### JSON Structures

**questions_bank.options:**
```json
[
  { "id": "A", "text": "Option A" },
  { "id": "B", "text": "Option B" },
  { "id": "C", "text": "Option C" },
  { "id": "D", "text": "Option D" }
]
```

**questions_bank.tags:**
```json
["algebra", "equations", "linear"]
```

**security_settings.allowedIps:**
```json
["192.168.1.0/24", "10.0.0.0/8", "203.0.113.5"]
```

**proctoring_logs.eventDetails:**
```json
{
  "tabName": "Google Search",
  "timestamp": "2024-01-15T10:30:45Z",
  "severity": "high"
}
```

**audit_logs.changes:**
```json
{
  "before": { "status": "Draft" },
  "after": { "status": "Scheduled" }
}
```

**offline_sync_queue.answers:**
```json
[
  {
    "questionId": "q1",
    "answer": "B",
    "timestamp": "2024-01-15T10:30:45Z"
  },
  {
    "questionId": "q2",
    "answer": "True",
    "timestamp": "2024-01-15T10:31:00Z"
  }
]
```

## Migration Information

### Migration File

- **Location:** `prisma/migrations/0_init/migration.sql`
- **Status:** Applied
- **Tables Created:** 10
- **Indexes Created:** 40+
- **Foreign Keys:** 20+

### Running Migrations

```bash
# Apply migrations
npx prisma migrate deploy

# Create new migration
npx prisma migrate dev --name <migration_name>

# Reset database (development only)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

### Rollback Procedure

A rollback script is available at `prisma/migrations/rollback.sql` for emergency situations.

**WARNING:** Rollback will delete all data. Use only in development environments.

```bash
# Execute rollback (development only)
psql $DATABASE_URL < prisma/migrations/rollback.sql
```

## Performance Considerations

### Query Optimization

1. **Always filter by tenantId** - Ensures tenant isolation and improves query performance
2. **Use indexes for filtering** - Queries on indexed columns are significantly faster
3. **Pagination** - Use LIMIT and OFFSET for large result sets
4. **Soft deletes** - Always include `WHERE deletedAt IS NULL` in queries

### Scaling Considerations

1. **Partitioning** - Consider partitioning large tables by `tenantId` or `createdAt`
2. **Archiving** - Archive old exam results and audit logs to separate tables
3. **Caching** - Cache frequently accessed questions and exam data
4. **Connection pooling** - Use connection pooling for high-concurrency scenarios

### Maintenance

1. **Index maintenance** - Regularly analyze and reindex tables
2. **Vacuum** - Run VACUUM ANALYZE periodically
3. **Monitoring** - Monitor query performance and slow queries
4. **Backups** - Regular backups of the database

## Compliance and Security

### Data Protection

- All personally identifiable information (PII) is encrypted at rest
- Audit logs track all data access and modifications
- Soft deletes preserve historical data for compliance
- Foreign key constraints maintain data integrity

### Audit Trail

- All CRUD operations are logged in `audit_logs`
- User identification is recorded for all actions
- Timestamps track when actions occurred
- Changes are recorded in JSON format for detailed tracking

### Access Control

- Tenant isolation via `tenantId` ensures data separation
- User roles determine access to different operations
- Foreign key constraints prevent unauthorized data access
- Unique constraints prevent duplicate data

## Troubleshooting

### Common Issues

**Issue:** Foreign key constraint violation
- **Cause:** Attempting to delete a record that is referenced by other records
- **Solution:** Delete dependent records first or use CASCADE delete

**Issue:** Duplicate key violation
- **Cause:** Attempting to insert duplicate data in unique columns
- **Solution:** Check for existing records before inserting

**Issue:** Query performance degradation
- **Cause:** Missing indexes or inefficient queries
- **Solution:** Analyze query plans and add indexes as needed

**Issue:** Soft delete not working
- **Cause:** Queries not filtering by `deletedAt IS NULL`
- **Solution:** Always include soft delete filter in WHERE clause

## Support

For issues or questions about the database schema, please refer to:
- API Documentation: `docs/API_DOCUMENTATION.md`
- CBT Configuration Guide: `docs/CBT_CONFIGURATION_GUIDE.md`
- Troubleshooting Guide: `docs/TROUBLESHOOTING.md`
