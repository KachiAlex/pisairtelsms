# Implementation Plan: Staff Portal

## Overview

Build a staff portal where teachers and administrative staff can view their dashboard, manage their timetable, mark student attendance, submit leave requests, view payslips, communicate with parents and admin, and update their profile. The portal mirrors the Student Portal architecture, reusing existing admin APIs with staff-specific filtering and role-based access control.

## Tasks

- [x] 1. Phase 1 — Authentication & Layout Foundation

  - [x] 1.1 Extend auth system to support staff role
    - Verify `role` field in JWT token includes 'staff' value
    - Verify `AuthStorage` interface includes `role` field
    - Verify login endpoint returns role based on user type
    - _Requirements: 1.1_

  - [x] 1.2 Create `StaffLoginPage` component
    - Form fields: staff ID, password
    - Submit to existing login endpoint with `userType='staff'`
    - Store JWT token with role='staff'
    - Redirect to `/staff/dashboard` on success
    - Display generic error message on invalid credentials
    - _Requirements: 1.1, 1.2_

  - [x] 1.3 Create `StaffLayout` component
    - Sidebar with 8 menu items: Dashboard, My Timetable, Attendance, Leave, Payslips, Communications, Class Lists, Profile
    - Header with staff name, department, and logout button
    - Mobile hamburger menu
    - Responsive design (mobile-first)
    - Active page highlighting
    - _Requirements: 1.1_

  - [x] 1.4 Update `src/App.tsx` with staff routes
    - Add `/staff` route with `RoleBasedRoute` (allowedRoles: ['staff'])
    - Map sub-routes: `/staff/dashboard`, `/staff/timetable`, `/staff/attendance`, `/staff/leave`, `/staff/payslips`, `/staff/communications`, `/staff/class-lists`, `/staff/profile`
    - Render `StaffLayout` as wrapper
    - _Requirements: 1.1_

  - [x] 1.5 Wire staff login into `AccessPortalPage`
    - Add staff login option to portal selection page
    - Link to `/staff/login` route
    - _Requirements: 1.1_

- [x] 2. Phase 2 — Staff-Specific APIs (15 Endpoints)

  - [x] 2.1 Implement Staff Dashboard API (`api/staff/dashboard.ts`)
    - _Requirements: 2.1, 10.1_

  - [x] 2.2 Implement Staff Timetable API (`api/staff/timetable.ts`)
    - _Requirements: 3.1, 3.4, 3.5, 10.2_

  - [x] 2.3 Implement Staff Classes API (`api/staff/classes.ts`)
    - _Requirements: 8.1, 10.2_

  - [x] 2.4 Implement Class Students API (`api/staff/classes/:classId/students.ts`)
    - _Requirements: 8.2, 8.3, 10.3, 10.6_

  - [x] 2.5 Implement Student Profile API (`api/staff/students/:studentId.ts`)
    - _Requirements: 8.4, 10.6_

  - [x] 2.6 Implement Attendance List API (`api/staff/attendance.ts` GET)
    - _Requirements: 4.1, 4.2, 4.8, 10.2, 10.3_

  - [x] 2.7 Implement Mark Attendance API (`api/staff/attendance.ts` POST)
    - _Requirements: 4.3, 4.4, 4.7, 4.9, 10.3_

  - [x] 2.8 Implement Leave Requests API (`api/staff/leave.ts` GET)
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 10.2_

  - [x] 2.9 Implement Submit Leave Request API (`api/staff/leave.ts` POST)
    - _Requirements: 5.2, 5.3, 5.4, 10.1_

  - [x] 2.10 Implement Payslips API (`api/staff/payslips.ts`)
    - _Requirements: 6.1, 6.2, 6.3, 10.2_

  - [x] 2.11 Implement Announcements API (`api/staff/announcements.ts`)
    - _Requirements: 7.1, 10.1_

  - [x] 2.12 Implement Messages List API (`api/staff/messages.ts` GET)
    - _Requirements: 7.2, 7.6, 10.2_

  - [x] 2.13 Implement Send Message API (`api/staff/messages.ts` POST)
    - _Requirements: 7.4, 10.1_

  - [x] 2.14 Implement Mark Message as Read API (`api/staff/messages/:messageId/read.ts`)
    - _Requirements: 7.3, 10.6_

  - [x] 2.15 Implement Staff Profile API (`api/staff/profile.ts`)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.6_

  - [x] 2.16 Wire all staff API routes in `vercel.json`
    - _Requirements: 10.4_

  - [x] 2.17 Checkpoint — Verify TypeScript build is clean
    - _Requirements: 10.1_

- [x] 3. Phase 3 — Dashboard Component

  - [x] 3.1 Create `StaffDashboard` component (`src/components/pages/staff/StaffDashboard.tsx`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 4. Phase 4 — Timetable Component

  - [x] 4.1 Create `MyTimetable` component (`src/components/pages/staff/MyTimetable.tsx`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [x] 5. Phase 5 — Attendance Component

  - [x] 5.1 Create `AttendanceMarking` component (`src/components/pages/staff/AttendanceMarking.tsx`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9_

- [x] 6. Phase 6 — Leave Management Component

  - [x] 6.1 Create `LeaveManagement` component (`src/components/pages/staff/LeaveManagement.tsx`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 7. Phase 7 — Payslip Component

  - [x] 7.1 Create `PayslipViewer` component (`src/components/pages/staff/PayslipViewer.tsx`)
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 8. Phase 8 — Communications Component

  - [x] 8.1 Create `Communications` component (`src/components/pages/staff/Communications.tsx`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 9. Phase 9 — Class Lists Component

  - [x] 9.1 Create `ClassLists` component (`src/components/pages/staff/ClassLists.tsx`)
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 10. Phase 10 — Profile Component

  - [x] 10.1 Create `Profile` component (`src/components/pages/staff/Profile.tsx`)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

- [x] 11. Phase 11 — Final Integration & Validation

  - [x] 11.1 Checkpoint — Verify zero TypeScript errors
    - _Requirements: 10.1_

  - [x] 11.2 Verify authentication and security
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1, 10.2, 10.3, 10.6_

  - [x] 11.3 Verify end-to-end workflows
    - _Requirements: All_

  - [x] 11.4 Verify API endpoint coverage
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [x] 11.5 Final checkpoint — Ensure all tests pass
    - _Requirements: All_

## Notes

- All API handlers use `VercelRequest`/`VercelResponse` from `@vercel/node`
- All API files live under `api/staff/` subdirectory
- All component files live under `src/components/pages/staff/` subdirectory
- Staff data is auto-filtered by staffId from JWT token
- All pages are mobile-responsive with loading states and error states
