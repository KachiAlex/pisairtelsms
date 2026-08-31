# CBT Dashboard Tabs Functionality - Design Document

## Overview

The CBT Dashboard Tabs Functionality transforms the existing mock-data-driven exam management interface into a fully operational system with real data persistence, backend integration, and real-time synchronization. This design establishes the technical architecture for five interconnected tabs: Question Bank Management, Exam Creation, Live Monitoring, Exam Results, and Security Settings.

The system follows a client-server architecture with React frontend components communicating with Node.js/Vercel backend APIs, using a relational database for persistent storage and WebSocket connections for real-time updates during live exam monitoring.

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
│  /api/tenant/cbt/sync               (Real-time Sync)             │
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
│  security_settings                                               │
│  proctoring_logs                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Frontend Components:**
- `ExamManagement` - Main container component managing tab state
- `QuestionBankTab` - Question CRUD, import/export, search/filter
- `ExamCreationTab` - Exam form, question selection, scheduling
- `LiveMonitoringTab` - Real-time student progress tracking
- `ExamResultsTab` - Results display, analytics, export
- `SecuritySettingsTab` - Security configuration per exam

**Backend Services:**
- Question Bank Service - CRUD operations, validation, import/export
- Exam Service - Exam lifecycle management, scheduling
- Monitoring Service - Real-time progress tracking, WebSocket management
- Results Service - Score calculation, analytics, reporting
- Security Service - Settings persistence, validation

## Components and Interfaces

### Frontend Component Structure

#### ExamManagement (Main Container)
```typescript
interface ExamManagementState {
  activeTab: 'questions' | 'exams' | 'live' | 'results' | 'security'
  selectedExam: Exam | null
  loading: boolean
  error: string | null
  stats: DashboardStats
}

interface DashboardStats {
  totalQuestions: number
  totalExams: number
  ongoingExams: number
  activeStudents: number
  averageScore: number
  passRate: number
}
```

#### Question Bank Tab
```typescript
interface Question {
  id: string
  tenantId: string
  text: string
  type: 'objective' | 'truefalse' | 'essay'
  options: string[]
  correctAnswer: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  subject: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

interface QuestionFilter {
  subject?: string
  difficulty?: string
  type?: string
  searchText?: string
  tags?: string[]
}
```

#### Exam Creation Tab
```typescript
interface Exam {
  id: string
  tenantId: string
  title: string
  subject: string
  class: string
  description?: string
  duration: number // in minutes
  passMark: number
  totalMarks: number
  status: 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed'
  scheduledDate: Date
  scheduledTime: string
  questions: ExamQuestion[]
  securitySettings: SecuritySettings
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface ExamQuestion {
  id: string
  examId: string
  questionId: string
  order: number
  marks: number
}

interface ExamCreationForm {
  title: string
  subject: string
  class: string
  duration: string
  passMark: string
  totalMarks: string
  scheduledDate: string
  scheduledTime: string
  selectedQuestions: string[]
}
```

#### Live Monitoring Tab
```typescript
interface StudentExamProgress {
  id: string
  examId: string
  studentId: string
  studentName: string
  questionsAnswered: number
  totalQuestions: number
  currentQuestion: number
  status: 'Active' | 'Completed' | 'Paused' | 'Flagged'
  timeRemaining: number // in seconds
  completionPercentage: number
  lastActivityTime: Date
  flagReason?: string
  flaggedAt?: Date
}

interface LiveMonitoringData {
  examId: string
  examTitle: string
  totalStudents: number
  activeStudents: number
  completedStudents: number
  averageProgress: number
  students: StudentExamProgress[]
}
```

#### Exam Results Tab
```typescript
interface ExamResult {
  id: string
  examId: string
  studentId: string
  studentName: string
  score: number
  totalMarks: number
  percentage: number
  status: 'Passed' | 'Failed'
  timeSpent: number // in seconds
  submittedAt: Date
  answers: StudentAnswer[]
}

interface StudentAnswer {
  questionId: string
  questionText: string
  studentAnswer: string
  correctAnswer: string
  isCorrect: boolean
  marksObtained: number
  totalMarks: number
}

interface ExamResultsSummary {
  examId: string
  examTitle: string
  totalStudents: number
  completedStudents: number
  averageScore: number
  passRate: number
  highestScore: number
  lowestScore: number
  results: ExamResult[]
}
```

