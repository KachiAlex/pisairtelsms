# Design Document: Tenant Dashboard Gaps

## Overview

The tenant admin dashboard currently lacks live data integration, has framework compliance issues in API handlers, uses hardcoded mock data for critical features, and has type inconsistencies across the codebase. This design document outlines the architecture and implementation strategy to close all identified gaps and make the dashboard production-ready.

The solution involves:
1. **Database schema** for student scores, fee records, staff, attendance, and announcements
2. **API endpoints** for results, finance, staff, attendance, communication, and promotion rules
3. **Framework compliance** fixes for Vercel handlers (ca-config.ts, lead.ts)
4. **Component refactoring** to use live data instead of mocks
5. **Authentication layer** with route guards and token management
6. **Type consolidation** to eliminate Student type duplication
7. **Data flow** from database through APIs to React components

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Dashboard | StudentPromotion | StudentEnrollment | etc.  │   │
│  │ (consume live data from APIs)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Functions (API Layer)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ /api/tenant/integrated-dashboard (aggregator)            │   │
│  │ /api/tenant/results (student scores)                     │   │
│  │ /api/tenant/finance (fee records & transactions)         │   │
│  │ /api/tenant/staff (staff records)                        │   │
│  │ /api/tenant/attendance (attendance records)              │   │
│  │ /api/tenant/communication (announcements)                │   │
│  │ /api/tenant/promotion-rules (promotion thresholds)       │   │
│  │ /api/tenant/ca-config (CA weights) [FIXED]              │   │
│  │ /api/tenant/lead (inquiry leads) [FIXED]                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Vercel Postgres Database                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ student_scores | fee_records | staff | attendance_records│   │
│  │ announcements | promotion_rules | ca_config | leads      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
User Login
    ↓
POST /api/tenant/login (or super-admin equivalent)
    ↓
Validate credentials
    ↓
Issue JWT/opaque token + tenantId
    ↓
Store in localStorage: { token, tenantId, expiresAt }
    ↓
Auth Guard checks token on route navigation
    ↓
If valid: allow access to /tenant or /super-admin
If invalid/expired: redirect to /login
```

### Data Flow: Dashboard Example

```
Dashboard Component Mounts
    ↓
useEffect: fetch('/api/tenant/integrated-dashboard')
    ↓
Integrated Dashboard API:
  - Calls /api/tenant/students
  - Calls /api/tenant/teacher-workloads
  - Calls /api/tenant/exam-assignments
  - Calls /api/tenant/student-progress
  - Aggregates into DashboardStats
    ↓
Return DashboardStats to frontend
    ↓
Dashboard renders:
  - Stats grid (totalStudents, totalTeachers, etc.)
  - Enrollment trend chart (Recharts LineChart)
  - Fee collection pie chart (Recharts PieChart)
  - Academic performance bar chart (Recharts BarChart)
  - Capacity utilization panel
  - Operational queues
  - Compliance signals
