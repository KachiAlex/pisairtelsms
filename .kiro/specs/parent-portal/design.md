# Parents Portal Design

## Overview

The Parents Portal is a comprehensive engagement platform enabling parents and guardians to monitor their children's academic progress, attendance, behavioral conduct, and school communications. It integrates with existing ScholarX systems to provide real-time access to student information while maintaining strict data privacy and security.

## Architecture

### High-Level Design

```
Parent Login (role='parent' JWT)
    ↓
ParentLayout (validates role via RoleBasedRoute)
    ↓
Page Component (Dashboard, Academic, Attendance, etc.)
    ↓
API Call with parentId and childId filter from JWT
    ↓
Backend validates parentId and childId match token
    ↓
Return filtered data (reuse existing _lib functions)
    ↓
Render component
```

### Component Structure

```
ParentLayout
├── Sidebar (navigation)
├── Header (parent name, child selector, logout, notifications)
└── Main Content Area
    ├── ParentDashboard
    ├── AcademicProgress
    ├── AttendanceTracking
    ├── BehavioralReports
    ├── Communications
    ├── TeacherMessages
    ├── FeeManagement
    ├── Timetable
    ├── HealthWellness
    ├── Notifications
    └── Profile
```

### Data Flow

1. Parent logs in with credentials
2. Backend validates and returns JWT token with `role: 'parent'`, `parentId`, and linked `childrenIds`
3. Token stored in localStorage via `setAuthInStorage`
4. ParentLayout validates role via RoleBasedRoute
5. Parent selects a child (or default to first child)
6. Page components make API calls to `/api/parent/*` endpoints with childId
7. Backend extracts `parentId` and `childId` from JWT token
8. Backend validates parent-child relationship
9. Backend filters all queries by `childId` using existing `_lib` functions
10. Backend returns only data belonging to authenticated parent's child
11. Frontend renders filtered data

## Components and Interfaces

### ParentLayout Component

Multi-child aware layout with child selector in header:

```typescript
interface ParentLayoutProps {
  children?: React.ReactNode
}

Navigation Items:
- Dashboard (LayoutDashboard icon)
- Academic Progress (BookOpen icon)
- Attendance (CalendarCheck icon)
- Behavioral Reports (AlertCircle icon)
- Communications (MessageSquare icon)
- Teacher Messages (Mail icon)
- Fee Management (CreditCard icon)
- Timetable (Clock icon)
- Health & Wellness (Heart icon)
- Notifications (Bell icon)
- Profile (User icon)
```

Features:
- Child selector dropdown in header (shows all linked children)
- Responsive sidebar (collapsible on mobile)
- Header with parent name, selected child, and logout
- Notification bell icon with unread count
- Active page highlighting
- Lazy-loaded page components
- Multi-child context provider

### ParentDashboard Component

Landing page showing key information for selected child:

```typescript
interface ParentDashboardData {
  parent: {
    id: string
    name: string
    email: string
  }
  child: {
    id: string
    name: string
    admissionNumber: string
    class: string
    arm: string
  }
  metrics: {
    attendancePercent: number
    gpa: number
    outstandingFees: number
    nextExamDate: string
  }
  recentGrades: GradeEntry[]
  recentAnnouncements: Announcement[]
  upcomingEvents: Event[]
  alerts: Alert[]
}

interface GradeEntry {
  id: string
  subject: string
  score: number
  date: string
}

interface Alert {
  id: string
  type: 'attendance' | 'behavioral' | 'academic' | 'fees'
  message: string
  severity: 'info' | 'warning' | 'critical'
  date: string
}
```

Sections:
- Child info card (name, admission number, class)
- Key metrics cards (attendance %, GPA, outstanding fees, next exam)
- Recent grades (5 items with subject, score, date)
- Recent announcements (5 items with title, date, preview)
- Upcoming events (5 items with date, title, description)
- Active alerts (color-coded by severity)
- Loading skeletons for each section
- Error states with retry buttons

### AcademicProgress Component

Displays child's academic performance and progress:

```typescript
interface AcademicProgressData {
  currentTerm: string
  availableTerms: Term[]
  subjects: SubjectPerformance[]
  overallGPA: number
  classAverage: number
  performanceTrend: TrendData[]
  upcomingAssessments: Assessment[]
}

interface SubjectPerformance {
  id: string
  subject: string
  caScore: number
  examScore: number
  totalScore: number
  grade: string
  classAverage: number
  teacherFeedback: string
  trend: 'up' | 'down' | 'stable'
}

interface Assessment {
  id: string
  subject: string
  type: string
  date: string
  weightage: number
}

interface TrendData {
  term: string
  gpa: number
  date: string
}
```

Features:
- Term selector dropdown
- Subject performance table (CA, exam, total, grade, feedback)
- Overall GPA and class average comparison
- Performance trend chart (line graph over terms)
- Upcoming assessments section with weightage
- Subject-wise breakdown with teacher feedback
- Download report button
- Empty state if no grades available

### AttendanceTracking Component

Monitors child's attendance patterns:

```typescript
interface AttendanceTrackingData {
  attendancePercent: number
  totalPresent: number
  totalAbsent: number
  totalLate: number
  records: AttendanceRecord[]
  trend: AttendanceTrendData[]
  absenceReasons: AbsenceReason[]
}

interface AttendanceRecord {
  id: string
  date: string
  status: 'present' | 'absent' | 'late'
  subject: string
  reason?: string
}

interface AttendanceTrendData {
  week: string
  percent: number
}

interface AbsenceReason {
  date: string
  reason: string
  approvedBy?: string
}
```

Features:
- Attendance percentage with visual indicator
- Statistics cards (present, absent, late counts)
- Attendance records list (date, status, subject, reason)
- Attendance trend chart (weekly percentage)
- Filter by date range
- Highlight low attendance warnings
- Absence reasons with approval status
- Download attendance report button
- Empty state if no records

