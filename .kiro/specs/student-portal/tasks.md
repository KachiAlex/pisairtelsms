# Implementation Plan: Student Portal

## Overview

Build a read-only student portal where students can view their academic progress, attendance, timetable, fees, and communications. The portal reuses existing admin APIs with student-specific filtering and role-based access control.

## Tasks

- [ ] 1. Phase 1 — Authentication & Layout Foundation

  - [x] 1.1 Extend auth system to support student role
    - Add `role` field to JWT token (values: 'super_admin', 'tenant_admin', 'student', 'staff', 'parent')
    - Update `AuthStorage` interface to include `role`
    - Update login endpoint to return role based on user type
    - _Requirements: 1.1_

  - [x] 1.2 Create `RoleBasedRoute` component
    - Extend `ProtectedRoute` to validate role
    - Accept `allowedRoles` prop (array of roles)
    - Redirect to `/unauthorized` if role not allowed
    - _Requirements: 1.1_

  - [x] 1.3 Create `StudentLayout` component
    - Simplified sidebar with 7 menu items: Dashboard, Results, Attendance, Timetable, Fees, Communications, Profile
    - Header with student name and logout button
    - Mobile hamburger menu
    - Responsive design (mobile-first)
    - _Requirements: 1.1_

  - [x] 1.4 Update `src/App.tsx` with student routes
    - Add `/student` route with `RoleBasedRoute` (allowedRoles: ['student'])
    - Map sub-routes: `/student/dashboard`, `/student/results`, etc.
    - Render `StudentLayout` as wrapper
    - _Requirements: 1.1_

  - [x] 1.5 Create student login page
    - Form fields: admission number, password
    - Submit to existing login endpoint with `userType='student'`
    - Store JWT token with role='student'
    - Redirect to `/student/dashboard` on success
    - _Requirements: 1.1_

- [ ] 2. Phase 2 — Student-Specific APIs

  - [ ] 2.1 Implement Student Dashboard API (`api/student/dashboard.ts`)
    - GET: aggregate student data (metrics, recent announcements, recent messages)
    - Return: { student, metrics, recentAnnouncements, recentMessages }
    - Validate studentId from JWT token
    - _Requirements: 2.1_

  - [ ] 2.2 Implement Student Results API (`api/student/results.ts`)
    - GET: return student scores filtered by academicSession, term
    - Query params: academicSession, term
    - Return: { results, averageScore, classAverage }
    - Validate studentId from JWT token
    - _Requirements: 3.1_

  - [ ] 2.3 Implement Student Attendance API (`api/student/attendance.ts`)
    - GET: return student attendance records filtered by date range
    - Query params: startDate, endDate
    - Return: { records, attendancePercent, totalPresent, totalAbsent, totalLate }
    - Validate studentId from JWT token
    - _Requirements: 4.1_

  - [ ] 2.4 Implement Student Timetable API (`api/student/timetable.ts`)
    - GET: return student class schedule and exam schedule
    - Query params: termId
    - Return: { schedule, examSchedule }
    - Validate studentId from JWT token
    - _Requirements: 5.1_

  - [ ] 2.5 Implement Student Fees API (`api/student/fees.ts`)
    - GET: return student fee summary and payment history
    - Return: { summary, payments, paymentPlan }
    - Validate studentId from JWT token
    - _Requirements: 6.1_

  - [ ] 2.6 Implement Student Announcements API (`api/student/announcements.ts`)
    - GET: return school announcements (public audience)
    - Query params: limit, offset
    - Return: { announcements }
    - No studentId filtering (all students see same announcements)
    - _Requirements: 7.1_

  - [ ] 2.7 Implement Student Messages API (`api/student/messages.ts`)
    - GET: return student messages
    - Query params: limit, offset
    - POST `/:id/reply`: add reply to message
    - PUT `/:id/read`: mark message as read
    - Return: { messages }
    - Validate studentId from JWT token
    - _Requirements: 7.2_

  - [ ] 2.8 Implement Student Profile API (`api/student/profile.ts`)
    - GET: return student profile information
    - PUT: update email and phone
    - POST `/change-password`: change password
    - Validate studentId from JWT token
    - _Requirements: 8.1_

  - [ ] 2.9 Wire all student API routes in `vercel.json`
    - Add routes for all 8 new API endpoints under `/api/student/*`
    - _Requirements: 2.1_

  - [ ] 2.10 Checkpoint — Verify TypeScript build is clean
    - Run `tsc --noEmit` and confirm zero errors across all new API files
    - _Requirements: 2.1_

