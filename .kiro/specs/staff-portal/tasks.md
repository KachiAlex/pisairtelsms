# Implementation Plan: Staff Portal

## Overview

Build a staff portal where teachers and administrative staff can view their dashboard, manage their timetable, mark student attendance, submit leave requests, view payslips, communicate with parents and admin, and update their profile. The portal mirrors the Student Portal architecture, reusing existing admin APIs with staff-specific filtering and role-based access control.

## Tasks

- [x] 1. Phase 1 — Authentication & Layout Foundation

  - [ ] 1.1 Extend auth system to support staff role
    - Verify `role` field in JWT token includes 'staff' value
    - Verify `AuthStorage` interface includes `role` field
    - Verify login endpoint returns role based on user type
    - _Requirements: 1.1_

  - [ ] 1.2 Create `StaffLoginPage` component
    - Form fields: staff ID, password
    - Submit to existing login endpoint with `userType='staff'`
    - Store JWT token with role='staff'
    - Redirect to `/staff/dashboard` on success
    - Display generic error message on invalid credentials
    - _Requirements: 1.1, 1.2_

  - [ ] 1.3 Create `StaffLayout` component
    - Sidebar with 8 menu items: Dashboard, My Timetable, Attendance, Leave, Payslips, Communications, Class Lists, Profile
    - Header with staff name, department, and logout button
    - Mobile hamburger menu
    - Responsive design (mobile-first)
    - Active page highlighting
    - _Requirements: 1.1_

  - [ ] 1.4 Update `src/App.tsx` with staff routes
    - Add `/staff` route with `RoleBasedRoute` (allowedRoles: ['staff'])
    - Map sub-routes: `/staff/dashboard`, `/staff/timetable`, `/staff/attendance`, `/staff/leave`, `/staff/payslips`, `/staff/communications`, `/staff/class-lists`, `/staff/profile`
    - Render `StaffLayout` as wrapper
    - _Requirements: 1.1_

  - [ ] 1.5 Wire staff login into `AccessPortalPage`
    - Add staff login option to portal selection page
    - Link to `/staff/login` route
    - _Requirements: 1.1_

