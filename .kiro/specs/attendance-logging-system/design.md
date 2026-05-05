# Attendance Logging System - Design Document

## 1. System Architecture Overview

The Attendance Logging System is built on a multi-layered architecture supporting four primary attendance entry methods with real-time analytics and device management.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│ Teacher UI │ Admin UI │ Device Mgmt │ Analytics Dashboard │ Reports │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                        API Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│ Attendance Endpoints │ Device Endpoints │ Analytics Endpoints   │
│ Batch Upload │ Sync Management │ Audit Trail                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Business Logic Layer                          │
├─────────────────────────────────────────────────────────────────┤
│ Validation │ Conflict Resolution │ Sync Orchestration │ Analytics │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Data Access Layer                             │
├─────────────────────────────────────────────────────────────────┤
│ Database Queries │ Cache Management │ Audit Logging             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Data Storage Layer                            │
├─────────────────────────────────────────────────────────────────┤
│ PostgreSQL Database │ Redis Cache │ File Storage (CSV uploads)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Core Tables

#### attendance_records
```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  class VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  absence_reason_id UUID,
  source VARCHAR(50) NOT NULL CHECK (source IN ('teacher_entry', 'biometric_device', 'batch_upload', 'api_entry')),
  device_id UUID,
  user_id UUID,
  academic_session VARCHAR(20) NOT NULL,
  term VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (device_id) REFERENCES biometric_devices(id),
  FOREIGN KEY (absence_reason_id) REFERENCES absence_reasons(id),
  UNIQUE(tenant_id, student_id, date)
);

CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX idx_attendance_class_date ON attendance_records(class, date);
CREATE INDEX idx_attendance_device ON attendance_records(device_id);
CREATE INDEX idx_attendance_source ON attendance_records(source);
```

#### biometric_devices
```sql
CREATE TABLE biometric_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('fingerprint', 'face', 'iris', 'palm')),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
  sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  ip_address VARCHAR(45),
  port INTEGER CHECK (port >= 1 AND port <= 65535),
  connection_protocol VARCHAR(50) DEFAULT 'HTTPS',
  sync_frequency VARCHAR(50) DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'every_4_hours', 'daily', 'manual')),
  last_sync TIMESTAMP,
  last_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  enrolled_students_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_device_tenant ON biometric_devices(tenant_id);
CREATE INDEX idx_device_status ON biometric_devices(status);
```

#### device_enrollment
```sql
CREATE TABLE device_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  biometric_id VARCHAR(255) NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES biometric_devices(id) ON DELETE CASCADE,
  UNIQUE(device_id, student_id),
  UNIQUE(device_id, biometric_id)
);

CREATE INDEX idx_enrollment_device ON device_enrollment(device_id);
CREATE INDEX idx_enrollment_student ON device_enrollment(student_id);
```

#### device_sync_logs
```sql
CREATE TABLE device_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details TEXT,
  sync_duration_ms INTEGER,
  FOREIGN KEY (device_id) REFERENCES biometric_devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_logs_device ON device_sync_logs(device_id);
CREATE INDEX idx_sync_logs_timestamp ON device_sync_logs(sync_timestamp);
```

#### attendance_audit_trail
```sql
CREATE TABLE attendance_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_value JSONB,
  new_value JSONB,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_record ON attendance_audit_trail(attendance_record_id);
CREATE INDEX idx_audit_timestamp ON attendance_audit_trail(changed_at);
```

#### absence_reasons
```sql
CREATE TABLE absence_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reason_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, reason_name)
);
```

---

## 3. API Endpoints

### 3.1 Attendance Entry Endpoints

#### POST /api/tenant/attendance
Submit attendance records (teacher entry, batch, or API entry)

**Request:**
```json
{
  "records": [
    {
      "studentId": "STU001",
      "class": "JSS 1",
      "date": "2024-05-04",
      "status": "present",
      "absenceReasonId": null,
      "academicSession": "2024/2025",
      "term": "1"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 1,
    "message": "1 attendance records saved"
  }
}
```

**Validation:**
- Validate date is not in future
- Validate status is one of: present, absent, late
- Validate studentId exists
- Validate class exists
- Validate academicSession format
- Prevent duplicate entries (upsert strategy)

---

#### GET /api/tenant/attendance
Fetch attendance records with filtering