```

---

## Components and Interfaces

### Frontend Components

#### Dashboard.tsx
- **Purpose**: Main landing page displaying school-wide KPIs and operational overview
- **Data Source**: `/api/tenant/integrated-dashboard`
- **State Management**: 
  - `dashboardStats` (DashboardStats)
  - `loading` (boolean)
  - `error` (string | null)
  - `selectedSection` (string) for retry logic
- **Key Features**:
  - Loading skeleton for each section
  - Inline error messages with retry buttons
  - Empty-state messages for zero-data sections
  - Recharts visualizations (LineChart, PieChart, BarChart)
  - Real-time data refresh on mount

#### StudentPromotion.tsx
- **Purpose**: Manage student promotion/demotion between classes
- **Data Sources**: 
  - `/api/tenant/students` (student list)
  - `/api/tenant/results` (scores & attendance)
  - `/api/tenant/promotion-rules` (thresholds)
- **State Management**:
  - `students` (Student[])
  - `promotionRecords` (PromotionRecord[])
  - `promotionRules` (PromotionRule[])
  - `selectedStudents` (Set<string>)
  - `bulkWizardStep` (1 | 2 | 3)
- **Key Changes**:
  - Remove `mockStudentsWithPerformance` array
  - Fetch real scores from Results API
  - Compute `averageScore` and `attendance` from fetched data
  - Apply real promotion rules from Promotion_Rules_API

#### StudentEnrollment.tsx
- **Purpose**: Kanban-style enrollment pipeline tracking
- **Data Sources**:
  - `/api/tenant/applications` (application records)
  - `/api/tenant/leads` (inquiry leads)
- **State Management**:
  - `applications` (Application[])
  - `leads` (Lead[])
  - `pipeline` (PipelineColumn[])
- **Key Changes**:
  - Fetch applications from Applications_API
  - Map application statuses to pipeline stages
  - Display real application counts in column badges
  - Remove localStorage as primary data source

#### FinanceManagement.tsx
- **Purpose**: Fee management and payment tracking
- **Data Source**: `/api/tenant/finance`
- **State Management**:
  - `feeRecords` (FeeRecord[])
  - `totalExpected` (number)
  - `totalCollected` (number)
  - `totalOutstanding` (number)
- **Key Changes**:
  - Replace `mockFeeRecords` with fetched data
  - Compute totals from real data
  - Display error state with retry option

#### StaffHR.tsx
- **Purpose**: Staff management and HR operations
- **Data Source**: `/api/tenant/staff`
- **State Management**:
  - `staffRecords` (Staff[])
  - `totalStaff` (number)
  - `openRoles` (number)
  - `departmentDistribution` (Record<string, number>)
- **Key Changes**:
  - Fetch real staff records
  - Compute statistics from fetched data

#### StudentAttendance.tsx
- **Purpose**: Daily attendance tracking
- **Data Source**: `/api/tenant/attendance`
- **State Management**:
  - `attendanceRecords` (AttendanceRecord[])
  - `selectedClass` (string)
  - `selectedDate` (Date)
- **Key Changes**:
  - Fetch attendance records for selected class and date range
  - Display real attendance data

#### CommunicationHub.tsx
- **Purpose**: Announcements and bulk notifications
- **Data Source**: `/api/tenant/communication`
- **State Management**:
  - `announcements` (Announcement[])
  - `draftAnnouncement` (Announcement | null)
- **Key Changes**:
  - Fetch announcements from Communication API
  - Optimistically add new announcements to list
  - Display announcement history

### API Endpoints

#### GET /api/tenant/integrated-dashboard
**Purpose**: Aggregate dashboard data from multiple sources

**Response**:
```typescript
interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalExams: number
  activeExams: number
  classesCount: number
  recentActivity: Array<{
    type: string
    message: string
    timestamp: string
  }>
  classSummaries: Array<{
    className: string
    studentCount: number
    teacherCount: number
    examCount: number
  }>
  systemHealth: {
    studentsApi: boolean
    teachersApi: boolean
    examsApi: boolean
    database: boolean
  }
}
```

#### GET /api/tenant/results
**Purpose**: Retrieve student scores and attendance

**Query Parameters**:
- `studentId` (optional): Filter by student
- `academicSession` (optional): e.g., "2024/2025"
- `term` (optional): e.g., "Third Term"

**Response**:
```typescript
interface StudentScore {
  id: string
  student_id: string
  subject: string
  academic_session: string
  term: string
  ca_score: number (0-100)
  exam_score: number (0-100)
  total_score: number
  attendance_percentage: number (0-100)
  class: string
  created_at: string
  updated_at: string
}
```

#### POST /api/tenant/results
**Purpose**: Create or update student scores

**Request Body**:
```typescript
interface ScorePayload {
  student_id: string
  subject: string
  academic_session: string
  term: string
  ca_score: number
  exam_score: number
  attendance_percentage: number
  class: string
}
```

**Validation**:
- `ca_score` and `exam_score` must be 0-100
- `attendance_percentage` must be 0-100
- All required fields must be present

#### GET /api/tenant/finance
**Purpose**: Retrieve fee records for current session/term

**Query Parameters**:
- `academicSession` (optional)
- `term` (optional)
- `class` (optional)

**Response**:
```typescript
interface FeeRecord {
  id: string
  student_id: string
  student_name: string
  admission_no: string
  class: string
  fee_type: string
  amount: number
  paid: number
  balance: number
  status: 'pending' | 'partial' | 'paid'
  last_payment_date: string | null
  academic_session: string
  term: string
  created_at: string
  updated_at: string
}
```

#### POST /api/tenant/finance
**Purpose**: Record a payment transaction

**Request Body**:
```typescript
interface PaymentPayload {
  fee_record_id: string
  amount_paid: number
  payment_method: string
  transaction_ref: string
}
```

#### GET /api/tenant/staff
**Purpose**: Retrieve staff records

**Query Parameters**:
- `department` (optional): Filter by department
- `status` (optional): Filter by status

**Response**:
```typescript
interface Staff {
  id: string
  name: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on_leave'
  email: string
  phone: string
  hire_date: string
  created_at: string
  updated_at: string
}
```

#### POST /api/tenant/staff
**Purpose**: Create a new staff record

**Request Body**:
```typescript
interface StaffPayload {
  name: string
  role: string
  department: string
  email: string
  phone: string
  hire_date: string
}
```

#### GET /api/tenant/attendance
**Purpose**: Retrieve attendance records

**Query Parameters**:
- `class` (required): Class name
- `date` (optional): Specific date (YYYY-MM-DD)
- `term` (optional): Academic term
- `startDate` (optional): Date range start
- `endDate` (optional): Date range end

**Response**:
```typescript
interface AttendanceRecord {
  id: string
  student_id: string
  class: string
  date: string
  status: 'present' | 'absent' | 'late'
  academic_session: string
  term: string
  created_at: string
}
```

#### POST /api/tenant/attendance
**Purpose**: Batch upsert attendance records

**Request Body**:
```typescript
interface AttendancePayload {
  records: Array<{
    student_id: string
    class: string
    date: string
    status: 'present' | 'absent' | 'late'
    academic_session: string
    term: string
  }>
}
```

**Validation**:
- `date` must not be in the future
- All required fields must be present

#### GET /api/tenant/communication
**Purpose**: Retrieve announcements

**Query Parameters**:
- `audience` (optional): Filter by audience
- `status` (optional): Filter by status (draft | sent)

**Response**:
```typescript
interface Announcement {
  id: string
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents'
  sent_by: string
  sent_at: string | null
  status: 'draft' | 'sent'
  created_at: string
}
```

#### POST /api/tenant/communication
**Purpose**: Create a new announcement

**Request Body**:
```typescript
interface AnnouncementPayload {
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents'
  status: 'draft' | 'sent'
}
```

#### GET /api/tenant/promotion-rules
**Purpose**: Retrieve promotion rules for the tenant

**Response**:
```typescript
interface PromotionRule {
  id: string
  tenant_id: string
  level: string (e.g., "Primary", "JSS", "SS")
  promotion_threshold: number (e.g., 50)
  repeat_threshold: number (e.g., 40)
  review_threshold: number (e.g., 45)
  attendance_threshold: number (e.g., 75)
  active: boolean
  created_at: string
  updated_at: string
}
```

#### PUT /api/tenant/promotion-rules/:id
**Purpose**: Update a promotion rule

**Request Body**:
```typescript
interface PromotionRulePayload {
  promotion_threshold?: number
  repeat_threshold?: number
  review_threshold?: number
  attendance_threshold?: number
  active?: boolean
}
```

---

## Database Schemas

### student_scores Table
```sql
CREATE TABLE student_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject VARCHAR(100) NOT NULL,
  academic_session VARCHAR(20) NOT NULL,
  term VARCHAR(50) NOT NULL,
  ca_score NUMERIC(5,2) NOT NULL CHECK (ca_score >= 0 AND ca_score <= 100),
  exam_score NUMERIC(5,2) NOT NULL CHECK (exam_score >= 0 AND exam_score <= 100),
  total_score NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  attendance_percentage NUMERIC(5,2) NOT NULL CHECK (attendance_percentage >= 0 AND attendance_percentage <= 100),
  class VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, subject, academic_session, term)
);