### BehavioralReports Component

Displays conduct grades and incident reports:

```typescript
interface BehavioralReportsData {
  conductGrade: string
  conductTrend: TrendEntry[]
  incidents: IncidentReport[]
  positiveRecognition: Recognition[]
  teacherComments: TeacherComment[]
}

interface IncidentReport {
  id: string
  date: string
  type: string
  description: string
  severity: 'minor' | 'moderate' | 'serious'
  action: string
  reportedBy: string
}

interface Recognition {
  id: string
  date: string
  type: string
  description: string
  awardedBy: string
}

interface TeacherComment {
  id: string
  teacher: string
  subject: string
  comment: string
  date: string
}
```

Features:
- Current conduct grade with visual indicator
- Conduct trend over time
- Incident reports list (date, type, severity, action)
- Positive recognition section (awards, achievements)
- Teacher comments on conduct
- Severity color-coding (green/yellow/red)
- Filter by date range
- Notification badge for new incidents
- Empty state if no incidents

### Communications Component

School announcements and notifications:

```typescript
interface CommunicationsData {
  announcements: Announcement[]
  categories: string[]
  unreadCount: number
}

interface Announcement {
  id: string
  title: string
  body: string
  category: string
  date: string
  author: string
  attachments: Attachment[]
  isRead: boolean
}

interface Attachment {
  id: string
  name: string
  url: string
  type: string
}
```

Features:
- Announcements list with date, title, category
- Search and filter by category
- Mark as read/unread toggle
- Full announcement view with attachments
- Pagination (10 per page)
- Unread indicator badge
- Download attachment button
- Empty state if no announcements

### TeacherMessages Component

Direct communication with teachers:

```typescript
interface TeacherMessagesData {
  conversations: Conversation[]
  availableTeachers: Teacher[]
}

interface Conversation {
  id: string
  teacher: Teacher
  subject: string
  lastMessage: string
  lastMessageDate: string
  isRead: boolean
  messageCount: number
  messages: Message[]
}

interface Message {
  id: string
  sender: string
  senderRole: 'parent' | 'teacher'
  body: string
  date: string
  attachments: Attachment[]
}

interface Teacher {
  id: string
  name: string
  subject: string
  email: string
}
```

Features:
- Conversation list with teacher, subject, last message, date
- New conversation button (select teacher)
- Message thread view with full history
- Send message form with text and file attachment
- Timestamp and delivery confirmation
- Unread message indicator
- Search conversations
- Empty state if no conversations

### FeeManagement Component

Fee tracking and payment management:

```typescript
interface FeeManagementData {
  summary: FeeSummary
  feeStructure: FeeItem[]
  paymentHistory: Payment[]
  paymentPlans: PaymentPlan[]
  exemptions: Exemption[]
}

interface FeeSummary {
  totalFees: number
  paidAmount: number
  outstandingBalance: number
  dueDate: string
  status: 'paid' | 'partial' | 'overdue'
}

interface FeeItem {
  id: string
  name: string
  amount: number
  dueDate: string
  status: 'paid' | 'pending' | 'overdue'
}

interface Payment {
  id: string
  date: string
  amount: number
  method: string
  reference: string
  receiptUrl: string
  status: 'completed' | 'pending' | 'failed'
}

interface PaymentPlan {
  id: string
  startDate: string
  endDate: string
  installments: Installment[]
}

interface Installment {
  id: string
  dueDate: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  paidDate?: string
}

interface Exemption {
  id: string
  type: string
  amount: number
  reason: string
  approvedDate: string
}
```

Features:
- Fee summary card (total, paid, outstanding, due date)
- Fee structure breakdown by item
- Payment history table (date, amount, method, receipt)
- Payment plans section with installment tracking
- Exemptions and discounts applied
- Online payment button (if enabled)
- Download receipt button per payment
- Overdue amount highlighting
- Payment reminders section
- Empty state if no fees

### Timetable Component

Class schedule and exam dates:

```typescript
interface TimetableData {
  schedule: ScheduleEntry[]
  examSchedule: ExamEntry[]
  currentTerm: string
  availableTerms: Term[]
  holidays: Holiday[]
}

interface ScheduleEntry {
  id: string
  dayOfWeek: number (0-6)
  timeSlot: string
  subject: string
  teacher: string
  room: string
  startTime: string
  endTime: string
}

interface ExamEntry {
  id: string
  subject: string
  date: string
  time: string
  room: string
  duration: number
  invigilator: string
}

interface Holiday {
  id: string
  name: string
  startDate: string
  endDate: string
}
```

Features:
- Weekly grid view (Mon-Fri columns, time slots rows)
- Current day highlighted
- Term selector dropdown
- Separate exam schedule section
- Holiday dates marked
- Download timetable button (PDF/iCal)
- Export to calendar functionality
- Empty state if no schedule

### HealthWellness Component

Health records and wellness information:

```typescript
interface HealthWellnessData {
  medicalHistory: MedicalRecord[]
  vaccinations: Vaccination[]
  allergies: Allergy[]
  emergencyContacts: EmergencyContact[]
  healthInitiatives: HealthInitiative[]
}

interface MedicalRecord {
  id: string
  date: string
  type: string
  description: string
  recordedBy: string
}

interface Vaccination {
  id: string
  name: string
  date: string
  nextDueDate?: string
  status: 'completed' | 'pending' | 'overdue'
}

interface Allergy {
  id: string
  allergen: string
  severity: 'mild' | 'moderate' | 'severe'
  reaction: string
}

interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  email?: string
}

interface HealthInitiative {
  id: string
  name: string
  description: string
  date: string
  type: string
}
```

Features:
- Medical history records
- Vaccination status with due dates
- Allergies and medical conditions
- Emergency contact information
- Health initiatives and wellness programs
- Vaccination reminders
- Download health summary button
- Empty state if no health records