#### Security Settings Tab
```typescript
interface SecuritySettings {
  id: string
  examId: string
  enableProctoring: boolean
  disableCopyPaste: boolean
  disableRightClick: boolean
  requireCamera: boolean
  randomizeQuestions: boolean
  randomizeOptions: boolean
  allowedIPs: string[]
  examPassword?: string
  createdAt: Date
  updatedAt: Date
}

interface ProctoringLog {
  id: string
  examId: string
  studentId: string
  eventType: 'camera_on' | 'camera_off' | 'tab_switch' | 'copy_attempt' | 'right_click'
  timestamp: Date
  details: Record<string, any>
}
```

## Data Models

### Database Schema

#### questions_bank Table
```sql
CREATE TABLE questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  text TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('objective', 'truefalse', 'essay')),
  options JSONB, -- Array of options for objective/truefalse
  correct_answer VARCHAR(10),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  subject VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT valid_options CHECK (
    (type = 'essay' AND options IS NULL) OR
    (type IN ('objective', 'truefalse') AND options IS NOT NULL)
  )
);

CREATE INDEX idx_questions_tenant ON questions_bank(tenant_id);
CREATE INDEX idx_questions_subject ON questions_bank(subject);
CREATE INDEX idx_questions_difficulty ON questions_bank(difficulty);
CREATE INDEX idx_questions_type ON questions_bank(type);
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
  duration INTEGER NOT NULL, -- in minutes
  pass_mark DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Ongoing', 'Completed')),
  scheduled_date DATE,
  scheduled_time TIME,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_exams_tenant ON exams(tenant_id);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_scheduled_date ON exams(scheduled_date);
```

#### exam_questions Table
```sql
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id),
  question_order INTEGER NOT NULL,
  marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, question_id)
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_question ON exam_questions(question_id);
```

#### student_exam_progress Table
```sql
CREATE TABLE student_exam_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id),
  student_id UUID NOT NULL REFERENCES users(id),
  questions_answered INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Paused', 'Flagged')),
  time_remaining INTEGER, -- in seconds
  last_activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flag_reason VARCHAR(255),
  flagged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_progress_exam ON student_exam_progress(exam_id);
CREATE INDEX idx_progress_student ON student_exam_progress(student_id);
CREATE INDEX idx_progress_status ON student_exam_progress(status);
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
  status VARCHAR(20) NOT NULL CHECK (status IN ('Passed', 'Failed')),
  time_spent INTEGER NOT NULL, -- in seconds
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

CREATE INDEX idx_results_exam ON exam_results(exam_id);
CREATE INDEX idx_results_student ON exam_results(student_id);
CREATE INDEX idx_results_status ON exam_results(status);
```

#### student_answers Table
```sql
CREATE TABLE student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id),
  student_answer TEXT,
  correct_answer VARCHAR(10),
  is_correct BOOLEAN NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_answers_result ON student_answers(result_id);
CREATE INDEX idx_answers_question ON student_answers(question_id);
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
CREATE INDEX idx_proctoring_timestamp ON proctoring_logs(created_at);
```

## API Endpoints and Contracts

### Question Bank API

#### GET /api/tenant/cbt/questions
Retrieve all questions with optional filtering
```typescript
Request:
  Query Parameters:
    - tenantId: string (required)
    - subject?: string
    - difficulty?: string
    - type?: string
    - searchText?: string
    - page?: number (default: 1)
    - limit?: number (default: 20)

Response (200):
  {
    success: boolean
    data: Question[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }

Response (400/500):
  {
    success: false
    error: string
  }
```