CREATE INDEX idx_student_scores_student_id ON student_scores(student_id);
CREATE INDEX idx_student_scores_session_term ON student_scores(academic_session, term);
CREATE INDEX idx_student_scores_class ON student_scores(class);
```

### fee_records Table
```sql
CREATE TABLE fee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  admission_no VARCHAR(50) NOT NULL,
  class VARCHAR(50) NOT NULL,
  fee_type VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (amount - paid) STORED,
  status VARCHAR(20) DEFAULT 'pending',
  last_payment_date TIMESTAMP,
  academic_session VARCHAR(20) NOT NULL,
  term VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fee_records_student_id ON fee_records(student_id);
CREATE INDEX idx_fee_records_session_term ON fee_records(academic_session, term);
CREATE INDEX idx_fee_records_class ON fee_records(class);
```

### staff Table
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  email VARCHAR(255),
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_department ON staff(department);
CREATE INDEX idx_staff_status ON staff(status);
```

### attendance_records Table
```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  academic_session VARCHAR(20) NOT NULL,
  term VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, date)
);

CREATE INDEX idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX idx_attendance_class_date ON attendance_records(class, date);
CREATE INDEX idx_attendance_session_term ON attendance_records(academic_session, term);
```

### announcements Table
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(20) NOT NULL CHECK (audience IN ('all', 'students', 'staff', 'parents')),
  sent_by VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_sent_at ON announcements(sent_at);