### Notifications Component

Centralized notification management:

```typescript
interface NotificationsData {
  notifications: Notification[]
  unreadCount: number
  preferences: NotificationPreferences
}

interface Notification {
  id: string
  type: 'academic' | 'attendance' | 'behavioral' | 'fees' | 'communication' | 'health'
  title: string
  message: string
  date: string
  isRead: boolean
  actionUrl?: string
}

interface NotificationPreferences {
  emailNotifications: boolean
  inAppNotifications: boolean
  smsNotifications: boolean
  notificationTypes: {
    academic: boolean
    attendance: boolean
    behavioral: boolean
    fees: boolean
    communication: boolean
    health: boolean
  }
}
```

Features:
- Notifications list sorted by date (newest first)
- Filter by type (academic, attendance, behavioral, fees, etc.)
- Mark as read/unread toggle
- Mark all as read button
- Notification preferences section
- Email/SMS/in-app notification toggles
- Per-type notification toggles
- Delete notification button
- Empty state if no notifications

### Profile Component

Parent profile management:

```typescript
interface ParentProfile {
  id: string
  name: string
  email: string
  phone: string
  address: string
  linkedChildren: LinkedChild[]
}

interface LinkedChild {
  id: string
  name: string
  admissionNumber: string
  class: string
}

interface ProfileUpdate {
  email?: string
  phone?: string
  address?: string
}

interface PasswordChange {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
```

Features:
- Display parent profile information
- Edit form for email, phone, address
- Password change form with validation
- Linked children list (read-only)
- Add/remove child functionality
- Email format validation
- Password confirmation validation
- Current password verification
- Success/error messages
- Account security section

## Data Models

### Database Schema

No new tables required. Parent Portal reuses existing tables:

- `parents` - Parent/guardian records (new table or extend users)
- `parent_children` - Parent-child relationships (new junction table)
- `students` - Student records (existing)
- `grades` - Student grades (existing)
- `attendance` - Student attendance (existing)
- `behavioral_incidents` - Incident reports (existing)
- `announcements` - School announcements (existing)
- `messages` - Direct messages (existing)
- `fees` - Fee records (existing)
- `payments` - Payment records (existing)
- `timetable_class_schedules` - Class schedules (existing)
- `timetable_exam_schedules` - Exam schedules (existing)
- `health_records` - Medical information (existing)
- `notifications` - Notification records (new table)

### API Layer Filtering

All queries filtered by `parentId` and `childId` extracted from JWT token:

```typescript
// Example: Get child's grades
const { parentId, childId } = extractParentInfoFromJWT(req)
const grades = await fetchGradesByStudentId(childId)
// Backend ensures parent-child relationship is valid
// Backend ensures only records with matching childId are returned
```

## API Endpoint Design

### 20 Parent-Specific Endpoints

All endpoints require valid JWT token with `role: 'parent'` and extract `parentId` and `childId` from token.

#### 1. Dashboard
```
GET /api/parent/dashboard?childId=child-123
Response: {
  parent: { id, name, email },
  child: { id, name, admissionNumber, class, arm },
  metrics: { attendancePercent, gpa, outstandingFees, nextExamDate },
  recentGrades: [{ id, subject, score, date }],
  recentAnnouncements: [{ id, title, date, preview }],
  upcomingEvents: [{ id, date, title, description }],
  alerts: [{ id, type, message, severity, date }]
}
```

#### 2. Academic Progress
```
GET /api/parent/academic?childId=child-123&termId=term-123
Response: {
  currentTerm: string,
  availableTerms: [{ id, name }],
  subjects: [{ id, subject, caScore, examScore, totalScore, grade, classAverage, teacherFeedback, trend }],
  overallGPA: number,
  classAverage: number,
  performanceTrend: [{ term, gpa, date }],
  upcomingAssessments: [{ id, subject, type, date, weightage }]
}
```

#### 3. Attendance
```
GET /api/parent/attendance?childId=child-123&startDate=2024-01-01&endDate=2024-12-31
Response: {
  attendancePercent: number,
  totalPresent: number,
  totalAbsent: number,
  totalLate: number,
  records: [{ id, date, status, subject, reason }],
  trend: [{ week, percent }],
  absenceReasons: [{ date, reason, approvedBy }]
}
```

#### 4. Behavioral Reports
```
GET /api/parent/behavioral?childId=child-123
Response: {
  conductGrade: string,
  conductTrend: [{ term, grade, date }],
  incidents: [{ id, date, type, description, severity, action, reportedBy }],
  positiveRecognition: [{ id, date, type, description, awardedBy }],
  teacherComments: [{ id, teacher, subject, comment, date }]
}
```

#### 5. Announcements
```
GET /api/parent/announcements?limit=10&category=academic
Response: {
  announcements: [{ id, title, body, category, date, author, attachments, isRead }],
  categories: [string],
  unreadCount: number
}
```

#### 6. Mark Announcement as Read
```
PUT /api/parent/announcements/:announcementId/read
Response: {
  id, isRead: true
}
```

#### 7. Teacher Messages - List Conversations
```
GET /api/parent/messages?childId=child-123&limit=20
Response: {
  conversations: [{ id, teacher: { id, name, subject, email }, subject, lastMessage, lastMessageDate, isRead, messageCount }],
  availableTeachers: [{ id, name, subject, email }]
}
```

#### 8. Teacher Messages - Get Conversation
```
GET /api/parent/messages/:conversationId?childId=child-123
Response: {
  id, teacher: { id, name, subject, email }, subject,
  messages: [{ id, sender, senderRole, body, date, attachments }]
}
```

#### 9. Teacher Messages - Send Message
```
POST /api/parent/messages
Body: {
  childId: string,
  teacherId: string,
  subject: string,
  body: string,
  attachments?: [{ name, url }]
}
Response: {
  id, sender, senderRole, body, date, attachments
}
```

