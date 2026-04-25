# Timetable Management System - Design Document

## 1. System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TimetableHub (Main Container)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Sub-Tabs: Configure | Class | Teacher | Exam        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Configure   │  │ Class        │  │ Teacher          │   │
│  │ - Calendar  │  │ Timetable    │  │ Timetable        │   │
│  │ - TimeSlots │  │ - Builder    │  │ - Workload       │   │
│  │ - Breaks    │  │ - Conflicts  │  │ - Allocation     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Exam Schedule | Conflict Panel | Change Queue       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Publishing Workflow & Notifications                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │
         ├─→ API Layer (Vercel Functions)
         │   ├─ /api/tenant/timetable/calendar
         │   ├─ /api/tenant/timetable/time-slots
         │   ├─ /api/tenant/timetable/class-schedules
         │   ├─ /api/tenant/timetable/teacher-schedules
         │   ├─ /api/tenant/timetable/exam-schedules
         │   ├─ /api/tenant/timetable/conflicts
         │   ├─ /api/tenant/timetable/change-requests
         │   └─ /api/tenant/timetable/publish
         │
         └─→ Database Layer
             ├─ school_calendar
             ├─ time_slots
             ├─ class_schedules
             ├─ teacher_schedules
             ├─ exam_schedules
             ├─ conflicts
             ├─ change_requests
             └─ audit_logs
```

### Data Flow

1. **Configuration Phase**: Admin configures calendar, time slots → stored in DB
2. **Timetable Creation**: Admin creates class/teacher/exam schedules → API validates → stored in DB
3. **Conflict Detection**: System monitors for conflicts → alerts admin
4. **Change Management**: Admin submits change requests → reviewed → applied
5. **Publishing**: Admin publishes finalized schedules → notifications sent to stakeholders

---

## 2. Database Schema

### 2.1 School Calendar Tables

```sql
-- Academic terms
CREATE TABLE school_terms (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, academic_year, name),
  INDEX idx_tenant_year (tenant_id, academic_year)
);

-- Holidays
CREATE TABLE holidays (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  term_id UUID NOT NULL REFERENCES school_terms(id),
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_tenant_term (tenant_id, term_id)
);

-- Exam periods
CREATE TABLE exam_periods (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  term_id UUID NOT NULL REFERENCES school_terms(id),
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_tenant_term (tenant_id, term_id)
);
```

### 2.2 Time Slot Configuration Tables

```sql
-- Time slots
CREATE TABLE time_slots (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  day_of_week INT NOT NULL,
  is_break BOOLEAN DEFAULT FALSE,
  sequence INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, day_of_week, start_time),
  INDEX idx_tenant_day (tenant_id, day_of_week)
);
```

### 2.3 Class Timetable Tables

```sql
-- Class schedules
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  class_id UUID NOT NULL,
  term_id UUID NOT NULL REFERENCES school_terms(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, class_id, term_id),
  INDEX idx_tenant_class (tenant_id, class_id)
);

-- Class schedule entries
CREATE TABLE class_schedule_entries (
  id UUID PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES class_schedules(id),
  time_slot_id UUID NOT NULL REFERENCES time_slots(id),
  subject_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  room_id UUID,
  day_of_week INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(schedule_id, time_slot_id, day_of_week),
  INDEX idx_schedule_slot (schedule_id, time_slot_id)
);
```

### 2.4 Teacher Timetable Tables

```sql
-- Teacher schedules
CREATE TABLE teacher_schedules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  term_id UUID NOT NULL REFERENCES school_terms(id),
  total_hours INT DEFAULT 0,
  total_classes INT DEFAULT 0,
  max_hours_limit INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, teacher_id, term_id),
  INDEX idx_tenant_teacher (tenant_id, teacher_id)
);

-- Teacher workload tracking
CREATE TABLE teacher_workload (
  id UUID PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES teacher_schedules(id),
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  hours_per_week INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_schedule (schedule_id)
);
```

### 2.5 Exam Schedule Tables

```sql
-- Exam schedules
CREATE TABLE exam_schedules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  exam_period_id UUID NOT NULL REFERENCES exam_periods(id),
  subject_id UUID NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  exam_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_tenant_period (tenant_id, exam_period_id)
);