#### POST /api/tenant/cbt/questions
Create a new question
```typescript
Request:
  Body: {
    text: string (required)
    type: 'objective' | 'truefalse' | 'essay' (required)
    options?: string[] (required for objective/truefalse)
    correctAnswer: string (required)
    difficulty: 'Easy' | 'Medium' | 'Hard' (required)
    subject: string (required)
    tags?: string[]
  }

Response (201):
  {
    success: boolean
    data: Question
  }

Response (400/500):
  {
    success: false
    error: string
    validationErrors?: Record<string, string>
  }
```

#### PUT /api/tenant/cbt/questions/:id
Update an existing question
```typescript
Request:
  Params: { id: string }
  Body: Partial<Question>

Response (200):
  {
    success: boolean
    data: Question
  }

Response (404/400/500):
  {
    success: false
    error: string
  }
```

#### DELETE /api/tenant/cbt/questions/:id
Delete a question (soft delete)
```typescript
Request:
  Params: { id: string }

Response (200):
  {
    success: boolean
    message: string
  }

Response (404/500):
  {
    success: false
    error: string
  }
```

#### POST /api/tenant/cbt/questions/import
Import questions from CSV
```typescript
Request:
  FormData:
    - file: File (CSV format)
    - tenantId: string

Response (200):
  {
    success: boolean
    imported: number
    failed: number
    errors: Array<{ row: number; error: string }>
  }

Response (400/500):
  {
    success: false
    error: string
  }
```

#### GET /api/tenant/cbt/questions/export
Export questions to CSV
```typescript
Request:
  Query Parameters:
    - tenantId: string (required)
    - questionIds?: string[] (comma-separated)
    - subject?: string

Response (200):
  CSV file download

Response (400/500):
  {
    success: false
    error: string
  }
```

### Exam Management API

#### GET /api/tenant/cbt/exams
Retrieve all exams
```typescript
Request:
  Query Parameters:
    - tenantId: string (required)
    - status?: string
    - class?: string
    - page?: number
    - limit?: number

Response (200):
  {
    success: boolean
    data: Exam[]
    pagination: { ... }
  }
```

#### POST /api/tenant/cbt/exams
Create a new exam
```typescript
Request:
  Body: {
    title: string (required)
    subject: string (required)
    class: string (required)
    duration: number (required)
    passMark: number (required)
    totalMarks: number (required)
    scheduledDate?: string
    scheduledTime?: string
    questionIds: string[] (required)
    securitySettings?: Partial<SecuritySettings>
  }

Response (201):
  {
    success: boolean
    data: Exam
  }

Response (400/500):
  {
    success: false
    error: string
    validationErrors?: Record<string, string>
  }
```

#### PUT /api/tenant/cbt/exams/:id
Update an exam
```typescript
Request:
  Params: { id: string }
  Body: Partial<Exam>

Response (200):
  {
    success: boolean
    data: Exam
  }
```

#### DELETE /api/tenant/cbt/exams/:id
Delete an exam
```typescript
Request:
  Params: { id: string }

Response (200):
  {
    success: boolean
    message: string
  }
```

#### POST /api/tenant/cbt/exams/:id/schedule
Schedule an exam
```typescript
Request:
  Params: { id: string }
  Body: {
    scheduledDate: string (ISO date)
    scheduledTime: string (HH:mm format)
  }

Response (200):
  {
    success: boolean
    data: Exam
  }
```

#### POST /api/tenant/cbt/exams/:id/start
Start an exam (change status to Ongoing)
```typescript
Request:
  Params: { id: string }

Response (200):
  {
    success: boolean
    data: Exam
  }
```

### Live Monitoring API

#### GET /api/tenant/cbt/monitoring/:examId
Get live monitoring data for an exam
```typescript
Request:
  Params: { examId: string }
  Query: { tenantId: string }

Response (200):
  {
    success: boolean
    data: LiveMonitoringData
  }
```

#### GET /api/tenant/cbt/monitoring/:examId/student/:studentId
Get specific student progress
```typescript
Request:
  Params: { examId: string, studentId: string }

Response (200):
  {
    success: boolean
    data: StudentExamProgress
  }
```

#### PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag
Flag a student for suspicious activity
```typescript
Request:
  Params: { examId: string, studentId: string }
  Body: {
    reason: string
  }

Response (200):
  {
    success: boolean
    data: StudentExamProgress
  }
```

#### WebSocket: /ws/cbt/monitoring/:examId
Real-time monitoring updates via WebSocket
```typescript
Connection:
  URL: ws://server/ws/cbt/monitoring/:examId?tenantId=xxx

Messages Sent (from server):
  {
    type: 'progress_update'
    data: StudentExamProgress
  }
  {
    type: 'student_completed'
    data: { studentId: string, examId: string }
  }
  {
    type: 'exam_ended'
    data: { examId: string }
  }

Messages Received (from client):
  {
    type: 'subscribe'
    examId: string
  }
  {
    type: 'unsubscribe'
    examId: string
  }
```

### Exam Results API

#### GET /api/tenant/cbt/results
Get exam results summary
```typescript
Request:
  Query Parameters:
    - tenantId: string (required)
    - examId?: string
    - startDate?: string
    - endDate?: string
    - page?: number
    - limit?: number

Response (200):
  {
    success: boolean
    data: ExamResultsSummary[]
    pagination: { ... }
  }
```

#### GET /api/tenant/cbt/results/:examId
Get results for a specific exam
```typescript
Request:
  Params: { examId: string }

Response (200):
  {
    success: boolean
    data: ExamResultsSummary
  }
```

#### GET /api/tenant/cbt/results/:examId/student/:studentId
Get detailed result for a student
```typescript
Request:
  Params: { examId: string, studentId: string }

Response (200):
  {
    success: boolean
    data: ExamResult
  }
```

#### GET /api/tenant/cbt/results/export
Export results to CSV/PDF
```typescript
Request:
  Query Parameters:
    - examId: string (required)
    - format: 'csv' | 'pdf' (default: csv)

Response (200):
  File download

Response (400/500):
  {
    success: false
    error: string
  }
```

### Security Settings API

#### GET /api/tenant/cbt/security/:examId
Get security settings for an exam
```typescript
Request:
  Params: { examId: string }

Response (200):
  {
    success: boolean
    data: SecuritySettings
  }
```

#### POST /api/tenant/cbt/security/:examId
Create/update security settings
```typescript
Request:
  Params: { examId: string }
  Body: Partial<SecuritySettings>

Response (200):
  {
    success: boolean
    data: SecuritySettings
  }

Response (400/500):
  {
    success: false
    error: string
    validationErrors?: Record<string, string>
  }
```

#### GET /api/tenant/cbt/security/:examId/logs
Get proctoring logs
```typescript
Request:
  Params: { examId: string }
  Query: {
    studentId?: string
    eventType?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }

Response (200):
  {
    success: boolean
    data: ProctoringLog[]
    pagination: { ... }
  }
```

## Real-Time Data Synchronization

### WebSocket Architecture

The system uses WebSocket connections for real-time updates during live exam monitoring:

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

### Data Consistency

- Optimistic updates on client for immediate feedback
- Server-side validation ensures data integrity
- Conflict resolution: server state is authoritative
- Audit logs track all changes for compliance

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
- Scheduled date: must be future date if provided
- Scheduled time: valid time format if provided

**Security Settings:**
- IP addresses: valid CIDR notation if provided
- Exam password: max 50 characters if provided
- Settings must be logically consistent

### Server-Side Validation