- [x] 2. Phase 2 — Staff-Specific APIs (15 Endpoints)

  - [ ] 2.1 Implement Staff Dashboard API (`api/staff/dashboard.ts`)
    - GET: aggregate staff data (staff info, today's schedule, pending leave count, recent announcements, recent messages)
    - Extract staffId from JWT token
    - Return: { staff, todaySchedule, pendingLeaveCount, recentAnnouncements, recentMessages }
    - Validate staffId from JWT token
    - _Requirements: 2.1, 10.1_

  - [ ] 2.2 Implement Staff Timetable API (`api/staff/timetable.ts`)
    - GET: return staff member's schedule filtered by termId
    - Query params: termId (optional, defaults to current term)
    - Extract staffId from JWT token
    - Return: { schedule, examSchedule, currentTerm, availableTerms }
    - Filter by teacherId matching staffId
    - _Requirements: 3.1, 3.4, 3.5, 10.2_

  - [ ] 2.3 Implement Staff Classes API (`api/staff/classes.ts`)
    - GET: return classes assigned to staff member
    - Extract staffId from JWT token
    - Return: { classes: [{ id, name, arm, studentCount }] }
    - Filter by assigned teacher
    - _Requirements: 8.1, 10.2_

  - [ ] 2.4 Implement Class Students API (`api/staff/classes/:classId/students.ts`)
    - GET: return students in a specific class
    - Extract staffId from JWT token
    - Verify staff member is assigned teacher for the class
    - Return: { students: [{ id, name, admissionNumber, gender }] }
    - Return HTTP 403 if staff not assigned to class
    - _Requirements: 8.2, 8.3, 10.3, 10.6_

  - [ ] 2.5 Implement Student Profile API (`api/staff/students/:studentId.ts`)
    - GET: return student profile information
    - Extract staffId from JWT token
    - Verify student is in a class taught by staff member
    - Return: { id, name, admissionNumber, gender, class, arm, email, phone }
    - Return HTTP 403 if student not in staff's classes
    - _Requirements: 8.4, 10.6_

  - [ ] 2.6 Implement Attendance List API (`api/staff/attendance.ts` GET)
    - GET: return student attendance records for a class and date
    - Query params: classId, date
    - Extract staffId from JWT token
    - Verify staff member is assigned teacher for the class
    - Return: { classId, date, students: [{ id, studentId, name, admissionNumber, currentStatus }], history }
    - Return HTTP 403 if staff not assigned to class
    - _Requirements: 4.1, 4.2, 4.8, 10.2, 10.3_

  - [ ] 2.7 Implement Mark Attendance API (`api/staff/attendance.ts` POST)
    - POST: save attendance records for a class session
    - Body: { classId, date, records: [{ studentId, status }] }
    - Extract staffId from JWT token
    - Verify staff member is assigned teacher for the class
    - Validate date is not in the future
    - Return: { count, message }
    - Return HTTP 403 if staff not assigned to class
    - _Requirements: 4.3, 4.4, 4.7, 4.9, 10.3_

  - [ ] 2.8 Implement Leave Requests API (`api/staff/leave.ts` GET)
    - GET: return staff member's leave requests and balance
    - Extract staffId from JWT token
    - Return: { requests: [...], balance: [...] }
    - Filter by staffId
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 10.2_

  - [ ] 2.9 Implement Submit Leave Request API (`api/staff/leave.ts` POST)
    - POST: create new leave request
    - Body: { leaveType, startDate, endDate, reason }
    - Extract staffId from JWT token
    - Validate date range (start ≤ end)
    - Validate required fields
    - Return: { id, leaveType, startDate, endDate, reason, status: 'pending', createdAt }
    - _Requirements: 5.2, 5.3, 5.4, 10.1_

  - [ ] 2.10 Implement Payslips API (`api/staff/payslips.ts`)
    - GET: return staff member's payslips
    - Query params: month (optional), year (optional)
    - Extract staffId from JWT token
    - Return: { payslips: [{ id, month, year, basicSalary, allowances, deductions, netSalary, paymentStatus, paymentDate }] }
    - Filter by staffId
    - Order by year/month descending
    - _Requirements: 6.1, 6.2, 6.3, 10.2_

  - [ ] 2.11 Implement Announcements API (`api/staff/announcements.ts`)
    - GET: return school announcements
    - Query params: limit (default 10), offset (default 0)
    - No staffId filtering (all staff see same announcements)
    - Return: { announcements: [{ id, title, body, date, audience, sentBy }] }
    - _Requirements: 7.1, 10.1_

  - [ ] 2.12 Implement Messages List API (`api/staff/messages.ts` GET)
    - GET: return staff member's messages
    - Query params: limit (default 20), offset (default 0)
    - Extract staffId from JWT token
    - Return: { messages: [{ id, sender, senderRole, subject, body, date, isRead, replies }] }
    - Filter by sender or recipient matching staffId
    - _Requirements: 7.2, 7.6, 10.2_

  - [ ] 2.13 Implement Send Message API (`api/staff/messages.ts` POST)
    - POST: create new message
    - Body: { recipientId, subject, body }
    - Extract staffId from JWT token
    - Associate message with authenticated staff member as sender
    - Return: { id, sender, subject, body, date, isRead }
    - _Requirements: 7.4, 10.1_

  - [ ] 2.14 Implement Mark Message as Read API (`api/staff/messages/:messageId/read.ts`)
    - PUT: mark message as read
    - Extract staffId from JWT token
    - Verify staff member is sender or recipient
    - Return: { id, isRead: true }
    - Return HTTP 403 if staff not involved in message
    - _Requirements: 7.3, 10.6_

  - [ ] 2.15 Implement Staff Profile API (`api/staff/profile.ts`)
    - GET: return staff member's profile
    - Extract staffId from JWT token
    - Return: { id, staffId, name, department, role, email, phone, address, qualification }
    - PUT: update email, phone, address
    - Body: { email?, phone?, address? }
    - Validate email format
    - Return updated profile
    - POST `/change-password`: change password
    - Body: { currentPassword, newPassword }
    - Validate current password
    - Return: { success: true }
    - Reject updates where staffId doesn't match authenticated staff member
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.6_

  - [ ] 2.16 Wire all staff API routes in `vercel.json`
    - Add routes for all 15 new API endpoints under `/api/staff/*`
    - _Requirements: 10.4_

  - [ ] 2.17 Checkpoint — Verify TypeScript build is clean
    - Run `tsc --noEmit` and confirm zero errors across all new API files
    - _Requirements: 10.1_

- [-] 3. Phase 3 — Dashboard Component

  - [ ] 3.1 Create `StaffDashboard` component (`src/components/pages/staff/StaffDashboard.tsx`)
    - Fetch dashboard data from `/api/staff/dashboard`
    - Display staff info card (name, ID, department, role)
    - Display today's schedule grid
    - Display pending leave count
    - Display recent announcements (5 items)
    - Display recent messages (5 items)
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 3.2 Write property tests for StaffDashboard
    - **Property 8: Dashboard displays staff info fields**
    - **Property 9: Dashboard displays today's schedule**
    - **Property 10: Dashboard displays pending leave count**
    - **Property 11: Dashboard displays recent announcements**
    - **Property 12: Dashboard displays recent messages**
    - **Property 13: Dashboard shows loading skeletons**
    - **Property 14: Dashboard error state shows retry button**
    - **Property 15: Dashboard loads within 3 seconds**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [-] 4. Phase 4 — Timetable Component

  - [ ] 4.1 Create `MyTimetable` component (`src/components/pages/staff/MyTimetable.tsx`)
    - Fetch timetable data from `/api/staff/timetable`
    - Display weekly grid view (Mon-Fri columns, time slots rows)
    - Highlight current day
    - Display term selector dropdown
    - Display exam schedule in separate section
    - Show empty state if no schedule assigned
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 4.2 Write property tests for MyTimetable
    - **Property 16: Timetable displays schedule with required fields**
    - **Property 17: Timetable highlights current day**
    - **Property 18: Timetable displays exam schedule**
    - **Property 19: Timetable reloads on term change**
    - **Property 20: Timetable API filters by teacher ID**
    - **Property 21: Timetable shows empty state when no schedule**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [-] 5. Phase 5 — Attendance Component

  - [ ] 5.1 Create `AttendanceMarking` component (`src/components/pages/staff/AttendanceMarking.tsx`)
    - Fetch assigned classes from `/api/staff/classes`
    - Class selector dropdown
    - Date picker (cannot select future dates)
    - Fetch student list from `/api/staff/attendance` GET
    - Display student list with status toggles (present/absent/late)
    - Save button (disabled while submitting)
    - Success/error messages
    - Preserve unsaved selections on error
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9_

  - [ ]* 5.2 Write property tests for AttendanceMarking
    - **Property 22: Attendance page displays assigned classes**
    - **Property 23: Attendance displays student list with status**
    - **Property 24: Attendance save button enabled after marking**
    - **Property 25: Attendance rejects future dates**
    - **Property 26: Attendance displays success message**
    - **Property 27: Attendance preserves data on error**
    - **Property 28: Attendance API rejects unassigned classes**
    - **Property 29: Attendance history is filterable**
    - **Property 30: Attendance submit button disabled during submission**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [-] 6. Phase 6 — Leave Management Component

  - [ ] 6.1 Create `LeaveManagement` component (`src/components/pages/staff/LeaveManagement.tsx`)
    - Fetch leave requests from `/api/staff/leave` GET
    - Display leave request list (status, type, date range, days count)
    - Display leave balance summary by type
    - New leave request form with validation
    - Validate date range (start ≤ end)
    - Validate required fields
    - Status filtering (pending, approved, rejected)
    - Success/error messages
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.2 Write property tests for LeaveManagement
    - **Property 31: Leave page displays all requests with required fields**
    - **Property 32: Leave request creation sets pending status**
    - **Property 33: Leave request validates date range**
    - **Property 34: Leave request validates required fields**
    - **Property 35: Leave request status updates on fetch**
    - **Property 36: Leave API filters by staff ID**
    - **Property 37: Leave page displays balance summary**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [-] 7. Phase 7 — Payslip Component

  - [ ] 7.1 Create `PayslipViewer` component (`src/components/pages/staff/PayslipViewer.tsx`)
    - Fetch payslips from `/api/staff/payslips`
    - Display payslip list (ordered by year/month descending)
    - Payslip detail view (breakdown of salary components)
    - Read-only rendering (no edit/delete controls)
    - Empty state if no payslips
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [ ]* 7.2 Write property tests for PayslipViewer
    - **Property 38: Payslips ordered by year and month descending**
    - **Property 39: Payslip detail displays all components**
    - **Property 40: Payslip API filters by staff ID**
    - **Property 41: Payslips rendered as read-only**
    - **Property 42: Payslips shows empty state when none exist**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5_

- [-] 8. Phase 8 — Communications Component

  - [ ] 8.1 Create `Communications` component (`src/components/pages/staff/Communications.tsx`)
    - Fetch announcements from `/api/staff/announcements`
    - Fetch messages from `/api/staff/messages` GET
    - Display announcements list with search/filter
    - Display message inbox (sender, subject, date, read status)
    - Message detail view with full body
    - Reply functionality
    - Compose new message form
    - Mark as read/unread toggle
    - Search across title, subject, sender
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 8.2 Write property tests for Communications
    - **Property 43: Communications displays announcements with required fields**
    - **Property 44: Messages inbox displays required fields**
    - **Property 45: Opening message marks as read**
    - **Property 46: New message associates with sender**
    - **Property 47: Message reply links to thread**
    - **Property 48: Messages API filters by sender or recipient**
    - **Property 49: Message search filters by search term**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [-] 9. Phase 9 — Class Lists Component

  - [ ] 9.1 Create `ClassLists` component (`src/components/pages/staff/ClassLists.tsx`)
    - Fetch assigned classes from `/api/staff/classes`
    - Class selector (only staff's assigned classes)
    - Fetch student roster from `/api/staff/classes/:classId/students`
    - Display student roster with name, admission number, gender
    - Student profile detail view (read-only)
    - Empty state if no classes assigned
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [ ]* 9.2 Write property tests for ClassLists
    - **Property 50: Class lists displays assigned classes**
    - **Property 51: Class roster displays required student fields**
    - **Property 52: Class students API filters by teacher**
    - **Property 53: Student profile displays required fields**
    - **Property 54: Student profiles rendered as read-only**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Phase 10 — Profile Component

  - [ ] 10.1 Create `Profile` component (`src/components/pages/staff/Profile.tsx`)
    - Fetch profile data from `/api/staff/profile` GET
    - Display current profile data (name, staff ID, department, role, email, phone, address, qualification)
    - Edit form for email, phone, address
    - Password change form with validation
    - Email format validation
    - Password confirmation validation
    - Current password verification
    - Success/error messages
    - Show loading skeletons while fetching
    - Show error state with retry button on failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

  - [ ]* 10.2 Write property tests for Profile
    - **Property 55: Profile page displays all staff fields**
    - **Property 56: Profile update modifies only specified fields**
    - **Property 57: Profile validates email format**
    - **Property 58: Password change validates current password**
    - **Property 59: Password change validates confirmation**
    - **Property 60: Profile API rejects cross-staff updates**
    - **Property 61: Profile update displays success message**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 11. Phase 11 — Final Integration & Validation

  - [x] 11.1 Checkpoint — Verify zero TypeScript errors
    - Run `tsc --noEmit` and confirm zero errors across all new and modified files
    - _Requirements: 10.1_

  - [x] 11.2 Verify authentication and security
    - Confirm staff can only see their own data
    - Confirm no data leakage between staff members
    - Confirm API validates staffId from token
    - Test token expiration and re-login
    - Confirm 403 on cross-access attempts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1, 10.2, 10.3, 10.6_

  - [x] 11.3 Verify end-to-end workflows
    - Test staff login flow
    - Test navigation through all pages
    - Test dashboard data loading and display
    - Test timetable viewing and term selection
    - Test attendance marking and submission
    - Test leave request submission and status updates
    - Test payslip viewing
    - Test message sending and reading
    - Test profile updates and password change
    - _Requirements: All_

  - [x] 11.4 Verify API endpoint coverage
    - Confirm all 15 endpoints are accessible and respond correctly
    - Confirm all endpoints require valid JWT token
    - Confirm all endpoints filter data by staffId
    - Confirm all endpoints validate authorization
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [x] 11.5 Final checkpoint — Ensure all tests pass
    - Run existing test suite and confirm no regressions
    - Verify all API endpoints respond correctly
    - Verify all property tests pass
    - Test data accuracy and calculations
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All API handlers must use `VercelRequest`/`VercelResponse` from `@vercel/node`
- All new API files live under `api/staff/` subdirectory
- All new component files live under `src/components/pages/staff/` subdirectory
- Staff data is auto-filtered by staffId from JWT token
- No staff member can access another staff member's data
- All pages should be mobile-responsive
- Loading states should show skeleton loaders
- Error states should show retry buttons
- Reuse existing `_lib` functions from `api/tenant/_lib/staff.ts`, `api/tenant/timetable/`, and `api/tenant/attendance.ts`
- Follow the API implementation pattern from the design document for JWT extraction and staffId filtering
- Follow the component implementation pattern from the design document for data fetching and error handling