#### 10. Teacher Messages - Mark as Read
```
PUT /api/parent/messages/:conversationId/read
Response: {
  id, isRead: true
}
```

#### 11. Fees Summary
```
GET /api/parent/fees?childId=child-123
Response: {
  summary: { totalFees, paidAmount, outstandingBalance, dueDate, status },
  feeStructure: [{ id, name, amount, dueDate, status }],
  paymentHistory: [{ id, date, amount, method, reference, receiptUrl, status }],
  paymentPlans: [{ id, startDate, endDate, installments: [...] }],
  exemptions: [{ id, type, amount, reason, approvedDate }]
}
```

#### 12. Timetable
```
GET /api/parent/timetable?childId=child-123&termId=term-123
Response: {
  schedule: [{ id, dayOfWeek, timeSlot, subject, teacher, room, startTime, endTime }],
  examSchedule: [{ id, subject, date, time, room, duration, invigilator }],
  currentTerm: string,
  availableTerms: [{ id, name }],
  holidays: [{ id, name, startDate, endDate }]
}
```

#### 13. Health & Wellness
```
GET /api/parent/health?childId=child-123
Response: {
  medicalHistory: [{ id, date, type, description, recordedBy }],
  vaccinations: [{ id, name, date, nextDueDate, status }],
  allergies: [{ id, allergen, severity, reaction }],
  emergencyContacts: [{ id, name, relationship, phone, email }],
  healthInitiatives: [{ id, name, description, date, type }]
}
```

#### 14. Notifications
```
GET /api/parent/notifications?limit=20&type=academic
Response: {
  notifications: [{ id, type, title, message, date, isRead, actionUrl }],
  unreadCount: number
}
```

#### 15. Mark Notification as Read
```
PUT /api/parent/notifications/:notificationId/read
Response: {
  id, isRead: true
}
```

#### 16. Notification Preferences
```
GET /api/parent/notification-preferences
Response: {
  emailNotifications: boolean,
  inAppNotifications: boolean,
  smsNotifications: boolean,
  notificationTypes: { academic, attendance, behavioral, fees, communication, health }
}

PUT /api/parent/notification-preferences
Body: {
  emailNotifications?: boolean,
  inAppNotifications?: boolean,
  smsNotifications?: boolean,
  notificationTypes?: { academic, attendance, behavioral, fees, communication, health }
}
Response: { same as GET }
```

#### 17. Profile
```
GET /api/parent/profile
Response: {
  id, name, email, phone, address,
  linkedChildren: [{ id, name, admissionNumber, class }]
}

PUT /api/parent/profile
Body: { email?, phone?, address? }
Response: { id, name, email, phone, address, linkedChildren }

POST /api/parent/change-password
Body: { currentPassword, newPassword }
Response: { success: true }
```

#### 18. Linked Children
```
GET /api/parent/children
Response: {
  children: [{ id, name, admissionNumber, class, arm }]
}
```

#### 19. Add Child to Account
```
POST /api/parent/children
Body: { childAdmissionNumber: string, relationship: string }
Response: { id, name, admissionNumber, class, arm }
```

#### 20. Remove Child from Account
```
DELETE /api/parent/children/:childId
Response: { success: true }
```

## Security Model

### Authentication

- JWT token required on all requests
- Token includes `parentId`, `childrenIds`, and `role: 'parent'`
- Token expires after 24 hours
- Invalid/missing token returns HTTP 401
- Refresh token mechanism for extended sessions

### Authorization

- Backend extracts `parentId` and `childId` from JWT token
- Backend validates parent-child relationship before returning data
- Parent cannot access other parents' data
- Parent cannot access children not linked to their account
- Attempting cross-access returns HTTP 403
- All queries filtered by both `parentId` and `childId`

### Data Isolation

```typescript
// Example: Fetch child's grades
const { parentId, childId } = extractParentInfoFromJWT(req)
if (!parentId || !childId) return res.status(401).json({ error: 'Unauthorized' })

// Verify parent-child relationship
const isValidRelationship = await verifyParentChildRelationship(parentId, childId)
if (!isValidRelationship) return res.status(403).json({ error: 'Forbidden' })

const grades = await fetchGradesByStudentId(childId)
// Backend ensures only records with matching childId are returned
```

### Validation

- Email format validation
- Password confirmation validation
- Required field validation
- Child admission number validation
- Date range validation

## Performance Considerations

### Caching

- Dashboard data: 5 minutes (frequently accessed)
- Academic progress: 1 hour (updates within 1 hour per requirements)
- Attendance: 30 minutes (updates within 30 minutes per requirements)
- Behavioral reports: 1 hour
- Announcements: 30 minutes
- Timetable: 1 day (changes only on term change)
- Health records: 1 hour
- Fees: 1 hour (updates within 1 hour per requirements)

### Lazy Loading

- Load announcements and messages on demand
- Paginate message list (20 per page)
- Paginate notification list (20 per page)
- Lazy load PDF downloads
- Lazy load attachments

### Pagination

- Dashboard: 5 grades, 5 announcements, 5 events
- Messages: 20 per page
- Notifications: 20 per page
- Announcements: 10 per page
- Attendance records: 50 per page

### Query Optimization

- Index on `parentId` for all queries
- Index on `childId` for all queries
- Index on `date` for attendance and behavioral queries
- Index on `status` for fee queries
- Reuse existing `_lib` functions (already optimized)

## Error Handling

### HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad request (validation error)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (cross-access attempt or invalid parent-child relationship)
- 404: Not found
- 405: Method not allowed
- 409: Conflict (e.g., duplicate child link)
- 500: Server error

### Error Messages

```typescript
// Validation error
{ error: 'Validation failed', details: { field: 'message' } }

// Authentication error
{ error: 'Unauthorized: Invalid or missing token' }

// Authorization error
{ error: 'Forbidden: Cannot access this resource' }

// Invalid parent-child relationship
{ error: 'Forbidden: Child not linked to your account' }

// Not found
{ error: 'Resource not found' }

// Server error
{ error: 'Failed to fetch data' }
```

