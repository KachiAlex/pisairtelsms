# Staff Portal Design

## Overview

The Staff Portal is a role-scoped interface that mirrors the Student Portal architecture, providing teachers and administrative staff with a dedicated dashboard and tools to manage their responsibilities. The portal reuses existing admin-side APIs and data structures, applying staff-specific filtering at the API layer to ensure data isolation. Staff members can view their dashboard, manage timetables, mark attendance, submit leave requests, view payslips, communicate with parents and admin, and update their profile.

## Architecture

### High-Level Design

```
Staff Login (role='staff' JWT)
    ↓
StaffLayout (validates role via RoleBasedRoute)
    ↓
Page Component (Dashboard, Timetable, Attendance, etc.)
    ↓
API Call with staffId filter from JWT
    ↓
Backend validates staffId matches token
    ↓
Return filtered data (reuse existing _lib functions)
    ↓
Render component
```

### Component Structure

```
StaffLayout
├── Sidebar (navigation)
├── Header (staff name, logout, notifications)
└── Main Content Area
    ├── StaffDashboard
    ├── MyTimetable
    ├── AttendanceMarking
    ├── LeaveManagement
    ├── PayslipViewer
    ├── Communications
    ├── ClassLists
    └── Profile
```

### Data Flow

1. Staff member logs in with credentials
2. Backend validates and returns JWT token with `role: 'staff'` and `staffId`
3. Token stored in localStorage via `setAuthInStorage`
4. StaffLayout validates role via RoleBasedRoute
5. Page components make API calls to `/api/staff/*` endpoints
6. Backend extracts `staffId` from JWT token
7. Backend filters all queries by `staffId` using existing `_lib` functions
8. Backend returns only data belonging to authenticated staff member
9. Frontend renders filtered data

## Components and Interfaces

### StaffLayout Component

Mirrors StudentLayout with staff-specific navigation items:

```typescript
interface StaffLayoutProps {
  children?: React.ReactNode
}

Navigation Items:
- Dashboard (LayoutDashboard icon)
- My Timetable (Clock icon)
- Attendance (CalendarCheck icon)
- Leave Requests (Calendar icon)
- Payslips (CreditCard icon)
- Communications (MessageSquare icon)
- Class Lists (Users icon)
- Profile (User icon)
```

Features:
- Responsive sidebar (collapsible on mobile)
- Header with staff name, department, and logout
- Notification bell icon
- Active page highlighting
- Lazy-loaded page components

### StaffDashboard Component

Landing page showing key information at a glance:

```typescript
interface StaffDashboardData {
  staff: {
    id: string
    name: string
    staffId: string
    department: string
    role: string
  }
  todaySchedule: ClassSession[]
  pendingLeaveCount: number
  recentAnnouncements: Announcement[]
  recentMessages: Message[]
}

interface ClassSession {
  id: string
  subject: string
  className: string
  timeSlot: string
  room: string
  startTime: string
  endTime: string
}
```

Sections:
- Staff info card (name, ID, department, role)
- Today's schedule (grid of classes with times and rooms)
- Pending leave requests count
- Recent announcements (5 items with title, date, preview)
- Recent messages (5 items with sender, subject, date)
- Loading skeletons for each section
- Error states with retry buttons

### MyTimetable Component

Displays staff member's weekly teaching schedule:

```typescript
interface TimetableData {
  schedule: ScheduleEntry[]
  examSchedule: ExamEntry[]
  currentTerm: string
  availableTerms: Term[]
}

interface ScheduleEntry {
  id: string
  dayOfWeek: number (0-6)
  timeSlot: string
  subject: string
  className: string
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
}
```

Features:
- Weekly grid view (Mon-Fri columns, time slots rows)
- Current day highlighted
- Term selector dropdown
- Separate exam schedule section
- Empty state if no schedule assigned
- Download timetable button

### AttendanceMarking Component

Allows staff to mark student attendance:

```typescript
interface AttendanceMarkingData {
  assignedClasses: ClassInfo[]
  selectedClass: ClassInfo | null
  selectedDate: string
  students: StudentAttendanceRecord[]
}

interface StudentAttendanceRecord {
  id: string
  studentId: string
  name: string
  admissionNumber: string
  currentStatus: 'present' | 'absent' | 'late' | null
}

interface AttendanceSubmission {
  classId: string
  date: string
  records: {
    studentId: string
    status: 'present' | 'absent' | 'late'
  }[]
}
```