```

### promotion_rules Table
```sql
CREATE TABLE promotion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  level VARCHAR(50) NOT NULL,
  promotion_threshold NUMERIC(5,2) NOT NULL,
  repeat_threshold NUMERIC(5,2) NOT NULL,
  review_threshold NUMERIC(5,2) NOT NULL,
  attendance_threshold NUMERIC(5,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, level)
);

CREATE INDEX idx_promotion_rules_tenant ON promotion_rules(tenant_id);
```

---

## Type Consolidation Strategy

### Current State
- `Student` type defined in `src/types.ts`
- `Student` type re-defined in `src/lib/studentsClient.ts`
- `Student` DB type in `api/tenant/_lib/students.ts` (snake_case fields)

### Target State
- **Canonical frontend type**: `src/types.ts` (camelCase, frontend-focused)
- **Client re-export**: `src/lib/studentsClient.ts` imports and re-exports from `src/types.ts`
- **API DB type**: `api/tenant/_lib/students.ts` defines separate internal DB type (snake_case)

### Canonical Student Type (src/types.ts)
```typescript
export interface Student {
  id: string
  admissionNo: string
  name: string
  class: string
  arm: string
  gender: string
  status: 'Active' | 'Suspended' | 'Graduated'
  guardian: string
  phone: string
  created_at?: string
  updated_at?: string
}
```

### Client Re-export (src/lib/studentsClient.ts)
```typescript
export { Student } from '../types'
export type { Student as StudentType }
```

### API DB Type (api/tenant/_lib/students.ts)
```typescript
// Internal DB type - separate from frontend type
interface StudentRow {
  id: string
  admission_no: string
  name: string
  class: string
  arm: string
  gender: string
  status: string
  guardian: string
  phone: string
  created_at: string
  updated_at: string
}

// Conversion function
function rowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    admissionNo: row.admission_no,
    name: row.name,
    class: row.class,
    arm: row.arm,
    gender: row.gender,
    status: row.status as 'Active' | 'Suspended' | 'Graduated',
    guardian: row.guardian,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