**Query Parameters:**
- `class` - Filter by class name
- `date` - Filter by specific date
- `startDate` - Filter by date range start
- `endDate` - Filter by date range end
- `studentId` - Filter by student
- `status` - Filter by status (present/absent/late)
- `source` - Filter by entry source
- `term` - Filter by term
- `limit` - Pagination limit (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "studentId": "STU001",
      "class": "JSS 1",
      "date": "2024-05-04",
      "status": "present",
      "source": "teacher_entry",
      "deviceId": null,
      "createdAt": "2024-05-04T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

---

#### POST /api/tenant/attendance/batch-upload
CSV file upload for bulk attendance

**Request:** Multipart form data with CSV file

**CSV Format:**
```
studentId,class,date,status,academicSession,term,absenceReason
STU001,JSS 1,2024-05-04,present,2024/2025,1,
STU002,JSS 1,2024-05-04,absent,2024/2025,1,Sick
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRecords": 100,
    "validRecords": 98,
    "invalidRecords": 2,
    "inserted": 98,
    "errors": [
      {
        "row": 5,
        "error": "Invalid status: 'maybe'"
      }
    ]
  }
}
```

---

### 3.2 Biometric Device Endpoints

#### GET /api/tenant/biometric-devices
List all registered devices

**Query Parameters:**
- `status` - Filter by device status
- `limit` - Pagination limit
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "deviceName": "Main Gate Scanner",
      "deviceType": "fingerprint",
      "manufacturer": "ZKTeco",
      "model": "MB360",
      "serialNumber": "ZK123456",
      "location": "Main Gate",
      "status": "active",
      "syncStatus": "synced",
      "lastSync": "2024-05-04T10:30:00Z",
      "enrolledStudentsCount": 450,
      "attendanceCount": 1250
    }
  ]
}
```

---

#### POST /api/tenant/biometric-devices
Register new biometric device

**Request:**
```json
{
  "deviceName": "Main Gate Scanner",
  "deviceType": "fingerprint",
  "manufacturer": "ZKTeco",
  "model": "MB360",
  "serialNumber": "ZK123456",
  "location": "Main Gate",
  "ipAddress": "192.168.1.100",
  "port": 8080,
  "connectionProtocol": "HTTPS",
  "syncFrequency": "hourly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "deviceName": "Main Gate Scanner",
    "status": "inactive",
    "message": "Device registered successfully. Status: inactive until first sync."
  }
}
```

---

#### PUT /api/tenant/biometric-devices/{deviceId}
Update device configuration

**Request:**
```json
{
  "ipAddress": "192.168.1.101",
  "port": 8081,
  "syncFrequency": "every_4_hours"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Device configuration updated"
  }
}
```

---

#### POST /api/tenant/biometric-devices/{deviceId}/test-connection
Test device connectivity

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "deviceInfo": {
      "model": "MB360",
      "firmwareVersion": "1.2.3",
      "enrolledUsers": 450
    },
    "message": "Connection successful"
  }
}
```

---

#### POST /api/tenant/biometric-devices/{deviceId}/sync
Trigger manual device sync

**Response:**
```json
{
  "success": true,
  "data": {
    "syncId": "uuid",
    "status": "in_progress",
    "message": "Sync initiated"
  }
}
```

---

#### GET /api/tenant/biometric-devices/{deviceId}/sync-logs
View device sync history

**Query Parameters:**
- `limit` - Number of logs to return (default: 20)
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "syncTimestamp": "2024-05-04T10:30:00Z",
      "status": "success",
      "recordsSynced": 45,
      "recordsFailed": 0,
      "syncDurationMs": 2500
    }
  ]
}
```

---

### 3.3 Analytics Endpoints

#### GET /api/tenant/attendance/analytics/dashboard
Summary statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "presentRate": 92.5,
    "absentRate": 5.2,
    "lateRate": 2.3,
    "totalRecords": 1250,
    "dataFreshness": "2024-05-04T10:30:00Z"
  }
}
```

---

#### GET /api/tenant/attendance/analytics/heatmap
Weekly attendance heatmap

**Query Parameters:**
- `weeks` - Number of weeks to return (default: 4)
- `class` - Filter by class

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "week": "2024-W18",
      "presentPct": 92,
      "absentPct": 5,
      "latePct": 3,
      "total": 450
    }
  ]
}
```

---

#### GET /api/tenant/attendance/analytics/at-risk-students
At-risk student list (attendance < 85%)

**Query Parameters:**
- `class` - Filter by class
- `reason` - Filter by reason (Absence/Late)
- `limit` - Pagination limit
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "studentId": "STU001",
      "name": "John Doe",
      "class": "JSS 1",
      "attendance": "78%",
      "reason": "Absence",
      "absenceCount": 8,
      "lateCount": 2,
      "owner": "Class Advisor"
    }
  ]
}
```

---