-- Exam halls
CREATE TABLE exam_halls (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_tenant (tenant_id)
);

-- Exam schedule hall assignments
CREATE TABLE exam_hall_assignments (
  id UUID PRIMARY KEY,
  exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id),
  hall_id UUID NOT NULL REFERENCES exam_halls(id),
  student_count INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_schedule_id, hall_id),
  INDEX idx_exam_hall (exam_schedule_id, hall_id)
);

-- Invigilators
CREATE TABLE invigilators (
  id UUID PRIMARY KEY,
  exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id),
  staff_id UUID NOT NULL,
  hall_id UUID NOT NULL REFERENCES exam_halls(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_exam_staff (exam_schedule_id, staff_id)
);
```

### 2.6 Conflict Tracking Tables

```sql
-- Conflicts
CREATE TABLE conflicts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  conflict_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  INDEX idx_tenant_status (tenant_id, status)
);
```

### 2.7 Change Request Tables

```sql
-- Change requests
CREATE TABLE change_requests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  change_description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reviewer_id UUID,
  review_comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  applied_at TIMESTAMP,
  INDEX idx_tenant_status (tenant_id, status)
);
```

### 2.8 Audit Log Tables

```sql
-- Audit logs
CREATE TABLE timetable_audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_tenant_user (tenant_id, user_id),
  INDEX idx_entity (entity_type, entity_id)
);
```

---

## 3. API Endpoint Specifications

### 3.1 Calendar Management Endpoints

```
GET    /api/tenant/timetable/calendar
       - Returns all terms, holidays, exam periods for tenant
       - Query params: term_id (optional), academic_year (optional)
       - Response: { terms: [], holidays: [], examPeriods: [] }

POST   /api/tenant/timetable/calendar/terms
       - Create new academic term
       - Body: { name, startDate, endDate, academicYear }
       - Response: { id, name, startDate, endDate, academicYear }

PUT    /api/tenant/timetable/calendar/terms/:id
       - Update term
       - Body: { name?, startDate?, endDate? }
       - Response: updated term object

DELETE /api/tenant/timetable/calendar/terms/:id
       - Delete term (only if no schedules exist)
       - Response: { success: true }

POST   /api/tenant/timetable/calendar/holidays
       - Create holiday
       - Body: { termId, name, startDate, endDate }
       - Response: holiday object

PUT    /api/tenant/timetable/calendar/holidays/:id
       - Update holiday
       - Response: updated holiday object

DELETE /api/tenant/timetable/calendar/holidays/:id
       - Delete holiday
       - Response: { success: true }

POST   /api/tenant/timetable/calendar/exam-periods
       - Create exam period
       - Body: { termId, name, startDate, endDate }
       - Response: exam period object

PUT    /api/tenant/timetable/calendar/exam-periods/:id
       - Update exam period
       - Response: updated exam period object

DELETE /api/tenant/timetable/calendar/exam-periods/:id
       - Delete exam period
       - Response: { success: true }
```

### 3.2 Time Slot Management Endpoints

```
GET    /api/tenant/timetable/time-slots
       - Returns all time slots for tenant
       - Query params: dayOfWeek (optional)
       - Response: { timeSlots: [] }

POST   /api/tenant/timetable/time-slots
       - Create time slot
       - Body: { name, startTime, endTime, dayOfWeek, isBreak }
       - Response: time slot object

PUT    /api/tenant/timetable/time-slots/:id
       - Update time slot
       - Response: updated time slot object

DELETE /api/tenant/timetable/time-slots/:id
       - Delete time slot
       - Response: { success: true }
```

### 3.3 Class Timetable Endpoints

```
GET    /api/tenant/timetable/class-schedules
       - Returns class schedules
       - Query params: classId, termId
       - Response: { schedules: [] }

POST   /api/tenant/timetable/class-schedules
       - Create class schedule
       - Body: { classId, termId }
       - Response: schedule object

GET    /api/tenant/timetable/class-schedules/:id
       - Get class schedule with entries
       - Response: { id, classId, termId, entries: [] }

