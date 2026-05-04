# CBT & Examinations Rebuild - Design Document

## Overview

The CBT & Examinations system is redesigned as a production-ready platform with proper backend integration, comprehensive database schema, real-time synchronization, and clean component architecture. The system follows a client-server architecture with React frontend components communicating with Node.js/Vercel backend APIs, using PostgreSQL for persistent storage and WebSocket connections for real-time updates.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Layer (React)                       │
├─────────────────────────────────────────────────────────────────┤
│  ExamManagement Component                                        │
│  ├─ Question Bank Tab                                            │
│  ├─ Exam Creation Tab                                            │
│  ├─ Live Monitoring Tab                                          │
│  ├─ Exam Results Tab                                             │
│  └─ Security Settings Tab                                        │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTP/REST + WebSocket
┌────────────────▼────────────────────────────────────────────────┐
│                    API Layer (Node.js/Vercel)                    │
├─────────────────────────────────────────────────────────────────┤
│  /api/tenant/cbt/questions          (Question Bank CRUD)         │
│  /api/tenant/cbt/exams              (Exam Management)            │
│  /api/tenant/cbt/monitoring         (Live Monitoring)            │
│  /api/tenant/cbt/results            (Exam Results)               │
│  /api/tenant/cbt/security           (Security Settings)          │
│  /api/tenant/cbt/sync               (Offline Sync)               │
│  /ws/cbt/monitoring/:examId         (WebSocket)                  │
└────────────────┬────────────────────────────────────────────────┘
                 │ SQL Queries