#### GET /api/tenant/attendance/analytics/homeroom-leaderboard
Class performance ranking

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "homeroom": "JSS 1",
      "rate": 94,
      "studentCount": 45,
      "presentCount": 42
    }
  ]
}
```

---

### 3.4 Audit Trail Endpoints

#### GET /api/tenant/attendance/audit-trail
View audit trail records

**Query Parameters:**
- `studentId` - Filter by student
- `startDate` - Filter by date range
- `endDate` - Filter by date range
- `action` - Filter by action (create/update/delete)
- `limit` - Pagination limit
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "attendanceRecordId": "uuid",
      "action": "update",
      "oldValue": { "status": "absent" },
      "newValue": { "status": "present" },
      "changedBy": "teacher-uuid",
      "changedAt": "2024-05-04T10:30:00Z"
    }
  ]
}
```

---

## 4. Frontend Components

### 4.1 Teacher Attendance Entry Component

**File:** `src/components/pages/staff/TeacherAttendanceEntry.tsx`

**Features:**
- Display list of students in teacher's homeroom
- Quick status selection (Present/Absent/Late)
- Absence reason dropdown for absences
- Bulk actions (Mark all present, Mark all absent)
- Confirmation dialog before submission
- Success/error notifications
- Date picker for historical entry

**State Management:**
```typescript
interface AttendanceEntryState {
  selectedDate: Date
  records: AttendanceRecord[]
  loading: boolean
  error: string | null
  submitted: boolean
}
```

---

### 4.2 Biometric Device Management Component

**File:** `src/components/pages/integrations/BiometricDeviceManagement.tsx`

**Features:**
- Device registration form
- Device list with status indicators
- Device configuration editor
- Connection test button
- Sync status monitoring
- Device enrollment management
- Error log viewer

---

### 4.3 Analytics Dashboard Component

**File:** `src/components/pages/StudentAttendance.tsx` (enhanced)

**Features:**
- Summary statistics cards
- Weekly attendance heatmap
- At-risk students table
- Homeroom leaderboard
- Filters (class, date range, status)
- Export to CSV/PDF
- Real-time data refresh

---

## 5. Data Flow Diagrams

### 5.1 Teacher Entry Flow

```
Teacher UI
    ↓
Select Date & Students
    ↓
Mark Attendance Status
    ↓
Review Confirmation Dialog
    ↓
Submit
    ↓
API: POST /api/tenant/attendance
    ↓
Validation Layer
  - Check date not in future
  - Validate status values
  - Check student exists
  - Prevent duplicates
    ↓
Business Logic Layer
  - Conflict resolution (most recent wins)
  - Create audit trail entry
    ↓
Database Layer
  - Insert/Update attendance_records
  - Insert attendance_audit_trail
    ↓
Response: Success/Error
    ↓
Teacher Dashboard Updated
```

---

### 5.2 Biometric Device Sync Flow

```
Scheduled Sync Trigger (or Manual)
    ↓
Device Connection
  - Resolve IP address
  - Establish connection
  - Authenticate device
    ↓
Retrieve Unsynced Records
  - Query device for new records
  - Validate data format
    ↓
Biometric ID Mapping
  - Look up device_enrollment table
  - Map biometric_id → student_id
    ↓
Validation
  - Check date not in future
  - Validate status values
  - Identify unmatched records
    ↓
Conflict Resolution
  - Check for existing records
  - Apply most-recent-wins strategy
    ↓
Database Insert/Update
  - Insert attendance_records
  - Insert device_sync_logs
  - Update device status
    ↓
Error Handling
  - If sync fails: Retry with exponential backoff
  - If 3 consecutive failures: Set device status to error
    ↓
Notification
  - Update device sync_status
  - Alert admin if errors
```

---

### 5.3 Batch Upload Flow

```
Admin UI
    ↓
Select CSV File
    ↓
File Upload
    ↓
API: POST /api/tenant/attendance/batch-upload
    ↓
CSV Parsing
  - Parse file
  - Extract records
    ↓
Validation
  - Validate each record
  - Check required fields
  - Validate date, status, student, class
    ↓
Error Reporting
  - Collect validation errors
  - Display error summary
    ↓
User Confirmation
  - Show valid/invalid counts
  - Allow user to proceed or cancel
    ↓
Insert Valid Records
  - Batch insert to database
  - Create audit trail entries
    ↓
Response
  - Summary of inserted records
  - List of errors
```

---

## 6. Security & Access Control

### 6.1 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| Teacher | Enter attendance for own class, view own class analytics |
| Admin | Full access to all attendance, device management, reports |
| Super Admin | System-wide configuration, multi-tenant management |

### 6.2 Data Validation

All inputs validated at API layer:
- Date validation (not in future)
- Status validation (present/absent/late)
- Student ID validation (exists in database)
- Class validation (exists in database)
- Academic session format validation
- Term validation