POST   /api/tenant/timetable/class-schedules/:id/entries
       - Add entry to class schedule
       - Body: { timeSlotId, subjectId, teacherId, roomId, dayOfWeek }
       - Response: entry object

PUT    /api/tenant/timetable/class-schedules/:scheduleId/entries/:entryId
       - Update schedule entry
       - Response: updated entry object

DELETE /api/tenant/timetable/class-schedules/:scheduleId/entries/:entryId
       - Delete schedule entry
       - Response: { success: true }
```

### 3.4 Teacher Timetable Endpoints

```
GET    /api/tenant/timetable/teacher-schedules
       - Returns teacher schedules
       - Query params: teacherId, termId
       - Response: { schedules: [] }

GET    /api/tenant/timetable/teacher-schedules/:id
       - Get teacher schedule with workload
       - Response: { id, teacherId, termId, totalHours, totalClasses, workload: [] }

PUT    /api/tenant/timetable/teacher-schedules/:id
       - Update teacher workload limits
       - Body: { maxHoursLimit }
       - Response: updated schedule object
```

### 3.5 Exam Schedule Endpoints

```
GET    /api/tenant/timetable/exam-schedules
       - Returns exam schedules
       - Query params: examPeriodId, subjectId
       - Response: { schedules: [] }

POST   /api/tenant/timetable/exam-schedules
       - Create exam schedule
       - Body: { examPeriodId, subjectId, examDate, startTime, endTime, examType }
       - Response: exam schedule object

GET    /api/tenant/timetable/exam-schedules/:id
       - Get exam schedule with hall assignments and invigilators
       - Response: { id, ..., hallAssignments: [], invigilators: [] }

POST   /api/tenant/timetable/exam-schedules/:id/hall-assignments
       - Assign hall to exam
       - Body: { hallId, studentCount }
       - Response: assignment object

POST   /api/tenant/timetable/exam-schedules/:id/invigilators
       - Assign invigilator to exam
       - Body: { staffId, hallId }
       - Response: invigilator object

DELETE /api/tenant/timetable/exam-schedules/:id/invigilators/:invigilatorId
       - Remove invigilator
       - Response: { success: true }
```

### 3.6 Conflict Detection Endpoints

```
GET    /api/tenant/timetable/conflicts
       - Returns all conflicts
       - Query params: status, severity, entityType
       - Response: { conflicts: [] }

POST   /api/tenant/timetable/conflicts/:id/resolve
       - Mark conflict as resolved
       - Body: { resolutionNotes }
       - Response: updated conflict object
```

### 3.7 Change Request Endpoints

```
GET    /api/tenant/timetable/change-requests
       - Returns change requests
       - Query params: status
       - Response: { requests: [] }

POST   /api/tenant/timetable/change-requests
       - Submit change request
       - Body: { entityType, entityId, changeDescription }
       - Response: change request object

PUT    /api/tenant/timetable/change-requests/:id
       - Review/approve/reject change request
       - Body: { status, reviewComments }
       - Response: updated request object
```

### 3.8 Publishing Endpoints

```
POST   /api/tenant/timetable/publish
       - Publish schedules
       - Body: { scheduleType, scheduleIds }
       - Response: { success: true, publishedAt }

GET    /api/tenant/timetable/publish/status
       - Get publishing status
       - Response: { publishedSchedules: [], lastPublishedAt }