```

---

## Authentication and Route Guards

### Auth Token Structure
```typescript
interface AuthToken {
  sub: string // user ID
  tenantId: string
  role: 'tenant_admin' | 'super_admin' | 'teacher' | 'staff'
  iat: number // issued at
  exp: number // expiration
}
```

### Storage Format
```typescript
interface AuthStorage {
  token: string // JWT or opaque token
  tenantId: string
  expiresAt: number // timestamp
}
```

### Auth Guard Component
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'tenant_admin' | 'super_admin'
  redirectTo?: string
}

function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }: ProtectedRouteProps) {
  const { token, tenantId } = useAuth()
  
  if (!token || isTokenExpired(token)) {
    return <Navigate to={redirectTo} />
  }
  
  if (requiredRole && !hasRole(token, requiredRole)) {
    return <Navigate to="/unauthorized" />
  }
  
  return children
}
```

### TenantContext Initialization
```typescript
interface TenantContextType {
  tenantId: string | null
  tenantName: string | null
  loading: boolean
}

function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Initialize from localStorage only if valid token exists
    const auth = getAuthFromStorage()
    if (auth && !isTokenExpired(auth.token)) {
      setTenantId(auth.tenantId)
      // Optionally fetch tenant name from API
      fetchTenantName(auth.tenantId).then(setTenantName)
    }
    setLoading(false)
  }, [])
  
  return (
    <TenantContext.Provider value={{ tenantId, tenantName, loading }}>
      {children}
    </TenantContext.Provider>
  )
}
```

---

## Error Handling Patterns

### API Error Response Format
```typescript
interface ApiErrorResponse {
  error: string
  code: string
  details?: Record<string, string>
  timestamp: string
}
```

### Component Error Handling
```typescript
function Dashboard() {
  const [error, setError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})
  
  const handleSectionError = (section: string, error: string) => {
    setSectionErrors(prev => ({ ...prev, [section]: error }))
  }
  
  const handleRetry = (section: string) => {
    setSectionErrors(prev => {
      const updated = { ...prev }
      delete updated[section]
      return updated
    })
    // Re-fetch section data
  }
  
  return (
    <>
      {sectionErrors.stats && (
        <ErrorBanner
          message={sectionErrors.stats}
          onRetry={() => handleRetry('stats')}
        />
      )}
    </>
  )
}
```

### API Handler Error Handling
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Handler logic
  } catch (error) {
    console.error('API error:', error)
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details,
        timestamp: new Date().toISOString()
      })
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'Resource not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      })
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    })
  }
}
```

---

## Loading States

### Skeleton Loading Pattern
```typescript
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Progressive Loading
```typescript
function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  
  useEffect(() => {
    // Load stats first
    fetchStats().then(data => {
      setStats(data)
      setStatsLoading(false)
    })
    
    // Load charts in parallel
    fetchCharts().then(() => setChartsLoading(false))
  }, [])
  
  return (
    <>
      {statsLoading ? <StatsSkeleton /> : <StatsGrid stats={stats} />}
      {chartsLoading ? <ChartsSkeleton /> : <Charts stats={stats} />}
    </>
  )
}
```

---

## Testing Strategy

### Unit Tests
- **Student type consolidation**: Verify canonical type is used across all imports
- **API response parsing**: Verify API responses are correctly parsed and typed
- **Error handling**: Verify error messages are displayed correctly
- **Loading states**: Verify loading skeletons render during data fetch
- **Empty states**: Verify empty-state messages render when data is empty

### Integration Tests
- **Dashboard data flow**: Verify dashboard fetches and displays data correctly
- **StudentPromotion data flow**: Verify promotion component uses real data
- **StudentEnrollment data flow**: Verify enrollment pipeline uses real applications
- **Finance data flow**: Verify finance page displays real fee records
- **Authentication flow**: Verify login/logout and route guards work correctly