### Frontend Error Handling

- Display error message with icon
- Show retry button for failed sections
- Preserve unsaved data on error
- Log errors to monitoring service
- Disable submit button while processing
- Show connection error for network failures

### Loading States

- Skeleton loaders for all data sections
- Animated pulse effect
- "Loading..." text
- Disable interactive elements while loading

## Notification System Design

### Notification Types

1. **Academic Alerts**
   - New grades posted
   - Low performance warning
   - Upcoming assessments
   - Teacher feedback available

2. **Attendance Alerts**
   - Absence recorded
   - Low attendance warning (below 75%)
   - Late arrival recorded

3. **Behavioral Alerts**
   - Incident reported
   - Positive recognition awarded
   - Conduct grade updated

4. **Fee Alerts**
   - Payment due reminder
   - Overdue payment alert
   - Payment received confirmation
   - Payment plan installment due

5. **Communication Alerts**
   - New announcement
   - New message from teacher
   - School event notification

6. **Health Alerts**
   - Vaccination due
   - Medical record updated
   - Health initiative notification

### Notification Delivery

- In-app notifications (real-time)
- Email notifications (configurable)
- SMS notifications (optional, configurable)
- Push notifications (if mobile app)

### Notification Preferences

- Per-type notification toggles
- Delivery method preferences (email, SMS, in-app)
- Quiet hours configuration
- Notification frequency settings

## Integration Points with Existing Systems

### Student Management System
- Fetch student information (name, admission number, class)
- Fetch parent-child relationships
- Validate student enrollment

### Grades/Results System
- Fetch student grades and marks
- Fetch subject performance data
- Fetch class averages
- Fetch teacher feedback

### Attendance System
- Fetch attendance records
- Fetch attendance percentages
- Fetch absence reasons
- Fetch attendance trends

### Behavioral System
- Fetch incident reports
- Fetch conduct grades
- Fetch positive recognition
- Fetch teacher comments

### Communication System
- Fetch announcements
- Fetch messages
- Send messages to teachers
- Track message read status

### Fees Management System
- Fetch fee structure
- Fetch payment history
- Fetch outstanding balance
- Fetch payment plans
- Fetch exemptions

### Timetable System
- Fetch class schedules
- Fetch exam schedules
- Fetch holidays
- Fetch term dates

### Health System
- Fetch medical records
- Fetch vaccination records
- Fetch allergies
- Fetch emergency contacts

## Testing Strategy

### Unit Tests

- Component rendering with mock data
- Data formatting and calculations
- Validation logic (email, dates, passwords)
- Error state rendering
- Loading state rendering
- Child selector functionality
- Notification filtering

### Integration Tests