All client validations repeated on server with additional checks:
- Database constraints enforced
- Authorization verified for all operations
- Duplicate detection (e.g., duplicate questions in exam)
- Referential integrity maintained
- Business logic validation (e.g., exam can't start if no questions)

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
  requestId: "req-123456" // for debugging
}
```

### Retry Strategy

- Client retries failed requests with exponential backoff
- Maximum 3 retries with delays: 1s, 2s, 4s
- User-friendly error messages displayed
- Option to manually retry or contact support

### Logging and Monitoring

- All API errors logged with context
- Failed operations tracked for analytics
- Performance metrics collected
- Alerts triggered for critical failures

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Question Addition Round-Trip

*For any* valid question with text, type, options, and difficulty, adding it to the question bank SHALL result in the question being retrievable with identical data.

**Validates: Requirements 1.2**

### Property 2: Question Deletion Removes from Bank

*For any* question in the question bank, deleting it SHALL result in the question no longer appearing in subsequent queries of the question bank.

**Validates: Requirements 1.3**

### Property 3: Search Filters Return Only Matching Questions

*For any* search query (by subject, difficulty, or keyword) and any question bank, all returned questions SHALL match the search criteria, and no matching questions SHALL be omitted.

**Validates: Requirements 1.4**

### Property 4: Statistics Accurately Reflect Question Bank

*For any* set of questions in the bank, the displayed question count, difficulty distribution, and type breakdown SHALL exactly match the actual data in the database.

**Validates: Requirements 1.5**

### Property 5: CSV Import Preserves Question Data

*For any* valid CSV file with questions, importing it SHALL result in all valid questions being persisted to the database with identical data to the source file.

**Validates: Requirements 1.6**

### Property 6: CSV Export-Import Round-Trip

*For any* set of questions exported to CSV and then re-imported, the resulting questions SHALL be identical to the original questions (round-trip property).

**Validates: Requirements 1.7**

### Property 7: Exam Creation Persists All Details

*For any* valid exam data (title, subject, class, duration, pass mark, questions), creating an exam SHALL result in a database record containing all provided details.

**Validates: Requirements 2.1**

### Property 8: Selected Questions Are Retrievable

*For any* exam with selected questions, querying the exam SHALL return all selected questions with their correct metadata.

**Validates: Requirements 2.2**

### Property 9: Exam Validation Rejects Invalid Data

*For any* exam form with missing required fields or invalid values, validation SHALL fail and prevent submission.

**Validates: Requirements 2.3**

### Property 10: Exam Scheduling Updates Status

*For any* exam in Draft status, scheduling it SHALL change its status to Scheduled and make it available for students.

**Validates: Requirements 2.5**

### Property 11: Exam Edits Update Database

*For any* exam modification, updating the exam SHALL persist changes to the database and subsequent queries SHALL return the updated data.

**Validates: Requirements 2.6**

### Property 12: Student Progress Updates in Real-Time

*For any* student answer submission during an exam, the student's progress (questions answered, completion percentage) SHALL update within 1 second on the monitoring dashboard.

**Validates: Requirements 3.2**

### Property 13: Monitoring Display Contains All Required Fields

*For any* student in an ongoing exam, the monitoring display SHALL show student name, questions answered, time remaining, and completion percentage.

**Validates: Requirements 3.3**

### Property 14: Exam Completion Records Status and Time

*For any* student completing an exam, their status SHALL be updated to "Completed" and the completion timestamp SHALL be recorded.

**Validates: Requirements 3.4**

### Property 15: Flags Record All Details

*For any* flag action by an invigilator, the flag SHALL be recorded with timestamp, reason, and student identifier.

**Validates: Requirements 3.5**

### Property 16: Monitoring Filters Return Correct Results

*For any* filter criteria (exam, class, or status), the monitoring display SHALL show only students matching all specified criteria.

**Validates: Requirements 3.6**

### Property 17: Score Calculation Is Accurate

*For any* completed exam with student answers, the calculated score SHALL equal the sum of marks for correct answers and SHALL not exceed total marks.

**Validates: Requirements 4.2**

### Property 18: Pass/Fail Status Matches Score

*For any* exam result, the pass/fail status SHALL be "Passed" if and only if the score is greater than or equal to the pass mark.

**Validates: Requirements 4.2**

### Property 19: Analytics Calculations Are Correct

*For any* set of exam results, the displayed average score SHALL equal the mean of all student scores, and pass rate SHALL equal (passed students / total students) * 100.

**Validates: Requirements 4.3**

### Property 20: Results Filtering Returns Matching Records

*For any* filter criteria (exam, date range), the results display SHALL show only results matching all criteria.

**Validates: Requirements 4.5**

### Property 21: Results Export Contains All Data

*For any* set of exam results exported to CSV, the export SHALL include all student names, scores, and performance metrics without omission.

**Validates: Requirements 4.6**

### Property 22: Security Settings Persist Correctly

*For any* security settings configuration, saving it SHALL result in the settings being stored in the database and retrievable with identical values.

**Validates: Requirements 5.1**

### Property 23: Proctoring Events Are Logged

*For any* proctoring event (camera on/off, tab switch, copy attempt), the event SHALL be recorded with timestamp and event details.

**Validates: Requirements 5.2**

### Property 24: Camera Requirement Enforced

*For any* exam requiring camera access, the system SHALL verify camera availability before allowing exam start.

**Validates: Requirements 5.5**

### Property 25: Question Randomization Produces Different Orders

*For any* exam with question randomization enabled, different students SHALL receive questions in different orders.

**Validates: Requirements 5.6**

### Property 26: Option Randomization Shuffles Answers

*For any* exam with option randomization enabled, answer options SHALL be in different order for different students.

**Validates: Requirements 5.7**

### Property 27: IP Whitelist Validation Works Correctly

*For any* IP whitelist configuration, only student IPs matching the whitelist SHALL be allowed exam access.

**Validates: Requirements 5.8**

### Property 28: Exam Password Requirement Enforced

*For any* exam with password protection, students SHALL be required to enter the correct password before accessing the exam.

**Validates: Requirements 5.9**

### Property 29: Real-Time Monitoring Updates Without Refresh

*For any* student data change during an exam, the monitoring dashboard SHALL update within 1 second without requiring page refresh.

**Validates: Requirements 6.1**

### Property 30: Results Tab Updates Immediately

*For any* exam result submission, the Exam Results tab SHALL display the new result within 1 second.

**Validates: Requirements 6.2**

### Property 31: Question Bank Updates Immediately

*For any* question addition or deletion, the Question Bank tab SHALL reflect the change within 1 second.

**Validates: Requirements 6.3**

### Property 32: Concurrent Access Maintains Consistency

*For any* concurrent modifications by multiple invigilators to the same exam, the final state SHALL be consistent and all changes SHALL be persisted.

**Validates: Requirements 6.5**

### Property 33: API Errors Display User-Friendly Messages

*For any* API failure, the system SHALL display an appropriate error message and provide a retry option.

**Validates: Requirements 7.6**

### Property 34: Validation Occurs on Both Client and Server

*For any* data submission, validation SHALL occur on the client side for immediate feedback and on the server side before persistence.

**Validates: Requirements 7.7**

### Property 35: Invalid Data Rejected with Error Display

*For any* invalid data submission, the system SHALL display validation errors and prevent form submission.

**Validates: Requirements 8.1**

### Property 36: Database Errors Are Logged and Reported

*For any* database operation failure, the error SHALL be logged with context and a user-friendly message SHALL be displayed.

**Validates: Requirements 8.2**

### Property 37: Network Errors Allow Retry

*For any* network error, the system SHALL allow the user to retry the operation.

**Validates: Requirements 8.3**

### Property 38: Missing Required Fields Prevent Submission

*For any* form with missing required fields, the system SHALL highlight the missing fields and prevent submission.

**Validates: Requirements 8.4**

### Property 39: Duplicate Questions Trigger Warning

*For any* attempt to add a duplicate question to the bank, the system SHALL warn the user before proceeding.

**Validates: Requirements 8.5**

### Property 40: Exams Without Questions Cannot Be Scheduled

*For any* exam with no questions, the system SHALL prevent scheduling until at least one question is added.

**Validates: Requirements 8.6**

## Testing Strategy

### Property-Based Testing Approach

This feature is well-suited for property-based testing (PBT) because:
- Many acceptance criteria define universal properties that should hold for all inputs
- Input variation (different question types, exam configurations, student data) reveals edge cases
- 100+ iterations of randomized inputs will find bugs that example-based tests miss
- Core logic (validation, calculation, filtering) can be tested as pure functions

**PBT Libraries:**
- **Frontend:** fast-check (JavaScript/TypeScript)
- **Backend:** fast-check or custom generators

**Configuration:**
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Timeout: 5 seconds per test
- Shrinking enabled to find minimal failing examples

### Property-Based Tests

Each correctness property above SHALL be implemented as a property-based test with:
- Random input generation matching the property's domain
- Assertion of the property condition
- Minimum 100 iterations
- Tag format: `Feature: cbt-tabs-functionality, Property {number}: {property_text}`

**Example Property Test (Property 1: Question Addition Round-Trip):**
```typescript
import fc from 'fast-check'