Features:
- Class selector dropdown (only staff's assigned classes)
- Date picker (cannot select future dates)
- Student list with status toggles (present/absent/late)
- Save button (disabled while submitting)
- Success/error messages
- Attendance history view (filterable by class and date range)
- Preserve unsaved selections on error

### LeaveManagement Component

Allows staff to submit and track leave requests:

```typescript
interface LeaveRequest {
  id: string
  staffId: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  approvedBy?: string
  approvalDate?: string
}

interface LeaveBalance {
  leaveType: string
  totalDays: number
  usedDays: number
  remainingDays: number
}

interface NewLeaveRequest {
  leaveType: string
  startDate: string
  endDate: string
  reason: string
}
```

Features:
- Leave request list (status, type, date range, days count)
- New leave request form with validation
- Leave balance summary by type
- Status filtering (pending, approved, rejected)
- Date range validation (start ≤ end)
- Required field validation
- Success/error messages

### PayslipViewer Component

Read-only payslip viewing:

```typescript
interface Payslip {
  id: string
  staffId: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  paymentStatus: 'pending' | 'paid'
  paymentDate?: string
}
```

Features:
- Payslip list (ordered by year/month descending)
- Payslip detail view (breakdown of salary components)
- Read-only rendering (no edit/delete controls)
- Empty state if no payslips
- Download payslip button

### Communications Component

Announcements and messaging:

```typescript
interface Announcement {
  id: string
  title: string
  body: string
  date: string
  audience: string
  sentBy: string
}

interface Message {
  id: string
  sender: string
  senderRole: string
  subject: string
  body: string
  date: string
  isRead: boolean
  replies?: Message[]
}

interface NewMessage {
  recipientId: string
  subject: string
  body: string
}
```

Features:
- Announcements list with search/filter
- Message inbox with sender, subject, date, read status
- Message detail view with full body
- Reply functionality
- Compose new message form
- Mark as read/unread toggle
- Search across title, subject, sender

### ClassLists Component

View students in assigned classes:

```typescript
interface ClassInfo {
  id: string
  name: string
  arm: string
  studentCount: number
}

interface StudentProfile {
  id: string
  name: string
  admissionNumber: string
  gender: string
  class: string
  arm: string
  email?: string
  phone?: string
}
```

Features:
- Class selector (only staff's assigned classes)
- Student roster with name, admission number, gender
- Student profile detail view (read-only)
- Empty state if no classes assigned

### Profile Component

Staff profile management:

```typescript
interface StaffProfile {
  id: string
  staffId: string
  name: string
  department: string
  role: string
  email: string
  phone: string
  address: string
  qualification: string
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
- Display current profile data
- Edit form for email, phone, address
- Password change form with validation
- Email format validation
- Password confirmation validation
- Current password verification
- Success/error messages

## Data Models

### Database Schema

No new tables required. Staff Portal reuses existing tables:

- `staff` - Staff member records (from `api/tenant/_lib/staff.ts`)
- `leave_requests` - Leave request records (from `api/tenant/_lib/staff.ts`)
- `attendance` - Student attendance records (from `api/tenant/_lib/attendance.ts`)
- `payroll` - Payroll records (from `api/tenant/_lib/staff.ts`)
- `timetable_class_schedules` - Class schedules (from `api/tenant/timetable/_lib/class-schedules.ts`)
- `timetable_teacher_schedules` - Teacher schedules (from `api/tenant/timetable/_lib/teacher-schedules.ts`)
- `announcements` - School announcements (from `api/tenant/_lib/communication.ts`)
- `messages` - Direct messages (from `api/tenant/_lib/parent-messages.ts`)

### API Layer Filtering

All queries filtered by `staffId` extracted from JWT token:

```typescript
// Example: Get staff member's leave requests
const staffId = extractStaffIdFromJWT(req)
const leaveRequests = await fetchLeaveRequests(staffId)
// Backend ensures only records with matching staffId are returned
```

## API Endpoint Design

### 15 Staff-Specific Endpoints

All endpoints require valid JWT token with `role: 'staff'` and extract `staffId` from token.

#### 1. Dashboard
```
GET /api/staff/dashboard
Response: {
  staff: { id, name, staffId, department, role },
  todaySchedule: [{ id, subject, className, timeSlot, room, startTime, endTime }],
  pendingLeaveCount: number,
  recentAnnouncements: [{ id, title, date, preview }],
  recentMessages: [{ id, sender, subject, date, isRead }]
}
```

#### 2. Timetable
```
GET /api/staff/timetable?termId=term-123
Response: {
  schedule: [{ id, dayOfWeek, timeSlot, subject, className, room, startTime, endTime }],
  examSchedule: [{ id, subject, date, time, room, duration }],
  currentTerm: string,
  availableTerms: [{ id, name }]
}
```

#### 3. Classes
```
GET /api/staff/classes
Response: {
  classes: [{ id, name, arm, studentCount }]
}
```

#### 4. Class Students
```
GET /api/staff/classes/:classId/students
Response: {
  students: [{ id, name, admissionNumber, gender }]
}
```

#### 5. Student Profile
```
GET /api/staff/students/:studentId
Response: {
  id, name, admissionNumber, gender, class, arm, email, phone
}
```

#### 6. Attendance List
```
GET /api/staff/attendance?classId=class-123&date=2024-01-15
Response: {
  classId: string,
  date: string,
  students: [{ id, studentId, name, admissionNumber, currentStatus }],
  history: [{ date, classId, recordCount }]
}
```

#### 7. Mark Attendance
```
POST /api/staff/attendance
Body: {
  classId: string,
  date: string,
  records: [{ studentId, status: 'present'|'absent'|'late' }]
}
Response: {
  count: number,
  message: string
}
```

#### 8. Leave Requests
```
GET /api/staff/leave
Response: {
  requests: [{ id, leaveType, startDate, endDate, reason, status, createdAt, approvedBy, approvalDate }],
  balance: [{ leaveType, totalDays, usedDays, remainingDays }]
}
```

#### 9. Submit Leave Request
```
POST /api/staff/leave
Body: {
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string
}
Response: {
  id, leaveType, startDate, endDate, reason, status: 'pending', createdAt
}
```

#### 10. Payslips
```
GET /api/staff/payslips?month=01&year=2024
Response: {
  payslips: [{ id, month, year, basicSalary, allowances, deductions, netSalary, paymentStatus, paymentDate }]
}
```

#### 11. Announcements
```
GET /api/staff/announcements?limit=10
Response: {
  announcements: [{ id, title, body, date, audience, sentBy }]
}
```

#### 12. Messages
```
GET /api/staff/messages?limit=20
Response: {
  messages: [{ id, sender, senderRole, subject, body, date, isRead, replies: [...] }]
}
```

#### 13. Send Message
```
POST /api/staff/messages
Body: {
  recipientId: string,
  subject: string,
  body: string
}
Response: {
  id, sender, subject, body, date, isRead
}
```

#### 14. Mark Message as Read
```
PUT /api/staff/messages/:messageId/read
Response: {
  id, isRead: true
}
```

#### 15. Profile
```
GET /api/staff/profile
Response: {
  id, staffId, name, department, role, email, phone, address, qualification
}

PUT /api/staff/profile
Body: { email?, phone?, address? }
Response: {
  id, staffId, name, department, role, email, phone, address, qualification
}

POST /api/staff/change-password
Body: { currentPassword, newPassword }
Response: { success: true }
```

## Security Model

### Authentication

- JWT token required on all requests
- Token includes `staffId` and `role: 'staff'`
- Token expires after 24 hours
- Invalid/missing token returns HTTP 401

### Authorization

- Backend extracts `staffId` from JWT token
- All queries filtered by `staffId`
- Staff member cannot access other staff members' data
- Attempting cross-access returns HTTP 403
- Attendance marking only allowed for staff member's assigned classes
- Profile updates only allowed for authenticated staff member

### Data Isolation

```typescript
// Example: Fetch staff member's leave requests
const staffId = extractStaffIdFromJWT(req)
if (!staffId) return res.status(401).json({ error: 'Unauthorized' })

const leaveRequests = await fetchLeaveRequests(staffId)
// Backend ensures only records with matching staffId are returned
```

### Validation

- Date validation (no future dates for attendance)
- Email format validation
- Password confirmation validation
- Required field validation
- Leave date range validation (start ≤ end)

## Performance Considerations

### Caching

- Dashboard data: 5 minutes (frequently accessed)
- Timetable: 1 day (changes only on term change)
- Announcements: 30 minutes
- Payslips: 1 hour (rarely changes)
- Staff profile: 1 hour

### Lazy Loading

- Load announcements and messages on demand
- Paginate message list (20 per page)
- Paginate attendance history (50 per page)
- Lazy load student profiles

### Pagination

- Dashboard: 5 announcements, 5 messages
- Messages: 20 per page
- Attendance history: 50 per page
- Announcements: 10 per page

### Query Optimization

- Index on `staffId` for all queries
- Index on `date` for attendance queries
- Index on `status` for leave requests
- Reuse existing `_lib` functions (already optimized)

## Error Handling

### HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad request (validation error)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (cross-access attempt)
- 404: Not found
- 405: Method not allowed
- 409: Conflict (e.g., duplicate attendance record)
- 500: Server error

### Error Messages

```typescript
// Validation error
{ error: 'Validation failed', details: { field: 'message' } }

// Authentication error
{ error: 'Unauthorized: Invalid or missing token' }

// Authorization error
{ error: 'Forbidden: Cannot access this resource' }

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

### Loading States

- Skeleton loaders for all data sections
- Animated pulse effect
- "Loading..." text
- Disable interactive elements while loading

## Testing Strategy

### Unit Tests

- Component rendering with mock data
- Data formatting and calculations
- Validation logic (email, dates, passwords)
- Error state rendering
- Loading state rendering

### Integration Tests

- API calls with real backend
- Authentication flow (login, token storage, logout)
- Authorization (staff member can only access own data)
- Data filtering by staffId
- Cross-access prevention (403 on unauthorized access)

### Property-Based Tests

- See Correctness Properties section below

### E2E Tests

- Complete login flow
- Navigate through all pages
- Mark attendance and verify save
- Submit leave request and verify creation
- Update profile and verify changes
- Download payslip
- Send message and verify receipt
- Token expiration and re-login

### Security Tests

- Attempt to access another staff member's data (should fail with 403)
- Attempt to mark attendance for unassigned class (should fail with 403)
- Attempt to update another staff member's profile (should fail with 403)
- Token expiration handling
- Invalid token rejection
- Rate limiting verification

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication stores JWT with staff role

*For any* valid staff credentials, after successful authentication, the JWT token stored in localStorage SHALL contain `role: 'staff'` and a valid `staffId`.

**Validates: Requirements 1.1**

### Property 2: Invalid credentials display generic error

*For any* invalid staff credentials (wrong ID or password), the authentication response SHALL display an error message that does not reveal which specific credential was incorrect.

**Validates: Requirements 1.2**

### Property 3: Unauthenticated users redirect to login

*For any* unauthenticated user attempting to access a staff portal route, the system SHALL redirect to `/staff/login`.

**Validates: Requirements 1.3**

### Property 4: Non-staff roles redirect to unauthorized

*For any* user with a non-`staff` role attempting to access a staff portal route, the system SHALL redirect to `/unauthorized`.

**Validates: Requirements 1.4**

### Property 5: Expired token triggers logout

*For any* staff member with an expired JWT token, the system SHALL redirect to `/staff/login` and clear all auth data from localStorage.

**Validates: Requirements 1.5**

### Property 6: Sign out clears auth and redirects

*For any* staff member clicking the sign out button, the system SHALL clear auth data from localStorage and redirect to `/staff/login`.

**Validates: Requirements 1.6**

### Property 7: JWT token expires after 24 hours

*For any* JWT token issued at login, the token's expiration time SHALL be set to 24 hours from the time of issuance.

**Validates: Requirements 1.7**

### Property 8: Dashboard displays staff info fields

*For any* staff member loading the dashboard, the rendered page SHALL contain the staff member's name, staff ID, department, and role.

**Validates: Requirements 2.1**

### Property 9: Dashboard displays today's schedule

*For any* staff member loading the dashboard, the rendered page SHALL display today's scheduled classes with subject, class name, time slot, and room information.

**Validates: Requirements 2.2**

### Property 10: Dashboard displays pending leave count

*For any* staff member loading the dashboard, the rendered page SHALL display the count of pending leave requests.

**Validates: Requirements 2.3**

### Property 11: Dashboard displays recent announcements

*For any* staff member loading the dashboard, the rendered page SHALL display up to 5 most recent announcements with title, date, and preview text.

**Validates: Requirements 2.4**

### Property 12: Dashboard displays recent messages

*For any* staff member loading the dashboard, the rendered page SHALL display up to 5 most recent messages with sender name, subject, and date.

**Validates: Requirements 2.5**

### Property 13: Dashboard shows loading skeletons

*For any* dashboard page load, while data is being fetched, the page SHALL display loading skeleton placeholders for each section.

**Validates: Requirements 2.6**

### Property 14: Dashboard error state shows retry button

*For any* failed dashboard API call, the affected section SHALL display an error message and a retry button.

**Validates: Requirements 2.7**

### Property 15: Dashboard loads within 3 seconds

*For any* staff member loading the dashboard under normal network conditions, all dashboard data SHALL be loaded and rendered within 3 seconds.

**Validates: Requirements 2.8**

### Property 16: Timetable displays schedule with required fields

*For any* staff member viewing the timetable page, the rendered grid SHALL display the weekly schedule with day, time slot, subject, class name, and room for each entry.

**Validates: Requirements 3.1**

### Property 17: Timetable highlights current day

*For any* staff member viewing the timetable, the column representing the current day of the week SHALL be visually highlighted.

**Validates: Requirements 3.2**

### Property 18: Timetable displays exam schedule

*For any* staff member viewing the timetable, a separate section SHALL display the exam schedule for the current term.

**Validates: Requirements 3.3**

### Property 19: Timetable reloads on term change

*For any* staff member selecting a different term in the timetable, the displayed schedule SHALL update to show entries for the selected term.

**Validates: Requirements 3.4**

### Property 20: Timetable API filters by teacher ID

*For any* timetable API request from an authenticated staff member, the returned entries SHALL only include classes where the staff member is the assigned teacher.

**Validates: Requirements 3.5**

### Property 21: Timetable shows empty state when no schedule

*For any* staff member with no timetable entries in the selected term, the page SHALL display an empty state message indicating no schedule is assigned.

**Validates: Requirements 3.6**

### Property 22: Attendance page displays assigned classes

*For any* staff member navigating to the attendance page, the page SHALL display a list of all classes assigned to that staff member.

**Validates: Requirements 4.1**

### Property 23: Attendance displays student list with status

*For any* staff member selecting a class and date on the attendance page, the page SHALL display the full student roster with each student's current attendance status for that date.

**Validates: Requirements 4.2**

### Property 24: Attendance save button enabled after marking

*For any* staff member marking a student's attendance status, the save button for the class session SHALL become enabled.

**Validates: Requirements 4.3**

### Property 25: Attendance rejects future dates

*For any* attendance submission with a future date, the API SHALL reject the submission and return an error.

**Validates: Requirements 4.4**

### Property 26: Attendance displays success message

*For any* successful attendance submission, the page SHALL display a success confirmation message.

**Validates: Requirements 4.5**

### Property 27: Attendance preserves data on error

*For any* failed attendance submission, the page SHALL display an error message and preserve all unsaved attendance selections.

**Validates: Requirements 4.6**

### Property 28: Attendance API rejects unassigned classes

*For any* attendance submission for a class not assigned to the authenticated staff member, the API SHALL return HTTP 403.

**Validates: Requirements 4.7**

### Property 29: Attendance history is filterable

*For any* staff member viewing attendance history, the page SHALL display previously submitted records that are filterable by class and date range.

**Validates: Requirements 4.8**

### Property 30: Attendance submit button disabled during submission

*For any* attendance submission in progress, the submit button SHALL be disabled to prevent duplicate submissions.

**Validates: Requirements 4.9**

### Property 31: Leave page displays all requests with required fields

*For any* staff member navigating to the leave page, the page SHALL display all leave requests with status, leave type, date range, and number of days.

**Validates: Requirements 5.1**

### Property 32: Leave request creation sets pending status

*For any* new leave request submitted with leave type, start date, end date, and reason, the API SHALL create the request with status `pending` and associate it with the authenticated staff member's ID.

**Validates: Requirements 5.2**

### Property 33: Leave request validates date range

*For any* leave request where start date is after end date, the page SHALL display a validation error and prevent submission.

**Validates: Requirements 5.3**

### Property 34: Leave request validates required fields

*For any* leave request with missing required fields (leave type, start date, end date, or reason), the page SHALL display field-level validation errors and prevent submission.

**Validates: Requirements 5.4**

### Property 35: Leave request status updates on fetch

*For any* leave request whose status changes to approved or rejected, the updated status SHALL be reflected on the next data fetch.

**Validates: Requirements 5.5**

### Property 36: Leave API filters by staff ID

*For any* leave request API call from an authenticated staff member, the returned requests SHALL only include those belonging to that staff member's ID.

**Validates: Requirements 5.6**

### Property 37: Leave page displays balance summary

*For any* staff member viewing the leave page, a summary of leave balance by type SHALL be displayed if available.

**Validates: Requirements 5.7**

### Property 38: Payslips ordered by year and month descending

*For any* staff member viewing the payslips page, the displayed payslips SHALL be ordered by year and month in descending order.

**Validates: Requirements 6.1**

### Property 39: Payslip detail displays all components

*For any* payslip selected by a staff member, the detail view SHALL display basic salary, allowances, deductions, net salary, payment status, and payment date.

**Validates: Requirements 6.2**

### Property 40: Payslip API filters by staff ID

*For any* payslip API call from an authenticated staff member, the returned records SHALL only include payroll records where `staffId` matches the authenticated staff member's ID.

**Validates: Requirements 6.3**

### Property 41: Payslips rendered as read-only

*For any* payslips page, the rendered content SHALL not include any edit or delete controls.

**Validates: Requirements 6.4**

### Property 42: Payslips shows empty state when none exist

*For any* staff member with no payslip records, the page SHALL display an empty state message.

**Validates: Requirements 6.5**

### Property 43: Communications displays announcements with required fields

*For any* staff member navigating to the communications page, the page SHALL display announcements with title, date, body, and target audience.

**Validates: Requirements 7.1**

### Property 44: Messages inbox displays required fields

*For any* staff member viewing the messages section, the inbox SHALL display messages with sender, subject, date, and read/unread status.

**Validates: Requirements 7.2**

### Property 45: Opening message marks as read

*For any* staff member opening a message, the message SHALL be marked as read and the full message body SHALL be displayed.

**Validates: Requirements 7.3**

### Property 46: New message associates with sender

*For any* new message composed with recipient, subject, and body, the API SHALL send the message and associate it with the authenticated staff member as sender.

**Validates: Requirements 7.4**

### Property 47: Message reply links to thread

*For any* reply to a message, the API SHALL create the reply linked to the original message thread.

**Validates: Requirements 7.5**

### Property 48: Messages API filters by sender or recipient

*For any* messages API call from an authenticated staff member, the returned messages SHALL only include those where the staff member is the sender or recipient.

**Validates: Requirements 7.6**

### Property 49: Message search filters by search term

*For any* search query on announcements or messages, the results SHALL be filtered by the search term against title, subject, and sender fields.

**Validates: Requirements 7.7**

### Property 50: Class lists displays assigned classes

*For any* staff member navigating to the class lists page, the page SHALL display all classes assigned to that staff member.

**Validates: Requirements 8.1**

### Property 51: Class roster displays required student fields

*For any* class selected by a staff member, the roster SHALL display enrolled students with name, admission number, and gender.

**Validates: Requirements 8.2**

### Property 52: Class students API filters by teacher

*For any* class students API call from an authenticated staff member, the returned students SHALL only include those enrolled in classes where the staff member is the assigned teacher.

**Validates: Requirements 8.3**

### Property 53: Student profile displays required fields

*For any* student selected from a class list, the profile view SHALL display name, admission number, class, and contact details.

**Validates: Requirements 8.4**

### Property 54: Student profiles rendered as read-only

*For any* student profile page, the rendered content SHALL not include any edit controls.

**Validates: Requirements 8.5**

### Property 55: Profile page displays all staff fields

*For any* staff member navigating to the profile page, the page SHALL display name, staff ID, department, role, email, phone, address, and qualification.

**Validates: Requirements 9.1**

### Property 56: Profile update modifies only specified fields

*For any* profile update with email, phone, or address, the API SHALL update only those fields for the authenticated staff member's record.

**Validates: Requirements 9.2**

### Property 57: Profile validates email format

*For any* profile update with an invalid email format, the page SHALL display a validation error and prevent submission.

**Validates: Requirements 9.3**

### Property 58: Password change validates current password

*For any* password change request, the API SHALL validate the current password before updating to the new password.

**Validates: Requirements 9.4**

### Property 59: Password change validates confirmation

*For any* password change where new password and confirmation do not match, the page SHALL display a validation error and prevent submission.

**Validates: Requirements 9.5**

### Property 60: Profile API rejects cross-staff updates

*For any* profile update request where the `staffId` does not match the authenticated staff member's ID, the API SHALL return HTTP 403.

**Validates: Requirements 9.6**

### Property 61: Profile update displays success message

*For any* successful profile update, the page SHALL display a success confirmation message.

**Validates: Requirements 9.7**

### Property 62: API rejects missing or invalid tokens

*For any* API request with missing or invalid JWT token, the API SHALL return HTTP 401.

**Validates: Requirements 10.1**

### Property 63: API filters all queries by staff ID

*For any* API query from an authenticated staff member, the returned data SHALL be filtered by the staff member's ID, preventing access to other staff members' leave, payroll, and attendance records.

**Validates: Requirements 10.2**

### Property 64: Attendance API verifies teacher assignment

*For any* attendance submission, the API SHALL verify the staff member is the assigned teacher for that class before saving.

**Validates: Requirements 10.3**

### Property 65: All required endpoints are exposed

*For any* staff member, all 15 required endpoints SHALL be accessible and respond correctly: `GET /api/staff/dashboard`, `GET /api/staff/timetable`, `GET /api/staff/classes`, `GET /api/staff/attendance`, `POST /api/staff/attendance`, `GET /api/staff/leave`, `POST /api/staff/leave`, `GET /api/staff/payslips`, `GET /api/staff/messages`, `POST /api/staff/messages`, `PUT /api/staff/messages/:id/read`, `GET /api/staff/announcements`, `GET /api/staff/profile`, `PUT /api/staff/profile`, `POST /api/staff/change-password`.

**Validates: Requirements 10.4**

### Property 66: Cross-staff access returns 403

*For any* attempt by a staff member to access a resource belonging to another staff member, the API SHALL return HTTP 403.

**Validates: Requirements 10.6**

## Implementation Notes

### Reusing Existing Code

The Staff Portal leverages existing implementations:

1. **Authentication**: Reuse `setAuthInStorage`, `getAuthFromStorage`, `clearAuthFromStorage` from `src/lib/auth.ts`
2. **Role-Based Routing**: Reuse `RoleBasedRoute` component from `src/components/auth/RoleBasedRoute.tsx`
3. **Staff Data**: Reuse functions from `api/tenant/_lib/staff.ts`:
   - `fetchStaffById(id)` - Get staff member details
   - `fetchLeaveRequests(staffId)` - Get leave requests
   - `createLeaveRequest(payload)` - Create leave request
   - `fetchPayroll(month, year)` - Get payslips
4. **Attendance**: Reuse functions from `api/tenant/_lib/attendance.ts`:
   - `fetchAttendance(className, date, term)` - Get attendance records
   - `upsertAttendanceBatch(records)` - Save attendance
5. **Timetable**: Reuse functions from `api/tenant/timetable/_lib/`:
   - `getClassSchedules(tenantId, classId, termId)` - Get class schedules
   - `getTeacherSchedules(tenantId, teacherId, termId)` - Get teacher schedules
6. **Communications**: Reuse functions from `api/tenant/_lib/communication.ts`:
   - `fetchAnnouncements(audience, status)` - Get announcements
   - `fetchMessages(senderId, recipientId)` - Get messages

### API Implementation Pattern

Each staff API endpoint follows this pattern:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

function extractStaffIdFromJWT(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  
  try {
    const token = authHeader.substring(7)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return payload.staffId || null
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromJWT(req)
  if (!staffId) return res.status(401).json({ error: 'Unauthorized' })
  
  // Validate role is 'staff'
  // Process request with staffId filtering
  // Return filtered data
}
```

### Component Implementation Pattern

Each staff component follows this pattern:

```typescript
import { useEffect, useState } from 'react'
import { getAuthFromStorage } from '../../lib/auth'

export function StaffComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const auth = getAuthFromStorage()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/staff/endpoint', {
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
  }, [auth?.token])

  if (loading) return <SkeletonLoader />
  if (error) return <ErrorState onRetry={() => window.location.reload()} />
  return <div>{/* render data */}</div>
}
```