### API Tests
- **Results API**: Verify score creation, retrieval, and validation
- **Finance API**: Verify fee record retrieval and payment recording
- **Staff API**: Verify staff record CRUD operations
- **Attendance API**: Verify attendance record batch upsert
- **Communication API**: Verify announcement creation and retrieval
- **Promotion Rules API**: Verify rule retrieval and updates

### Property-Based Testing Applicability

This feature involves:
- **Pure functions**: Data transformation, validation, type conversion
- **API handlers**: Request/response parsing, business logic
- **Database operations**: CRUD operations with constraints
- **Component logic**: State management, data aggregation

**PBT is NOT applicable** for:
- **Infrastructure**: Database schema creation, API deployment
- **UI rendering**: Component rendering, layout, styling
- **External services**: Vercel Postgres behavior, authentication service

**Recommendation**: Use example-based unit tests and integration tests for this feature. Property-based testing would be valuable for:
- Score validation logic (ca_score + exam_score = total_score)
- Promotion rule application (given scores and rules, compute correct action)
- Data transformation functions (DB row → frontend type)

---

## Implementation Phases

### Phase 1: Framework Compliance & Type Consolidation
1. Fix ca-config.ts to use `@vercel/node` imports
2. Fix lead.ts to use `@vercel/node` imports
3. Consolidate Student type in src/types.ts
4. Update studentsClient.ts to re-export from types.ts
5. Update API DB types to use separate internal types

### Phase 2: Database & API Endpoints
1. Create student_scores table
2. Create fee_records table
3. Create staff table
4. Create attendance_records table
5. Create announcements table
6. Create promotion_rules table
7. Implement Results API
8. Implement Finance API
9. Implement Staff API
10. Implement Attendance API
11. Implement Communication API
12. Implement Promotion Rules API

### Phase 3: Authentication & Route Guards
1. Implement Auth Guard component
2. Update TenantContext to initialize from token
3. Add route protection to /tenant and /super-admin
4. Implement logout functionality
5. Add token expiration handling

### Phase 4: Component Refactoring
1. Update Dashboard to use integrated-dashboard API
2. Update StudentPromotion to use real data
3. Update StudentEnrollment to use real applications
4. Update FinanceManagement to use Finance API
5. Update StaffHR to use Staff API
6. Update StudentAttendance to use Attendance API
7. Update CommunicationHub to use Communication API

### Phase 5: Testing & Validation
1. Write unit tests for all components
2. Write integration tests for data flows
3. Write API tests for all endpoints
4. Verify type safety across codebase
5. Performance testing and optimization



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Dashboard Data Aggregation

*For any* valid set of student, teacher, exam, and progress data from upstream APIs, the Integrated Dashboard API SHALL aggregate them into a single DashboardStats object with correct totals and summaries.

**Validates: Requirements 1.5**

### Property 2: Dashboard Section Rendering

*For any* valid DashboardStats object, the Dashboard component SHALL render all sections (stats grid, charts, queues, signals) with the correct data values from the stats object.

**Validates: Requirements 1.1, 1.6**

### Property 3: Empty State Display

*For any* DashboardStats object where a section contains empty or zero data, the Dashboard component SHALL display a contextual empty-state message for that section rather than rendering blank content.

**Validates: Requirements 1.4**

### Property 4: CA Config Weight Validation

*For any* CA weight configuration update, if the sum of weights for any school level does not equal 100, the CA_Config_API SHALL reject the request with HTTP status 400.

**Validates: Requirements 2.4**

### Property 5: Lead Creation Validation

*For any* lead payload, if any required field (studentName, parentName, contactPhone, contactEmail) is missing, the Lead_API SHALL reject the request with HTTP status 400 and include field-level error details.

**Validates: Requirements 2.6**

### Property 6: Lead Persistence Round Trip

*For any* valid lead payload with all required fields, the Lead_API SHALL persist the lead and return it with HTTP status 201, and subsequent retrieval SHALL return the same data.