- [ ] 3. Phase 3 — Dashboard Component

  - [ ] 3.1 Create `StudentDashboard` component (`src/components/pages/student/StudentDashboard.tsx`)
    - Fetch data from `/api/student/dashboard` on mount
    - Display student name, admission number, class, arm
    - Show 4 metric cards: GPA, Attendance %, Next Exam, Fee Balance
    - Show 5 recent announcements
    - Show 5 recent messages
    - Loading skeletons while fetching
    - Error states with retry buttons
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Create metric card component
    - Display metric name, value, icon, trend (if applicable)
    - Color-code based on status (green for good, amber for warning, red for critical)
    - _Requirements: 2.1_

  - [ ] 3.3 Create announcements section
    - Display title, date, preview text
    - Click to expand full announcement
    - Show "View All" link to announcements page
    - _Requirements: 2.2_

  - [ ] 3.4 Create messages section
    - Display sender, subject, date, read status
    - Show unread count badge
    - Click to expand message
    - Show "View All" link to messages page
    - _Requirements: 2.2_

- [ ] 4. Phase 4 — Results Component

  - [ ] 4.1 Create `MyResults` component (`src/components/pages/student/MyResults.tsx`)
    - Fetch data from `/api/student/results` on mount
    - Filter by academic session and term (dropdowns)
    - Display results table: Subject, CA Score, Exam Score, Total Score, Attendance %
    - Show average score and class average
    - Download result slip button
    - Empty state if no results
    - _Requirements: 3.1, 3.2_

  - [ ] 4.2 Create results table component
    - Sortable columns
    - Highlight top and bottom performers
    - Show comparison to class average
    - _Requirements: 3.1_

  - [ ] 4.3 Create result slip PDF generator
    - Include school letterhead, student info, all scores
    - Show average score and class average
    - Include school stamp/signature area
    - Download as PDF
    - _Requirements: 3.2_

- [ ] 5. Phase 5 — Attendance Component

  - [ ] 5.1 Create `MyAttendance` component (`src/components/pages/student/MyAttendance.tsx`)
    - Fetch data from `/api/student/attendance` on mount
    - Filter by date range (date picker)
    - Display attendance records: Date, Subject, Status, Reason
    - Show attendance percentage and statistics
    - Highlight absences and late arrivals
    - Empty state if no records
    - _Requirements: 4.1, 4.2_

  - [ ] 5.2 Create attendance statistics component
    - Show total present, absent, late, excused
    - Show attendance percentage
    - Show trend (improving/declining)
    - _Requirements: 4.1_

  - [ ] 5.3 Create attendance calendar view (optional)
    - Show month calendar with attendance status per day
    - Color-code: green (present), red (absent), yellow (late), gray (no class)
    - Click day to see details
    - _Requirements: 4.2*_

- [ ] 6. Phase 6 — Timetable Component

  - [ ] 6.1 Create `MyTimetable` component (`src/components/pages/student/MyTimetable.tsx`)
    - Fetch data from `/api/student/timetable` on mount
    - Display weekly grid: Mon-Fri columns, time slots rows
    - Show subject, teacher, room per cell
    - Highlight current day
    - Show exam schedule separately
    - Download timetable button
    - _Requirements: 5.1, 5.2_

  - [ ] 6.2 Create timetable grid component
    - Responsive grid layout
    - Color-code subjects
    - Show teacher name and room
    - Highlight current time slot
    - _Requirements: 5.1_

  - [ ] 6.3 Create exam schedule section
    - Display exam list: Subject, Date, Time, Room, Duration
    - Sort by date
    - Show countdown to next exam
    - _Requirements: 5.2_

  - [ ] 6.4 Create timetable PDF generator
    - Include school letterhead, student info, timetable grid
    - Include exam schedule
    - Include holidays and term dates
    - Download as PDF
    - _Requirements: 5.2_

- [ ] 7. Phase 7 — Fees Component

  - [ ] 7.1 Create `MyFees` component (`src/components/pages/student/MyFees.tsx`)
    - Fetch data from `/api/student/fees` on mount
    - Display fee summary: Total Fees, Paid Amount, Balance, Status
    - Show payment history table: Date, Amount, Method, Reference, Receipt
    - Show payment plan if applicable
    - Highlight overdue amounts
    - Download receipt button per payment
    - _Requirements: 6.1, 6.2_

  - [ ] 7.2 Create fee summary card
    - Show total fees, paid, balance
    - Color-code status (green for paid, amber for partial, red for unpaid)
    - Show payment due date
    - _Requirements: 6.1_

  - [ ] 7.3 Create payment history table
    - Columns: Date, Amount, Method, Reference, Receipt
    - Download receipt button per row
    - Show payment plan details if applicable
    - _Requirements: 6.2_

  - [ ] 7.4 Create receipt PDF generator
    - Include school letterhead, student info, payment details
    - Include receipt number, date, amount, method
    - Include school stamp/signature area
    - Download as PDF
    - _Requirements: 6.2_

  - [ ] 7.5 Create online payment button (optional)
    - Link to payment gateway (if enabled)
    - Show payment methods available
    - _Requirements: 6.3*_

