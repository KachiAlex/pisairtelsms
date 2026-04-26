# Implementation Plan: Student Portal

## Overview

Build a read-only student portal where students can view their academic progress, attendance, timetable, fees, and communications. The portal reuses existing admin APIs with student-specific filtering and role-based access control.

## Tasks

- [x] 1. Phase 1 — Authentication & Layout Foundation

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

- [x] 2. Phase 2 — Student-Specific APIs

  - [x] 2.1 Implement Student Dashboard API (`api/student/dashboard.ts`)
    - GET: aggregate student data (metrics, recent announcements, recent messages)
    - Return: { student, metrics, recentAnnouncements, recentMessages }
    - Validate studentId from JWT token
    - _Requirements: 2.1_

  - [x] 2.2 Implement Student Results API (`api/student/results.ts`)
    - GET: return student scores filtered by academicSession, term
    - Query params: academicSession, term
    - Return: { results, averageScore, classAverage }
    - Validate studentId from JWT token
    - _Requirements: 3.1_

  - [x] 2.3 Implement Student Attendance API (`api/student/attendance.ts`)
    - GET: return student attendance records filtered by date range
    - Query params: startDate, endDate
    - Return: { records, attendancePercent, totalPresent, totalAbsent, totalLate }
    - Validate studentId from JWT token
    - _Requirements: 4.1_

  - [x] 2.4 Implement Student Timetable API (`api/student/timetable.ts`)
    - GET: return student class schedule and exam schedule
    - Query params: termId
    - Return: { schedule, examSchedule }
    - Validate studentId from JWT token
    - _Requirements: 5.1_

  - [x] 2.5 Implement Student Fees API (`api/student/fees.ts`)
    - GET: return student fee summary and payment history
    - Return: { summary, payments, paymentPlan }
    - Validate studentId from JWT token
    - _Requirements: 6.1_

  - [x] 2.6 Implement Student Announcements API (`api/student/announcements.ts`)
    - GET: return school announcements (public audience)
    - Query params: limit, offset
    - Return: { announcements }
    - No studentId filtering (all students see same announcements)
    - _Requirements: 7.1_

  - [x] 2.7 Implement Student Messages API (`api/student/messages.ts`)
    - GET: return student messages
    - Query params: limit, offset
    - POST `/:id/reply`: add reply to message
    - PUT `/:id/read`: mark message as read
    - Return: { messages }
    - Validate studentId from JWT token
    - _Requirements: 7.2_

  - [x] 2.8 Implement Student Profile API (`api/student/profile.ts`)
    - GET: return student profile information
    - PUT: update email and phone
    - POST `/change-password`: change password
    - Validate studentId from JWT token
    - _Requirements: 8.1_

  - [x] 2.9 Wire all student API routes in `vercel.json`
    - Add routes for all 8 new API endpoints under `/api/student/*`
    - _Requirements: 2.1_

  - [x] 2.10 Checkpoint — Verify TypeScript build is clean
    - Run `tsc --noEmit` and confirm zero errors across all new API files
    - _Requirements: 2.1_

- [x] 3. Phase 3 — Dashboard Component

  - [x] 3.1 Create `StudentDashboard` component (`src/components/pages/student/StudentDashboard.tsx`)
  - [x] 3.2 Create metric card component
  - [x] 3.3 Create announcements section
  - [x] 3.4 Create messages section

- [x] 4. Phase 4 — Results Component

  - [x] 4.1 Create `MyResults` component (`src/components/pages/student/MyResults.tsx`)
  - [x] 4.2 Create results table component
  - [x] 4.3 Create result slip PDF generator

- [x] 5. Phase 5 — Attendance Component

  - [x] 5.1 Create `MyAttendance` component (`src/components/pages/student/MyAttendance.tsx`)
  - [x] 5.2 Create attendance statistics component

- [x] 6. Phase 6 — Timetable Component

  - [x] 6.1 Create `MyTimetable` component (`src/components/pages/student/MyTimetable.tsx`)
  - [x] 6.2 Create timetable grid component
  - [x] 6.3 Create exam schedule section

- [x] 7. Phase 7 — Fees Component

  - [x] 7.1 Create `MyFees` component (`src/components/pages/student/MyFees.tsx`)
  - [x] 7.2 Create fee summary card
  - [x] 7.3 Create payment history table

- [x] 8. Phase 8 — Communications Component

  - [x] 8.1 Create `Communications` component (`src/components/pages/student/Communications.tsx`)
  - [x] 8.2 Create announcements list component
  - [x] 8.3 Create announcement detail view

- [x] 9. Phase 9 — Messages Component

  - [x] 9.1 Create `Messages` component (`src/components/pages/student/Messages.tsx`)
  - [x] 9.2 Create messages list component
  - [x] 9.3 Create message detail view
  - [x] 9.4 Create reply form

- [x] 10. Phase 10 — Profile Component

  - [x] 10.1 Create `Profile` component (`src/components/pages/student/Profile.tsx`)
  - [x] 10.2 Create profile information section
  - [x] 10.3 Create edit profile form
  - [x] 10.4 Create change password form
  - [x] 10.5 Create login history section

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