```

---

## 4. Component Architecture

### Component Hierarchy

```
TimetableHub
├── TimetableNavigation (Tab selector)
├── ConfigureTab
│   ├── CalendarConfiguration
│   │   ├── TermManager
│   │   ├── HolidayManager
│   │   └── ExamPeriodManager
│   └── TimeSlotConfiguration
│       ├── TimeSlotManager
│       └── BreakTimeManager
├── ClassTimetableTab
│   ├── ClassSelector
│   ├── TimetableBuilder
│   │   ├── TimeSlotGrid
│   │   └── SubjectTeacherAssigner
│   └── ClassConflictPanel
├── TeacherTimetableTab
│   ├── TeacherSelector
│   ├── TeacherScheduleView
│   └── WorkloadTracker
├── ExamScheduleTab
│   ├── ExamScheduleBuilder
│   ├── HallAssignmentPanel
│   └── InvigilatorAssignmentPanel
├── ConflictDetectionPanel (shared)
├── ChangeRequestQueue (shared)
└── PublishingWorkflow (shared)
```

### Key Components

**TimetableHub**: Main container managing tab state and shared state
**ConfigureTab**: Calendar and time slot configuration
**ClassTimetableTab**: Class schedule builder with conflict detection
**TeacherTimetableTab**: Teacher workload management
**ExamScheduleTab**: Exam schedule with hall and invigilator management
**ConflictDetectionPanel**: Displays and manages conflicts
**ChangeRequestQueue**: Manages change request workflow
**PublishingWorkflow**: Handles schedule publishing and notifications

---

## 5. State Management

### Context Structure

```typescript
interface TimetableContextType {
  // Calendar state
  terms: Term[];
  holidays: Holiday[];
  examPeriods: ExamPeriod[];
  
  // Time slot state
  timeSlots: TimeSlot[];
  
  // Schedule state
  classSchedules: ClassSchedule[];
  teacherSchedules: TeacherSchedule[];
  examSchedules: ExamSchedule[];
  
  // UI state
  activeTab: 'configure' | 'class' | 'teacher' | 'exam';
  selectedEntity: string;
  weekOffset: number;
  
  // Conflict and change state
  conflicts: Conflict[];
  changeRequests: ChangeRequest[];
  
  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedEntity: (id: string) => void;
  addTerm: (term: Term) => Promise<void>;
  updateTerm: (id: string, term: Partial<Term>) => Promise<void>;
  // ... other actions
}
```

### Caching Strategy

- Cache calendar data for entire academic year
- Cache time slots (rarely change)
- Cache class/teacher/exam schedules with 5-minute TTL
- Invalidate cache on create/update/delete operations
- Use React Query for server state management

---

## 6. Error Handling & Validation

### Input Validation Rules

- Date ranges: start_date < end_date
- Time slots: start_time < end_time, no overlaps
- Teacher workload: total hours ≤ max_hours_limit
- Hall capacity: student_count ≤ hall_capacity
- Exam dates: within exam period date range

### API Error Handling

- Retry failed requests with exponential backoff (max 3 retries)
- Display user-friendly error messages
- Log errors for debugging
- Graceful degradation (show cached data if API fails)

### Conflict Prevention

- Validate before saving to prevent conflicts
- Detect conflicts on schedule changes
- Suggest resolution options to admin

---

## 7. Security & Access Control

### Role-Based Access Control

- **Admin**: Full access to all features
- **Coordinator**: Can manage schedules, cannot configure calendar
- **Viewer**: Read-only access

### Audit Logging

- Log all create/update/delete operations
- Record user, timestamp, old/new values
- Maintain audit trail for compliance

### Data Protection

- Parameterized queries to prevent SQL injection
- Input sanitization
- CSRF tokens for state-changing operations

---

## 8. Performance Optimizations

### Lazy Loading

- Load components by tab (only load when tab is active)
- Lazy load large datasets with pagination

### Caching

- Cache calendar data (rarely changes)
- Cache time slots (rarely changes)
- Cache schedules with TTL

### Debouncing

- Debounce search/filter operations (300ms)
- Debounce form input validation

### Pagination

- Paginate conflict list (20 items per page)
- Paginate change request queue (20 items per page)

---

## 9. Correctness Properties

### Invariants

- No two terms shall overlap
- No teacher shall be assigned to overlapping time slots
- No student shall be assigned to overlapping exams
- Student count in exam ≤ hall capacity
- All exam dates within exam periods
- All class dates within term dates

### Round-Trip Properties

- Calendar saved and retrieved shall match original
- Schedule saved and retrieved shall match original
- Change request saved and retrieved shall match original

### Idempotence

- Retrieving calendar multiple times returns identical data
- Retrieving schedules multiple times returns identical data
- Conflict detection on unchanged data returns identical results

### Error Conditions

- Invalid date ranges return descriptive error
- Overlapping assignments return conflict details
- Capacity violations return capacity error
- Missing required fields return field-level errors