- [ ] 8. Phase 8 — Communications Component

  - [ ] 8.1 Create `Communications` component (`src/components/pages/student/Communications.tsx`)
    - Fetch announcements from `/api/student/announcements` on mount
    - Display announcements list: Title, Date, Preview
    - Click to expand full announcement
    - Search and filter options
    - Pagination (10 per page)
    - Empty state if no announcements
    - _Requirements: 7.1_

  - [ ] 8.2 Create announcements list component
    - Display title, date, sender, preview text
    - Click to expand full announcement
    - Show "View All" link
    - _Requirements: 7.1_

  - [ ] 8.3 Create announcement detail view
    - Display full announcement with formatting
    - Show date, sender, audience
    - Back button to list
    - _Requirements: 7.1_

- [ ] 9. Phase 9 — Messages Component

  - [ ] 9.1 Create `Messages` component (`src/components/pages/student/Messages.tsx`)
    - Fetch messages from `/api/student/messages` on mount
    - Display messages list: Sender, Subject, Date, Read Status
    - Click to expand message
    - Mark as read/unread toggle
    - Reply button opens reply form
    - Search and filter options
    - Pagination (20 per page)
    - Empty state if no messages
    - _Requirements: 7.2_

  - [ ] 9.2 Create messages list component
    - Display sender, subject, date, read status
    - Highlight unread messages
    - Show unread count badge
    - Click to expand message
    - _Requirements: 7.2_

  - [ ] 9.3 Create message detail view
    - Display full message with formatting
    - Show sender, subject, date, body
    - Show replies if any
    - Reply button opens reply form
    - Mark as read/unread toggle
    - Back button to list
    - _Requirements: 7.2_

  - [ ] 9.4 Create reply form
    - Text area for reply
    - Submit button
    - POST to `/api/student/messages/:id/reply`
    - Show success message
    - Refresh message detail
    - _Requirements: 7.2_

- [ ] 10. Phase 10 — Profile Component

  - [ ] 10.1 Create `Profile` component (`src/components/pages/student/Profile.tsx`)
    - Fetch profile from `/api/student/profile` on mount
    - Display personal information: Name, Admission Number, Class, Arm, Gender
    - Display contact information: Email, Phone
    - Display guardian information: Name, Phone
    - Edit button for email and phone
    - Change password form
    - Show login history (last 5 logins)
    - Logout all sessions button
    - _Requirements: 8.1_

  - [ ] 10.2 Create profile information section
    - Display read-only fields
    - Edit button opens edit form
    - _Requirements: 8.1_

  - [ ] 10.3 Create edit profile form
    - Form fields: Email, Phone
    - Validation: valid email, valid phone format
    - Submit button
    - PUT to `/api/student/profile`
    - Show success message
    - Refresh profile
    - _Requirements: 8.1_

  - [ ] 10.4 Create change password form
    - Form fields: Current Password, New Password, Confirm Password
    - Validation: password strength, passwords match
    - Submit button
    - POST to `/api/student/profile/change-password`
    - Show success message
    - Clear form
    - _Requirements: 8.1_

  - [ ] 10.5 Create login history section
    - Display last 5 logins: Date, Time, Device, IP Address
    - Logout all sessions button
    - _Requirements: 8.1*_

- [ ] 11. Phase 11 — Final Integration & Validation

  - [ ] 11.1 Checkpoint — Verify zero TypeScript errors
    - Run `tsc --noEmit` and confirm zero errors across all new and modified files
    - _Requirements: 2.1_

  - [ ] 11.2 Verify end-to-end workflows
    - Test student login flow
    - Test navigation through all pages
    - Test data filtering by studentId
    - Test PDF downloads
    - Test message replies
    - _Requirements: All_

  - [ ] 11.3 Verify security
    - Confirm student can only see their own data
    - Confirm no data leakage between students
    - Confirm API validates studentId from token
    - Test token expiration
    - _Requirements: 1.1_

  - [ ] 11.4 Final checkpoint — Ensure all tests pass
    - Run existing test suite and confirm no regressions
    - Verify all API endpoints respond correctly
    - Test data accuracy and calculations
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All API handlers must use `VercelRequest`/`VercelResponse` from `@vercel/node`
- All new API files live under `api/student/` subdirectory
- All new component files live under `src/components/pages/student/` subdirectory
- Student data is auto-filtered by studentId from JWT token
- No student can access another student's data
- All pages should be mobile-responsive
- Loading states should show skeleton loaders
- Error states should show retry buttons