┌────────────────▼────────────────────────────────────────────────┐
│                  Data Layer (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────┤
│  questions_bank                                                  │
│  exams                                                           │
│  exam_questions                                                  │
│  student_exam_progress                                           │
│  exam_results                                                    │
│  student_answers                                                 │
│  security_settings                                               │
│  proctoring_logs                                                 │
│  audit_logs                                                      │
│  offline_sync_queue                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Frontend Components:**
- `ExamManagement` - Main container managing tab state and data
- `QuestionBankTab` - Question CRUD, import/export, search/filter
- `ExamCreationTab` - Exam form, question selection, scheduling
- `LiveMonitoringTab` - Real-time student progress tracking with WebSocket
- `ExamResultsTab` - Results display, analytics, export
- `SecuritySettingsTab` - Security configuration per exam

**Backend Services:**
- Question Bank Service - CRUD operations, validation, import/export
- Exam Service - Exam lifecycle management, scheduling
- Monitoring Service - Real-time progress tracking, WebSocket management
- Results Service - Score calculation, analytics, reporting
- Security Service - Settings persistence, validation
- Sync Service - Offline data synchronization with conflict resolution
- Audit Service - Comprehensive logging of all actions

## Data Models

### Database Schema

#### questions_bank Table
```sql
CREATE TABLE questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  text TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('objective', 'truefalse', 'essay')),
  options JSONB,
  correct_answer VARCHAR(255),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  subject VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_questions_tenant ON questions_bank(tenant_id);
CREATE INDEX idx_questions_subject ON questions_bank(subject);
CREATE INDEX idx_questions_difficulty ON questions_bank(difficulty);
```

#### exams Table
```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class VARCHAR(50) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  pass_mark DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  scheduled_date DATE,
  scheduled_time TIME,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_exams_tenant ON exams(tenant_id);
CREATE INDEX idx_exams_status ON exams(status);
```

#### exam_questions Table
```sql
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id),
  question_order INTEGER NOT NULL,
  marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
```

#### student_exam_progress Table
```sql
CREATE TABLE student_exam_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id),
  student_id UUID NOT NULL REFERENCES users(id),
  questions_answered INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  time_remaining INTEGER,
  last_activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flag_reason VARCHAR(255),
  flagged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_progress_exam ON student_exam_progress(exam_id);
CREATE INDEX idx_progress_student ON student_exam_progress(student_id);
```

#### exam_results Table
```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id),
  student_id UUID NOT NULL REFERENCES users(id),
  score DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  time_spent INTEGER NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

CREATE INDEX idx_results_exam ON exam_results(exam_id);
CREATE INDEX idx_results_student ON exam_results(student_id);
```

#### student_answers Table
```sql
CREATE TABLE student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id),
  student_answer TEXT,
  correct_answer VARCHAR(255),
  is_correct BOOLEAN NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_answers_result ON student_answers(result_id);
```

#### security_settings Table
```sql
CREATE TABLE security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL UNIQUE REFERENCES exams(id) ON DELETE CASCADE,
  enable_proctoring BOOLEAN DEFAULT false,
  disable_copy_paste BOOLEAN DEFAULT false,
  disable_right_click BOOLEAN DEFAULT false,
  require_camera BOOLEAN DEFAULT false,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_options BOOLEAN DEFAULT false,
  allowed_ips JSONB DEFAULT '[]'::jsonb,
  exam_password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_exam ON security_settings(exam_id);
```

#### proctoring_logs Table
```sql
CREATE TABLE proctoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id),
  student_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  event_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proctoring_exam ON proctoring_logs(exam_id);
CREATE INDEX idx_proctoring_student ON proctoring_logs(student_id);
```

#### audit_logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

#### offline_sync_queue Table
```sql
CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  exam_id UUID NOT NULL REFERENCES exams(id),
  answers JSONB NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_sync_student ON offline_sync_queue(student_id);
CREATE INDEX idx_sync_status ON offline_sync_queue(sync_status);
```

## API Endpoints

### Question Bank API

**GET /api/tenant/cbt/questions**
- Retrieve all questions with filtering
- Query: subject, difficulty, type, searchText, page, limit
- Response: { success, data: Question[], pagination }

**POST /api/tenant/cbt/questions**
- Create new question
- Body: { text, type, options, correctAnswer, difficulty, subject, tags }
- Response: { success, data: Question }

**PUT /api/tenant/cbt/questions/:id**
- Update question
- Body: Partial<Question>
- Response: { success, data: Question }

**DELETE /api/tenant/cbt/questions/:id**
- Delete question (soft delete)
- Response: { success, message }

**POST /api/tenant/cbt/questions/import**
- Import questions from CSV
- FormData: file, tenantId
- Response: { success, imported, failed, errors }

**GET /api/tenant/cbt/questions/export**
- Export questions to CSV
- Query: tenantId, questionIds, subject
- Response: CSV file

### Exam Management API

**GET /api/tenant/cbt/exams**
- Retrieve all exams
- Query: tenantId, status, class, page, limit
- Response: { success, data: Exam[], pagination }

**POST /api/tenant/cbt/exams**
- Create new exam
- Body: { title, subject, class, duration, passMark, totalMarks, questionIds, securitySettings }
- Response: { success, data: Exam }

**PUT /api/tenant/cbt/exams/:id**
- Update exam
- Body: Partial<Exam>
- Response: { success, data: Exam }

**DELETE /api/tenant/cbt/exams/:id**
- Delete exam
- Response: { success, message }

**POST /api/tenant/cbt/exams/:id/schedule**
- Schedule exam
- Body: { scheduledDate, scheduledTime }
- Response: { success, data: Exam }

**POST /api/tenant/cbt/exams/:id/start**
- Start exam
- Response: { success, data: Exam }

### Live Monitoring API

**GET /api/tenant/cbt/monitoring/:examId**
- Get live monitoring data
- Response: { success, data: LiveMonitoringData }

**GET /api/tenant/cbt/monitoring/:examId/student/:studentId**
- Get student progress
- Response: { success, data: StudentExamProgress }

**PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag**
- Flag student for suspicious activity
- Body: { reason }
- Response: { success, data: StudentExamProgress }

**WebSocket /ws/cbt/monitoring/:examId**
- Real-time monitoring updates
- Messages: progress_update, student_completed, exam_ended

### Exam Results API

**GET /api/tenant/cbt/results**
- Get exam results summary
- Query: tenantId, examId, startDate, endDate, page, limit
- Response: { success, data: ExamResultsSummary[] }

**GET /api/tenant/cbt/results/:examId**
- Get results for specific exam
- Response: { success, data: ExamResultsSummary }

**GET /api/tenant/cbt/results/:examId/student/:studentId**
- Get detailed result for student
- Response: { success, data: ExamResult }

**GET /api/tenant/cbt/results/export**
- Export results to CSV/PDF
- Query: examId, format
- Response: File download

### Security Settings API

**GET /api/tenant/cbt/security/:examId**
- Get security settings
- Response: { success, data: SecuritySettings }

**POST /api/tenant/cbt/security/:examId**
- Create/update security settings
- Body: Partial<SecuritySettings>
- Response: { success, data: SecuritySettings }

**GET /api/tenant/cbt/security/:examId/logs**
- Get proctoring logs
- Query: studentId, eventType, startDate, endDate, page, limit
- Response: { success, data: ProctoringLog[] }

### Offline Sync API

**POST /api/tenant/cbt/sync**
- Sync offline answers
- Body: { studentId, examId, answers, timestamp }
- Response: { success, synced: number, conflicts: number }

## Real-Time Data Synchronization

### WebSocket Architecture

1. **Connection Establishment**
   - Client connects to `/ws/cbt/monitoring/:examId`
   - Server validates tenant and exam access
   - Server adds client to exam's subscriber list

2. **Message Flow**
   - Student submits answer → Backend updates database
   - Backend publishes update to all connected invigilators
   - Invigilators receive real-time progress update
   - UI updates without page refresh

3. **Disconnection Handling**
   - Client disconnects → Server removes from subscriber list
   - Server maintains exam state
   - Reconnection restores previous state

### Polling Fallback

For environments without WebSocket support:
- Frontend polls `/api/tenant/cbt/monitoring/:examId` every 3 seconds
- Implements exponential backoff on errors
- Reduces polling frequency when no changes detected

## Error Handling and Validation

### Client-Side Validation

**Question Bank:**
- Question text: required, max 1000 characters
- Options: required for objective/truefalse, 2-4 options
- Correct answer: must match one of the options
- Difficulty: must be Easy, Medium, or Hard
- Subject: required, max 100 characters

**Exam Creation:**
- Title: required, max 255 characters
- Subject: required
- Class: required
- Duration: required, 15-480 minutes
- Pass mark: required, 0-100
- Total marks: required, must be > pass mark
- Questions: required, minimum 1 question

**Security Settings:**
- IP addresses: valid CIDR notation if provided
- Exam password: max 50 characters if provided

### Server-Side Validation

All client validations repeated on server with additional checks:
- Database constraints enforced
- Authorization verified for all operations
- Duplicate detection
- Referential integrity maintained
- Business logic validation

### Error Responses

```typescript
// Validation Error (400)
{
  success: false
  error: "Validation failed"
  validationErrors: {
    title: "Title is required",
    duration: "Duration must be between 15 and 480 minutes"
  }
}

// Not Found (404)
{
  success: false
  error: "Exam not found"
}

// Unauthorized (401)
{
  success: false
  error: "Unauthorized access"
}

// Server Error (500)
{
  success: false
  error: "Internal server error"
  requestId: "req-123456"
}
```

## Correctness Properties

### Property 1: Question Addition Round-Trip
For any valid question, adding it to the question bank SHALL result in the question being retrievable with identical data.
**Validates: Requirement 2.2**

### Property 2: Question Deletion Removes from Bank
For any question in the question bank, deleting it SHALL result in the question no longer appearing in subsequent queries.
**Validates: Requirement 2.4**

### Property 3: Search Filters Return Only Matching Questions
For any search query and any question bank, all returned questions SHALL match the search criteria.
**Validates: Requirement 2.5**

### Property 4: Statistics Accurately Reflect Question Bank
For any set of questions in the bank, the displayed statistics SHALL exactly match the actual data.
**Validates: Requirement 2.6**

### Property 5: CSV Import Preserves Question Data
For any valid CSV file with questions, importing it SHALL result in all valid questions being persisted with identical data.
**Validates: Requirement 2.7**

### Property 6: CSV Export-Import Round-Trip
For any set of questions exported to CSV and re-imported, the resulting questions SHALL be identical to the original.
**Validates: Requirement 2.8**

### Property 7: Exam Creation Persists All Details
For any valid exam data, creating an exam SHALL result in a database record containing all provided details.
**Validates: Requirement 1.2**

### Property 8: Selected Questions Are Retrievable
For any exam with selected questions, querying the exam SHALL return all selected questions with correct metadata.
**Validates: Requirement 1.3**

### Property 9: Exam Validation Rejects Invalid Data
For any exam form with missing required fields or invalid values, validation SHALL fail and prevent submission.
**Validates: Requirement 1.4**

### Property 10: Exam Scheduling Updates Status
For any exam in Draft status, scheduling it SHALL change its status to Scheduled.
**Validates: Requirement 1.5**

### Property 11: Exam Edits Update Database
For any exam modification, updating the exam SHALL persist changes to the database.
**Validates: Requirement 1.6**

### Property 12: Student Progress Updates in Real-Time
For any student answer submission during an exam, the student's progress SHALL update within 1 second on the monitoring dashboard.
**Validates: Requirement 3.2**

### Property 13: Monitoring Display Contains All Required Fields
For any student in an ongoing exam, the monitoring display SHALL show student name, questions answered, time remaining, and completion percentage.
**Validates: Requirement 3.3**

### Property 14: Exam Completion Records Status and Time
For any student completing an exam, their status SHALL be updated to "Completed" and the completion timestamp SHALL be recorded.
**Validates: Requirement 3.4**

### Property 15: Flags Record All Details
For any flag action by an invigilator, the flag SHALL be recorded with timestamp, reason, and student identifier.
**Validates: Requirement 3.5**

### Property 16: Score Calculation Is Accurate
For any completed exam with student answers, the calculated score SHALL equal the sum of marks for correct answers.
**Validates: Requirement 4.1**

### Property 17: Pass/Fail Status Matches Score
For any exam result, the pass/fail status SHALL be "Passed" if and only if the score is >= pass mark.
**Validates: Requirement 4.2**

### Property 18: Analytics Calculations Are Correct
For any set of exam results, the displayed average score SHALL equal the mean of all student scores.
**Validates: Requirement 4.3**

### Property 19: Security Settings Persist Correctly
For any security settings configuration, saving it SHALL persist all settings to the database.
**Validates: Requirement 5.1**

### Property 20: Offline Sync Preserves Answer Data
For any answers submitted offline, syncing them SHALL result in all answers being persisted to the database.
**Validates: Requirement 6.2**

### Property 21: Audit Logs Record All Actions
For any system action (create, update, delete), an audit log entry SHALL be created with user, timestamp, and details.
**Validates: Requirement 7.1**