- API calls with real backend
- Authentication flow (login, token storage, logout)
- Authorization (parent can only access own children's data)
- Parent-child relationship validation
- Data filtering by parentId and childId
- Cross-access prevention (403 on unauthorized access)
- Multi-child switching

### Property-Based Tests

- See Correctness Properties section below

### E2E Tests

- Complete login flow
- Navigate through all pages
- Switch between children
- View academic progress and verify data
- Check attendance and verify filtering
- View behavioral reports
- Read announcements and mark as read
- Send message to teacher
- View fees and payment history
- Update profile and verify changes
- Configure notification preferences
- Token expiration and re-login

### Security Tests

- Attempt to access another parent's data (should fail with 403)
- Attempt to access child not linked to account (should fail with 403)
- Attempt to update another parent's profile (should fail with 403)
- Token expiration handling
- Invalid token rejection
- Rate limiting verification
- SQL injection prevention
- XSS prevention in message content

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid credentials grant access

*For any* parent with valid login credentials, the authentication system SHALL return a JWT token containing `role: 'parent'`, `parentId`, and `childrenIds`.

**Validates: Requirements 1.1**

### Property 2: Invalid credentials are rejected

*For any* invalid login credentials (wrong email or password), the authentication system SHALL reject the login and return an error response.

**Validates: Requirements 1.2**

### Property 3: Unauthenticated access redirects to login

*For any* unauthenticated user attempting to access a parent portal route, the system SHALL redirect to `/parent/login`.

**Validates: Requirements 1.4**

### Property 4: Logout clears auth data

*For any* parent clicking the logout button, the system SHALL clear all auth data from localStorage and redirect to `/parent/login`.

**Validates: Requirements 1.5**

### Property 5: Session expires after 30 minutes of inactivity

*For any* parent session inactive for 30 minutes, the system SHALL automatically log them out and redirect to `/parent/login`.

**Validates: Requirements 1.7**

### Property 6: Child selector displays all linked children

*For any* parent with multiple linked children, the child selector dropdown SHALL display all linked children's names and admission numbers.

**Validates: Requirements 2.1**

### Property 7: Selecting child filters all data

*For any* parent selecting a child from the selector, all displayed data on the current page SHALL update to show only that child's information.

**Validates: Requirements 2.2**

### Property 8: Switching children updates all sections

*For any* parent switching between children, all dashboard sections (grades, attendance, fees, etc.) SHALL update to reflect the newly selected child's data.

**Validates: Requirements 2.3**

### Property 9: Multi-child dashboard shows all metrics

*For any* parent with multiple children, the dashboard summary view SHALL display key metrics (attendance, GPA, fees) for all linked children.

**Validates: Requirements 2.4**

### Property 10: Parent-child relationship verified on add

*For any* attempt to add a child to a parent's account, the system SHALL verify the parent-child relationship before granting access.

**Validates: Requirements 2.6**

### Property 11: Academic progress displays current term grades

*For any* parent viewing the academic progress section, the page SHALL display all grades and marks for the currently selected term.

**Validates: Requirements 3.1**

### Property 12: Academic progress shows historical data

*For any* parent viewing the academic progress section, the page SHALL allow selecting previous terms and display historical performance data.

**Validates: Requirements 3.2**

### Property 13: Academic progress shows subject breakdown

*For any* parent viewing the academic progress section, the page SHALL display subject-wise performance with CA scores, exam scores, and total scores.

**Validates: Requirements 3.3**

### Property 14: Grades update within 1 hour

*For any* grade updated in the results management system, the parent portal SHALL reflect the change within 1 hour.

**Validates: Requirements 3.4**

### Property 15: Academic progress displays trends

*For any* parent viewing the academic progress section, the page SHALL display performance trends over multiple terms and comparison to class average.

**Validates: Requirements 3.5**

### Property 16: Attendance displays daily records

*For any* parent viewing the attendance section, the page SHALL display daily attendance records for the current term with date, status, and subject.

**Validates: Requirements 4.1**

### Property 17: Attendance displays percentage

*For any* parent viewing the attendance section, the page SHALL display the overall attendance percentage calculated from all records.

**Validates: Requirements 4.2**

### Property 18: Attendance shows absence reasons

*For any* parent viewing the attendance section, the page SHALL display absence reasons and dates for all recorded absences.

**Validates: Requirements 4.3**

### Property 19: Attendance updates within 30 minutes

*For any* attendance marked in the attendance system, the parent portal SHALL reflect the change within 30 minutes.

**Validates: Requirements 4.4**

### Property 20: Low attendance triggers notification

*For any* student whose attendance falls below 75%, the system SHALL send a notification to the parent.

**Validates: Requirements 4.6**

### Property 21: Behavioral reports display conduct grade

*For any* parent viewing the behavioral reports section, the page SHALL display the current conduct grade for the selected child.

**Validates: Requirements 5.1**

### Property 22: Behavioral reports display incidents

*For any* parent viewing the behavioral reports section, the page SHALL display all incident reports with date, type, severity, and action taken.

**Validates: Requirements 5.2**

### Property 23: Behavioral reports show recognition

*For any* parent viewing the behavioral reports section, the page SHALL display positive behavior recognition and awards.

**Validates: Requirements 5.3**

### Property 24: Incident notification sent within 2 hours

*For any* incident recorded in the behavioral system, the parent portal SHALL send a notification to the parent within 2 hours.

**Validates: Requirements 5.4**

### Property 25: Serious incident triggers immediate notification

*For any* serious incident recorded, the system SHALL send an immediate notification to the parent.

**Validates: Requirements 5.7**

### Property 26: Announcements display in portal

*For any* announcement published by the school, the parent portal SHALL display it in the announcements section.

**Validates: Requirements 6.1**

### Property 27: Announcements sorted by date

*For any* parent viewing the announcements section, the displayed announcements SHALL be sorted by date in descending order (newest first).

**Validates: Requirements 6.2**

### Property 28: Announcement detail shows full content

*For any* announcement selected by a parent, the detail view SHALL display the full content and all attachments.

**Validates: Requirements 6.3**

### Property 29: Announcements filterable by category

*For any* parent viewing the announcements section, the page SHALL allow filtering by category (academic, events, holidays, etc.).

**Validates: Requirements 6.5**

### Property 30: Announcement metadata displayed

*For any* announcement viewed by a parent, the page SHALL display the publication date and author name.

**Validates: Requirements 6.6**

### Property 31: Announcement read status tracked

*For any* announcement marked as read by a parent, the system SHALL track and persist the read status.

**Validates: Requirements 6.7**

### Property 32: Messages display conversation list

*For any* parent viewing the messages section, the page SHALL display a list of all conversations with teachers.

**Validates: Requirements 7.1**

### Property 33: Message delivered within 5 minutes

*For any* message sent by a parent to a teacher, the system SHALL deliver it within 5 minutes.

**Validates: Requirements 7.2**

### Property 34: Incoming message triggers notification

*For any* message received from a teacher, the system SHALL notify the parent immediately.

**Validates: Requirements 7.3**

### Property 35: Message history displayed

*For any* conversation opened by a parent, the page SHALL display the full message history in chronological order.

**Validates: Requirements 7.4**

### Property 36: Message includes timestamp and confirmation

*For any* message sent by a parent, the message SHALL include a timestamp and delivery confirmation indicator.

**Validates: Requirements 7.5**

### Property 37: New message allows teacher selection

*For any* parent initiating a new conversation, the system SHALL display a list of available teachers to select from.

**Validates: Requirements 7.6**

### Property 38: Unread message indicator displayed

*For any* unread message received, the system SHALL display an unread indicator in the conversation list.

**Validates: Requirements 7.7**

### Property 39: Fees display structure and balance

*For any* parent viewing the fees section, the page SHALL display the current fee structure and outstanding balance.

**Validates: Requirements 8.1**

### Property 40: Fees display breakdown

*For any* parent viewing the fees section, the page SHALL display a breakdown of all fees charged by item.

**Validates: Requirements 8.2**

### Property 41: Payment history displayed

*For any* parent viewing the fees section, the page SHALL display the complete payment history with all transactions.

**Validates: Requirements 8.3**

### Property 42: Payment methods displayed

*For any* parent initiating a payment, the system SHALL display all available payment methods.

**Validates: Requirements 8.4**

### Property 43: Payment updates balance within 1 hour

*For any* payment completed by a parent, the system SHALL generate a receipt and update the outstanding balance within 1 hour.

**Validates: Requirements 8.5**

### Property 44: Fees display due dates and late fees

*For any* parent viewing the fees section, the page SHALL display payment due dates and applicable late fees.

**Validates: Requirements 8.6**

### Property 45: Outstanding balance triggers reminders

*For any* outstanding balance existing, the system SHALL send periodic payment reminders to the parent.

**Validates: Requirements 8.7**

### Property 46: Fees display exemptions

*For any* fee exemptions or discounts applied, the parent portal SHALL display them in the fees section.

**Validates: Requirements 8.8**

### Property 47: Timetable displays schedule

*For any* parent viewing the timetable section, the page SHALL display the current class timetable with subjects, times, and locations.

**Validates: Requirements 9.1**

### Property 48: Timetable shows classroom locations

*For any* class in the timetable, the page SHALL display the classroom/location for that class.

**Validates: Requirements 9.2**

### Property 49: Exam schedule displayed

*For any* parent viewing the exam schedule section, the page SHALL display all upcoming examinations with dates, times, and venues.

**Validates: Requirements 9.3**

### Property 50: Exam details include invigilators

*For any* exam in the exam schedule, the page SHALL display the exam venue and assigned invigilator.

**Validates: Requirements 9.4**

### Property 51: Timetable changes notify within 30 minutes

*For any* timetable change made in the timetable management system, the parent portal SHALL notify the parent within 30 minutes.

**Validates: Requirements 9.5**

### Property 52: Timetable exportable to calendar

*For any* parent viewing the timetable section, the page SHALL provide an option to export the schedule in calendar format (PDF/iCal).

**Validates: Requirements 9.6**

### Property 53: Exam schedule shows duration

*For any* exam in the exam schedule, the page SHALL display the exam duration and subject details.

**Validates: Requirements 9.7**

### Property 54: Health records displayed

*For any* parent viewing the health section, the page SHALL display medical history and health records.

**Validates: Requirements 10.1**

### Property 55: Vaccination records displayed

*For any* parent viewing the health section, the page SHALL display vaccination records and immunization status.

**Validates: Requirements 10.2**

### Property 56: Allergies displayed

*For any* parent viewing the health section, the page SHALL display any allergies or medical conditions.

**Validates: Requirements 10.3**

### Property 57: Emergency contacts displayed

*For any* parent viewing the health section, the page SHALL display emergency contact information.

**Validates: Requirements 10.4**

### Property 58: Health updates within 1 hour

*For any* health information updated in the health system, the parent portal SHALL reflect the change within 1 hour.

**Validates: Requirements 10.5**

### Property 59: Critical health alert triggers immediate notification

*For any* critical health alert recorded, the system SHALL notify the parent immediately.

**Validates: Requirements 10.7**

### Property 60: Notifications displayed in section

*For any* notification generated, the parent portal SHALL display it in the notifications section.

**Validates: Requirements 11.2**

### Property 61: Notifications sorted by date

*For any* parent viewing the notifications section, the displayed notifications SHALL be sorted by date in descending order.

**Validates: Requirements 11.3**

### Property 62: Notification read status tracked

*For any* notification marked as read by a parent, the system SHALL update and persist the read status.

**Validates: Requirements 11.4**

### Property 63: Notifications filterable by type

*For any* parent viewing the notifications section, the page SHALL allow filtering by type (academic, attendance, behavioral, fees, communication, health).

**Validates: Requirements 11.5**

### Property 64: Notifications sent via multiple channels

*For any* notification generated, the system SHALL send it via both email and in-app notification.

**Validates: Requirements 11.6**

### Property 65: Notification preferences respected

*For any* notification preference configured by a parent, the system SHALL respect those settings when sending notifications.

**Validates: Requirements 11.7**

### Property 66: Dashboard displays key metrics

*For any* parent logging in, the dashboard SHALL display key metrics (attendance %, GPA, outstanding fees, next exam date).

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

### Property 67: Dashboard displays announcements and messages

*For any* parent viewing the dashboard, the page SHALL display recent announcements and messages.

**Validates: Requirements 12.5**

### Property 68: Dashboard displays events and exams

*For any* parent viewing the dashboard, the page SHALL display upcoming events and exam dates.

**Validates: Requirements 12.6**

### Property 69: Dashboard provides quick access links

*For any* parent viewing the dashboard, the page SHALL provide quick access links to main features (academic, attendance, fees, etc.).

**Validates: Requirements 12.7**

### Property 70: Data encrypted in transit

*For any* data transmitted between parent portal and backend, the system SHALL use HTTPS encryption.

**Validates: Requirements 13.1**

### Property 71: Sensitive data encrypted at rest

*For any* sensitive parent or student data stored in the database, the system SHALL encrypt it at rest.

**Validates: Requirements 13.2**

### Property 72: Parent can only access own child's data

*For any* parent attempting to access data for a child not linked to their account, the system SHALL return HTTP 403.

**Validates: Requirements 13.3**

### Property 73: Login activity logged

*For any* parent login, the system SHALL log the login activity for audit purposes.

**Validates: Requirements 13.4**

### Property 74: Session prevents cross-account access

*For any* active parent session, the system SHALL prevent access to other parent accounts.

**Validates: Requirements 13.5**

### Property 75: Portal responsive on mobile

*For any* parent accessing the portal on a mobile device, the portal SHALL display a responsive layout optimized for mobile screens.

**Validates: Requirements 14.1**

### Property 76: Portal responsive on tablet

*For any* parent accessing the portal on a tablet, the portal SHALL display an optimized layout for tablet screens.

**Validates: Requirements 14.2**

### Property 77: Portal displays full features on desktop

*For any* parent accessing the portal on a desktop, the portal SHALL display the full feature set.

**Validates: Requirements 14.3**

### Property 78: Portal supports keyboard navigation

*For any* parent using the portal, all interactive elements SHALL be accessible via keyboard navigation.

**Validates: Requirements 14.5**

### Property 79: Portal has appropriate color contrast

*For any* text in the portal, the color contrast SHALL meet WCAG AA standards for readability.

**Validates: Requirements 14.6**

### Property 80: Portal supports screen readers

*For any* parent using a screen reader, the portal SHALL provide appropriate ARIA labels and semantic HTML for navigation.

**Validates: Requirements 14.7**

### Property 81: Student data syncs within 1 hour

*For any* student data updated in the student management system, the parent portal SHALL reflect the change within 1 hour.

**Validates: Requirements 15.1**

### Property 82: Fees sync within 1 hour

*For any* fees updated in the fees management system, the parent portal SHALL reflect the change within 1 hour.

**Validates: Requirements 15.2**

### Property 83: Communications display in portal

*For any* communication sent through the communication system, the parent portal SHALL display it to relevant parents.

**Validates: Requirements 15.3**

### Property 84: Timetable syncs within 30 minutes

*For any* timetable change made in the timetable management system, the parent portal SHALL reflect the change within 30 minutes.

**Validates: Requirements 15.4**

### Property 85: Attendance syncs within 30 minutes

*For any* attendance marked in the attendance system, the parent portal SHALL reflect the change within 30 minutes.

**Validates: Requirements 15.5**

### Property 86: Grades sync within 1 hour

*For any* grade entered in the results management system, the parent portal SHALL reflect the change within 1 hour.

**Validates: Requirements 15.6**

### Property 87: Dashboard loads within 2 seconds

*For any* parent loading the dashboard under normal network conditions, all dashboard data SHALL be loaded and rendered within 2 seconds.

**Validates: Requirements 16.1**

### Property 88: Navigation responds within 1 second

*For any* parent navigating between sections, the portal SHALL respond and display the new section within 1 second.

**Validates: Requirements 16.2**

### Property 89: Search returns results within 3 seconds

*For any* parent searching for information, the portal SHALL return search results within 3 seconds.

**Validates: Requirements 16.4**

### Property 90: Portal handles 1000 concurrent users

*For any* load test with 1000 concurrent parent users, the portal SHALL maintain 99.5% uptime.

**Validates: Requirements 16.5**

### Property 91: Portal handles 10MB file uploads

*For any* parent uploading a file up to 10MB, the portal SHALL successfully handle and store the file.

**Validates: Requirements 16.6**

### Property 92: Report exports in CSV or PDF

*For any* administrator generating a report, the system SHALL export the data in CSV or PDF format.

**Validates: Requirements 17.4**

### Property 93: Analytics show feature usage

*For any* administrator viewing analytics, the system SHALL display which features are most used by parents.

**Validates: Requirements 17.5**

### Property 94: Report includes specified date range

*For any* administrator generating a report with a specified date range, the report SHALL include only data within that range.

**Validates: Requirements 17.7**

### Property 95: Help section displays FAQs

*For any* parent viewing the help section, the page SHALL display FAQs and documentation.

**Validates: Requirements 18.1**

### Property 96: Help search returns relevant results

*For any* parent searching for help, the system SHALL return relevant articles and guides.

**Validates: Requirements 18.2**

### Property 97: Support contact information displayed

*For any* parent needing support, the portal SHALL display contact information for the support team.

**Validates: Requirements 18.3**

### Property 98: Support tickets tracked

*For any* support ticket submitted by a parent, the system SHALL track the ticket and provide updates.

**Validates: Requirements 18.4**

### Property 99: Help section displays video tutorials

*For any* parent viewing the help section, the page SHALL display video tutorials for key features.

**Validates: Requirements 18.5**

### Property 100: Troubleshooting guides available

*For any* parent viewing the help section, the page SHALL display troubleshooting guides for common issues.

**Validates: Requirements 18.7**

## Implementation Notes

### Reusing Existing Code

The Parent Portal leverages existing implementations:

1. **Authentication**: Reuse `setAuthInStorage`, `getAuthFromStorage`, `clearAuthFromStorage` from `src/lib/auth.ts`
2. **Role-Based Routing**: Reuse `RoleBasedRoute` component from `src/components/auth/RoleBasedRoute.tsx`
3. **Student Data**: Reuse functions from `api/tenant/_lib/students.ts`
4. **Grades**: Reuse functions from `api/tenant/_lib/results.ts`
5. **Attendance**: Reuse functions from `api/tenant/_lib/attendance.ts`
6. **Behavioral**: Reuse functions from `api/tenant/_lib/behavioral.ts` (if exists)
7. **Timetable**: Reuse functions from `api/tenant/timetable/_lib/`
8. **Communications**: Reuse functions from `api/tenant/_lib/communication.ts`
9. **Fees**: Reuse functions from `api/tenant/finance/_lib/`
10. **Health**: Reuse functions from `api/tenant/_lib/health.ts` (if exists)

### API Implementation Pattern

Each parent API endpoint follows this pattern:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

function extractParentInfoFromJWT(req: VercelRequest): { parentId: string; childrenIds: string[] } | null {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  
  try {
    const token = authHeader.substring(7)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return { parentId: payload.parentId, childrenIds: payload.childrenIds } || null
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parentInfo = extractParentInfoFromJWT(req)
  if (!parentInfo) return res.status(401).json({ error: 'Unauthorized' })
  
  const { childId } = req.query
  
  // Validate childId is in parent's linked children
  if (!parentInfo.childrenIds.includes(childId as string)) {
    return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
  }
  
  // Process request with childId filtering
  // Return filtered data
}
```

### Component Implementation Pattern

Each parent component follows this pattern:

```typescript
import { useEffect, useState } from 'react'
import { getAuthFromStorage } from '../../lib/auth'

export function ParentComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const auth = getAuthFromStorage()
  const [selectedChildId, setSelectedChildId] = useState(auth?.childrenIds?.[0])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/parent/endpoint?childId=${selectedChildId}`, {
          headers: {
            'Authorization': `Bearer ${auth?.token}`
          }
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [auth?.token, selectedChildId])

  if (loading) return <SkeletonLoader />
  if (error) return <ErrorState onRetry={() => window.location.reload()} />
  return <div>{/* render data */}</div>
}
```