describe('Question Bank - Property 1: Question Addition Round-Trip', () => {
  it('should preserve question data on add and retrieve', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 1000 }),
          type: fc.constantFrom('objective', 'truefalse', 'essay'),
          difficulty: fc.constantFrom('Easy', 'Medium', 'Hard'),
          subject: fc.string({ minLength: 1, maxLength: 100 }),
          options: fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 4 }),
          correctAnswer: fc.string({ minLength: 1, maxLength: 10 })
        }),
        async (questionData) => {
          // Add question
          const addedQuestion = await addQuestion(questionData)
          
          // Retrieve question
          const retrievedQuestion = await getQuestion(addedQuestion.id)
          
          // Verify all data matches
          expect(retrievedQuestion.text).toBe(questionData.text)
          expect(retrievedQuestion.type).toBe(questionData.type)
          expect(retrievedQuestion.difficulty).toBe(questionData.difficulty)
          expect(retrievedQuestion.subject).toBe(questionData.subject)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Unit Tests

**Question Bank Service:**
- Question creation with valid/invalid data
- Question update and deletion
- Search and filter functionality
- CSV import validation and parsing
- CSV export generation
- Duplicate detection

**Exam Service:**
- Exam creation with question validation
- Exam scheduling and status transitions
- Exam update with constraint checking
- Exam deletion and cascade behavior
- Validation of required fields

**Results Service:**
- Score calculation accuracy
- Pass/fail determination
- Analytics computation (average, pass rate)
- Result export formatting
- Filtering and sorting

**Security Service:**
- Settings validation
- IP whitelist validation (CIDR notation)
- Password strength validation
- Settings persistence and retrieval
- Proctoring log recording

**Validation Service:**
- Question text validation
- Option validation for objective questions
- Exam duration validation (15-480 minutes)
- Pass mark validation (0-100)
- Date/time validation
- Email validation for notifications

### Integration Tests

- End-to-end exam creation workflow
- Question import and exam creation
- Live monitoring data flow
- Real-time updates via WebSocket
- Results calculation and export
- Security settings application
- Concurrent exam modifications
- API error handling and retry

### Example-Based Tests

**Specific Scenarios:**
- Create exam with 20 questions, verify all questions included
- Import CSV with 100 questions, verify all imported correctly
- Start exam with 50 students, verify all progress tracked
- Complete exam, verify results calculated and stored
- Export results, verify CSV format and data accuracy
- Flag student for suspicious activity, verify flag recorded
- Modify security settings, verify applied to exam
- Filter results by date range, verify correct results returned

### Edge Cases

- Empty question bank
- Exam with no questions
- Student disconnection during exam
- Concurrent exam modifications
- Large result exports (1000+ students)
- Special characters in question text
- Timezone handling for scheduled exams
- Very long question text (1000+ characters)
- CSV with invalid format
- Duplicate questions in import
- Questions with special characters (emoji, unicode)
- Exams scheduled in the past
- Negative duration values
- Pass mark greater than total marks
- IP whitelist with invalid CIDR notation
- Exam password with special characters

### Performance Tests

- Import 1000 questions from CSV
- Export results for 500 students
- Live monitoring with 100 concurrent students
- Search across 10,000 questions
- Calculate analytics for 50 exams
- WebSocket message throughput (100 updates/second)

### Accessibility Tests

- Keyboard navigation through tabs
- Screen reader compatibility
- Color contrast for status badges
- Form labels and error messages
- Focus management in modals

### Security Tests

- SQL injection attempts in search
- XSS attempts in question text
- CSRF protection on form submissions
- Authorization checks on API endpoints
- Password hashing verification
- IP whitelist bypass attempts

### Test Coverage Goals

- Unit tests: 85% code coverage
- Integration tests: All critical workflows
- Property tests: All 40 correctness properties
- Edge cases: All identified edge cases
- Performance: All performance scenarios

### Continuous Integration

- Run all tests on every commit
- Property tests run with multiple seeds
- Performance tests run nightly
- Coverage reports generated
- Failed tests block merge to main
- Test results tracked over time

### Test Data Management

- Fixtures for common test scenarios
- Factory functions for generating test data
- Database seeding for integration tests
- Cleanup after each test
- Isolated test databases

### Monitoring and Observability

- Test execution time tracked
- Flaky test detection
- Coverage trends monitored
- Performance regression detection
- Error rate tracking

## Security Considerations

### Authentication & Authorization

- All endpoints require valid tenant context
- User role verification (invigilator/admin only)
- Exam access restricted to authorized users
- Student data access controlled by exam enrollment

### Data Protection

- Questions encrypted at rest
- Exam passwords hashed using bcrypt
- Proctoring logs encrypted
- Student answers encrypted during transmission
- GDPR compliance for student data

### Exam Integrity

- Copy/paste prevention via JavaScript
- Right-click context menu disabled
- Tab switching detection and logging
- Camera monitoring for proctored exams
- IP whitelist enforcement
- Exam password requirement

### Audit Trail

- All modifications logged with user and timestamp
- Proctoring events recorded
- Security setting changes tracked
- Result modifications audited
- Compliance reports available

## Performance Considerations

### Database Optimization

- Indexes on frequently queried columns
- Pagination for large result sets
- Query optimization for analytics
- Connection pooling for concurrent requests
- Caching for question bank searches

### Frontend Optimization

- Lazy loading of exam results
- Virtual scrolling for large student lists
- Debounced search input
- Memoized components to prevent re-renders
- Code splitting for tab components

### Real-Time Performance

- WebSocket connection pooling
- Message batching for multiple updates
- Compression for large payloads
- Graceful degradation to polling
- Rate limiting to prevent abuse

### Scalability

- Horizontal scaling of API servers
- Database read replicas for reporting
- CDN for static assets
- Message queue for async operations
- Caching layer for frequently accessed data

## Deployment and Configuration

### Environment Variables

```
CBT_DB_HOST=postgres.example.com
CBT_DB_PORT=5432
CBT_DB_NAME=cbt_database
CBT_DB_USER=cbt_user
CBT_DB_PASSWORD=***
CBT_REDIS_URL=redis://redis.example.com:6379
CBT_WS_URL=wss://api.example.com/ws
CBT_MAX_UPLOAD_SIZE=10485760 # 10MB
CBT_IMPORT_BATCH_SIZE=100
CBT_MONITORING_UPDATE_INTERVAL=1000 # ms
```

### Migration Strategy

1. Create new database tables
2. Deploy API endpoints
3. Update frontend components
4. Run data migration (if needed)
5. Enable feature flag
6. Monitor for issues
7. Rollback plan if needed

## Future Enhancements

1. **AI-Powered Question Generation** - Auto-generate questions from content
2. **Advanced Analytics** - Predictive performance analysis
3. **Mobile Support** - Native mobile exam interface
4. **Offline Mode** - Exam taking without internet
5. **Adaptive Testing** - Difficulty adjustment based on performance
6. **Integration with LMS** - Sync with learning management systems
7. **Biometric Proctoring** - Face recognition and fingerprint verification
8. **Question Difficulty Calibration** - Auto-adjust difficulty based on student performance