**Validates: Requirements 2.5**

### Property 7: Score Total Computation

*For any* score payload with ca_score and exam_score values, the Results_API SHALL compute total_score as the sum of ca_score and exam_score before persisting.

**Validates: Requirements 3.5**

### Property 8: Score Validation

*For any* score payload where ca_score or exam_score is outside the range 0–100, the Results_API SHALL reject the request with HTTP status 400.

**Validates: Requirements 3.6**

### Property 9: Score Query Filtering

*For any* set of score records and any combination of studentId, academicSession, and term query parameters, the Results_API SHALL return only records matching all specified parameters.

**Validates: Requirements 3.3**

### Property 10: StudentPromotion Data Derivation

*For any* set of score records for a student, the StudentPromotion component SHALL derive averageScore and attendance from the fetched data, not from any hardcoded values.

**Validates: Requirements 4.2**

### Property 11: Promotion Rule Application

*For any* student with scores and attendance data, and any set of promotion rules, the StudentPromotion component SHALL apply the rules to compute a recommended action (promote, repeat, review, or hold).

**Validates: Requirements 4.5**

### Property 12: Enrollment Pipeline Status Mapping

*For any* set of applications with various status values, the StudentEnrollment component SHALL correctly map each application status to its corresponding pipeline stage (pending → Application, reviewing → Review, approved → Offer, rejected → excluded).

**Validates: Requirements 6.2**

### Property 13: Enrollment Pipeline Distribution

*For any* set of applications, the StudentEnrollment component SHALL distribute them into pipeline columns based on their status field, and the count in each column badge SHALL equal the number of applications in that stage.

**Validates: Requirements 6.1, 6.4**

### Property 14: Finance Total Computation

*For any* set of fee records, the FinanceManagement component SHALL compute totalExpected, totalCollected, and totalOutstanding from the fetched data such that totalExpected = totalCollected + totalOutstanding.

**Validates: Requirements 8.6**

### Property 15: Payment Balance Update

*For any* fee record and any payment amount, the Finance_API SHALL update the paid and balance fields such that balance = amount - paid.

**Validates: Requirements 8.4**

### Property 16: Staff Ordering

*For any* set of staff records, the Staff_API SHALL return them ordered by hire_date in descending order (most recent first).

**Validates: Requirements 9.3**

### Property 17: Staff Statistics Computation

*For any* set of staff records, the StaffHR component SHALL compute total staff count, open roles count, and department distribution from the fetched data.

**Validates: Requirements 9.6**

### Property 18: Attendance Query Filtering

*For any* set of attendance records and any combination of class, date, and term query parameters, the Attendance_API SHALL return only records matching all specified parameters.

**Validates: Requirements 10.3**

### Property 19: Attendance Batch Upsert

*For any* batch of attendance records for a class and date, the Attendance_API SHALL upsert all records and return the count of records saved.

**Validates: Requirements 10.4**

### Property 20: Attendance Future Date Validation

*For any* attendance record with a date in the future, the Attendance_API SHALL reject the request with HTTP status 400.

**Validates: Requirements 10.6**

### Property 21: Announcement Ordering

*For any* set of announcements, the Communication_API SHALL return them ordered by sent_at in descending order (most recent first).

**Validates: Requirements 11.3**

### Property 22: Announcement Persistence Round Trip

*For any* valid announcement payload, the Communication_API SHALL persist the announcement and return it with HTTP status 201, and subsequent retrieval SHALL return the same data.

**Validates: Requirements 11.4**

### Property 23: Promotion Rule Retrieval

*For any* tenant, the Promotion_Rules_API SHALL return all active and inactive promotion rules for that tenant.

**Validates: Requirements 5.2**

### Property 24: Promotion Rule Update

*For any* promotion rule with a valid id and updated fields, the Promotion_Rules_API SHALL update the rule and return the updated record.

**Validates: Requirements 5.3**