### 6.3 Audit Trail

All changes logged with:
- User ID (who made the change)
- Timestamp (when)
- Action (create/update/delete)
- Old and new values
- Source (teacher_entry/biometric_device/batch_upload/api_entry)

---

## 7. Error Handling & Retry Logic

### 7.1 Device Sync Retry Strategy

```
Attempt 1: Immediate
  ↓ (if fails)
Wait 1 minute
  ↓
Attempt 2
  ↓ (if fails)
Wait 5 minutes
  ↓
Attempt 3
  ↓ (if fails)
Wait 15 minutes
  ↓
Attempt 4
  ↓ (if fails)
Wait 1 hour
  ↓
Attempt 5
  ↓ (if fails)
Set device status to ERROR
Alert administrator
```

### 7.2 Error Handling Strategy

| Error Type | Handling |
|-----------|----------|
| Connection timeout | Retry with exponential backoff |
| Invalid data | Log error, skip record, continue |
| Duplicate record | Update existing record |
| Device not found | Log error, alert admin |
| Authentication failure | Log error, set device to error status |

---

## 8. Performance Considerations

### 8.1 Database Indexing

```sql
-- Attendance queries
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX idx_attendance_class_date ON attendance_records(class, date);
CREATE INDEX idx_attendance_device ON attendance_records(device_id);
CREATE INDEX idx_attendance_source ON attendance_records(source);

-- Device queries
CREATE INDEX idx_device_tenant ON biometric_devices(tenant_id);
CREATE INDEX idx_device_status ON biometric_devices(status);

-- Audit queries
CREATE INDEX idx_audit_record ON attendance_audit_trail(attendance_record_id);
CREATE INDEX idx_audit_timestamp ON attendance_audit_trail(changed_at);
```

### 8.2 Caching Strategy

- Cache analytics results (heatmap, leaderboard, at-risk list) for 1 hour
- Invalidate cache on new attendance entry
- Use Redis for session-based caching
- Cache device enrollment mappings

### 8.3 Pagination

- Default limit: 100 records
- Maximum limit: 1000 records
- Offset-based pagination for large datasets

---

## 9. Integration Points

### 9.1 Biometric Device Integration

**Protocol:** HTTPS REST API

**Device Endpoints:**
- `GET /api/device/records` - Retrieve unsynced records
- `POST /api/device/enrollment` - Enroll student
- `GET /api/device/status` - Get device status

**Authentication:** API Key or Certificate-based

---

### 9.2 Notification System Integration

**Events:**
- At-risk student flagged → Send guardian notification
- Device sync failed → Alert admin
- Bulk absence recorded → Send notifications

**Integration Point:** `api/tenant/notifications.ts`

---

## 10. Deployment & Configuration

### 10.1 Environment Variables

```
ATTENDANCE_DB_HOST=localhost
ATTENDANCE_DB_PORT=5432
ATTENDANCE_DB_NAME=attendance_db
ATTENDANCE_CACHE_TTL=3600
DEVICE_SYNC_TIMEOUT=30000
DEVICE_RETRY_MAX_ATTEMPTS=5
ATTENDANCE_BATCH_SIZE=100
```

### 10.2 Database Migrations

Run migrations on deployment:
```bash
npm run migrate:attendance
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

- Validation logic
- Conflict resolution
- Retry logic
- Analytics calculations

### 11.2 Integration Tests

- API endpoint tests
- Database transaction tests
- Device sync workflow tests
- Batch upload tests

### 11.3 End-to-End Tests

- Complete teacher entry flow
- Complete device sync flow
- Complete batch upload flow
- Analytics accuracy

---

## 12. Implementation Phases

### Phase 1: Core Attendance Entry
- Teacher attendance entry UI
- API endpoints for attendance submission
- Database schema
- Basic validation

### Phase 2: Analytics & Reporting
- Dashboard statistics
- Heatmap visualization
- At-risk student detection
- Homeroom leaderboard

### Phase 3: Biometric Integration
- Device management UI
- Device sync workflow
- Enrollment mapping
- Sync monitoring

### Phase 4: Advanced Features
- Batch upload
- Audit trail UI
- Guardian notifications
- Advanced reporting

---

## 13. Assumptions & Constraints

### Assumptions
- Students have unique IDs in the system
- Classes are pre-defined in the system
- Academic sessions follow format: YYYY/YYYY
- Terms are numbered 1-3
- Biometric devices support HTTPS REST API

### Constraints
- Attendance cannot be recorded for future dates
- One attendance record per student per date
- Device sync requires network connectivity
- Batch upload limited to 10,000 records per file

