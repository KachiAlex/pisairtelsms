# Requirements Document

## Introduction

Build a Staff Portal for ScholarX that gives teachers and administrative staff a dedicated, role-scoped interface. Staff members can view their personal dashboard, manage their class timetable, mark student attendance, submit leave requests, view payslips, communicate with parents and admin, and update their own profile. The portal mirrors the Student Portal architecture (StaffLayout, RoleBasedRoute, staff-specific APIs) and reuses existing admin-side data with staff-scoped filtering enforced at the API layer.

## Glossary

- **Staff_Portal**: The web application interface accessible only to users with the `staff` role JWT token.
- **Staff_Member**: A school employee (teacher or administrative staff) with a `staff` role in the auth system.
- **Staff_Dashboard**: The landing page of the Staff Portal showing today's schedule, metrics, announcements, and tasks.
- **Class_List**: The set of students assigned to a class section that a Staff_Member teaches.
- **Student_Attendance**: A record of whether each student in a class was present, absent, or late on a given date.
- **Leave_Request**: A formal request by a Staff_Member for approved time off, with type, date range, and reason.
- **Payslip**: A read-only record of a Staff_Member's salary, allowances, deductions, and net pay for a given month.
- **StaffLayout**: The shell React component providing sidebar navigation, header, and page routing for the Staff_Portal.
- **RoleBasedRoute**: The existing auth guard component that restricts route access by JWT role.
- **Staff_API**: The set of `api/staff/*` endpoints that proxy admin data filtered to the authenticated Staff_Member's identity.
- **Timetable**: The weekly schedule of classes a Staff_Member is assigned to teach, sourced from existing timetable APIs.
- **Announcement**: A school-wide or department-targeted broadcast message created by admin.
- **Message**: A direct communication between a Staff_Member and a parent or admin user.

## Requirements

### Requirement 1: Authentication and Session Management

**User Story:** As a staff member, I want to log in with my staff credentials and have my session persist securely, so that I can access my portal without re-authenticating on every visit.

#### Acceptance Criteria

1. WHEN a staff member submits valid staff ID and password, THE Staff_Portal SHALL authenticate the user and store a JWT token with `role: 'staff'` in localStorage via the existing `setAuthInStorage` utility.
2. WHEN a staff member submits an invalid staff ID or password, THE Staff_Portal SHALL display an error message without revealing which credential was incorrect.
3. WHEN an unauthenticated user navigates to any Staff_Portal route, THE RoleBasedRoute SHALL redirect the user to `/staff/login`.
4. WHEN a user with a non-`staff` role attempts to access a Staff_Portal route, THE RoleBasedRoute SHALL redirect the user to `/unauthorized`.
5. WHEN a staff member's JWT token has expired, THE Staff_Portal SHALL redirect the user to `/staff/login` and clear the stored auth data.
6. WHEN a staff member clicks Sign Out, THE Staff_Portal SHALL clear auth data from localStorage and redirect to `/staff/login`.
7. THE Staff_Portal SHALL maintain the staff member's session for 24 hours from the time of login.

---

### Requirement 2: Staff Dashboard

**User Story:** As a staff member, I want to see my key information at a glance when I log in, so that I can quickly understand my day without navigating multiple pages.

#### Acceptance Criteria

1. WHEN a staff member loads the dashboard, THE Staff_Dashboard SHALL display the staff member's name, staff ID, department, and role.
2. WHEN a staff member loads the dashboard, THE Staff_Dashboard SHALL display today's scheduled classes including subject, class name, time slot, and room.
3. WHEN a staff member loads the dashboard, THE Staff_Dashboard SHALL display the count of pending leave requests awaiting approval.
4. WHEN a staff member loads the dashboard, THE Staff_Dashboard SHALL display the 5 most recent school announcements with title, date, and preview text.
5. WHEN a staff member loads the dashboard, THE Staff_Dashboard SHALL display the 5 most recent messages with sender name, subject, and date.
6. WHILE dashboard data is being fetched, THE Staff_Dashboard SHALL display loading skeleton placeholders for each section.
7. IF a dashboard API call fails, THEN THE Staff_Dashboard SHALL display an error state with a retry button for the affected section.
8. WHEN a staff member loads the dashboard, THE Staff_Dashboard SHALL load all dashboard data within 3 seconds under normal network conditions.

---

### Requirement 3: Class Timetable

**User Story:** As a staff member, I want to view my assigned class timetable, so that I can plan my teaching schedule and know which classes I have each day.

#### Acceptance Criteria

1. WHEN a staff member navigates to the timetable page, THE Staff_Portal SHALL display the staff member's weekly teaching schedule in a grid format showing day, time slot, subject, class name, and room.
2. WHEN a staff member views the timetable, THE Staff_Portal SHALL highlight the current day's column.
3. WHEN a staff member views the timetable, THE Staff_Portal SHALL display the exam schedule for the current term in a separate section.
4. WHEN a staff member selects a different term, THE Staff_Portal SHALL reload the timetable data for the selected term.
5. THE Staff_API SHALL return only timetable entries where the authenticated staff member is the assigned teacher, filtered by `teacherId` from the JWT token.
6. IF no timetable entries exist for the staff member in the selected term, THEN THE Staff_Portal SHALL display an empty state message indicating no schedule is assigned.

---

### Requirement 4: Student Attendance Marking

**User Story:** As a teacher, I want to mark attendance for students in my classes, so that the school has an accurate record of student presence.

#### Acceptance Criteria

1. WHEN a staff member navigates to the attendance page, THE Staff_Portal SHALL display a list of the staff member's assigned classes for selection.
2. WHEN a staff member selects a class and date, THE Staff_Portal SHALL display the full Class_List for that class with each student's current attendance status for that date.
3. WHEN a staff member marks a student's attendance status as present, absent, or late, THE Staff_Portal SHALL enable a save action for the entire class session.
4. WHEN a staff member submits attendance records, THE Staff_API SHALL validate that the date is not in the future before saving.
5. WHEN attendance is successfully saved, THE Staff_Portal SHALL display a success confirmation message.
6. IF attendance submission fails, THEN THE Staff_Portal SHALL display an error message and preserve the staff member's unsaved selections.
7. THE Staff_API SHALL reject attendance submissions for classes not assigned to the authenticated staff member.
8. WHEN a staff member views attendance history, THE Staff_Portal SHALL display previously submitted attendance records filterable by class and date range.
9. WHILE attendance is being submitted, THE Staff_Portal SHALL disable the submit button to prevent duplicate submissions.

---

### Requirement 5: Leave Request Management

**User Story:** As a staff member, I want to submit and track leave requests, so that I can formally request time off and monitor approval status.

#### Acceptance Criteria

1. WHEN a staff member navigates to the leave page, THE Staff_Portal SHALL display all of the staff member's leave requests with status (pending, approved, rejected), leave type, date range, and number of days.
2. WHEN a staff member submits a new leave request with leave type, start date, end date, and reason, THE Staff_API SHALL create a leave request with status `pending` and associate it with the authenticated staff member's ID.
3. WHEN a staff member submits a leave request where the start date is after the end date, THE Staff_Portal SHALL display a validation error and prevent submission.
4. WHEN a staff member submits a leave request with a missing required field (leave type, start date, end date, or reason), THE Staff_Portal SHALL display a field-level validation error and prevent submission.
5. WHEN a leave request status changes to approved or rejected, THE Staff_Portal SHALL reflect the updated status on the next data fetch.
6. THE Staff_API SHALL return only leave requests belonging to the authenticated staff member's ID.
7. WHEN a staff member views the leave page, THE Staff_Portal SHALL display a summary of leave balance by type if available.

---

### Requirement 6: Payslip Viewing

**User Story:** As a staff member, I want to view my payslips, so that I can review my salary details and payment history.

#### Acceptance Criteria

1. WHEN a staff member navigates to the payslips page, THE Staff_Portal SHALL display a list of payslip records ordered by year and month descending.
2. WHEN a staff member selects a payslip, THE Staff_Portal SHALL display the breakdown including basic salary, allowances, deductions, net salary, payment status, and payment date.
3. THE Staff_API SHALL return only payroll records where `staffId` matches the authenticated staff member's ID from the JWT token.
4. THE Staff_Portal SHALL render the payslips page as read-only with no edit or delete controls.
5. IF no payslip records exist for the staff member, THEN THE Staff_Portal SHALL display an empty state message.

---

### Requirement 7: Communications

**User Story:** As a staff member, I want to send and receive messages and view school announcements, so that I can stay informed and communicate with parents and admin.

#### Acceptance Criteria

1. WHEN a staff member navigates to the communications page, THE Staff_Portal SHALL display school announcements with title, date, body, and target audience.
2. WHEN a staff member navigates to the messages section, THE Staff_Portal SHALL display the message inbox showing sender, subject, date, and read/unread status.
3. WHEN a staff member opens a message, THE Staff_Portal SHALL mark the message as read and display the full message body.
4. WHEN a staff member composes a new message with a recipient (parent or admin), subject, and body, THE Staff_API SHALL send the message and associate it with the authenticated staff member as sender.
5. WHEN a staff member replies to a message, THE Staff_API SHALL create a reply linked to the original message thread.
6. THE Staff_API SHALL return only messages where the authenticated staff member is the sender or recipient.
7. WHEN a staff member searches announcements or messages, THE Staff_Portal SHALL filter results by the search term against title, subject, and sender fields.

---

### Requirement 8: Class Lists and Student Profiles

**User Story:** As a teacher, I want to view the list of students in my assigned classes, so that I can know my students and access their basic information.

#### Acceptance Criteria

1. WHEN a staff member navigates to the class lists page, THE Staff_Portal SHALL display all classes assigned to the staff member.
2. WHEN a staff member selects a class, THE Staff_Portal SHALL display the roster of enrolled students with name, admission number, and gender.
3. THE Staff_API SHALL return only students enrolled in classes where the authenticated staff member is the assigned teacher.
4. WHEN a staff member selects a student from the class list, THE Staff_Portal SHALL display the student's basic profile information (name, admission number, class, contact details).
5. THE Staff_Portal SHALL render student profile information as read-only with no edit controls.

---

### Requirement 9: Staff Profile Management

**User Story:** As a staff member, I want to view and update my own profile information, so that the school has accurate contact details for me.

#### Acceptance Criteria

1. WHEN a staff member navigates to the profile page, THE Staff_Portal SHALL display the staff member's current profile data including name, staff ID, department, role, email, phone, address, and qualification.
2. WHEN a staff member updates their email, phone, or address and submits the form, THE Staff_API SHALL update only those fields for the authenticated staff member's record.
3. WHEN a staff member submits a profile update with an invalid email format, THE Staff_Portal SHALL display a validation error and prevent submission.
4. WHEN a staff member changes their password by providing the current password, new password, and confirmation, THE Staff_API SHALL validate the current password before updating.
5. WHEN a staff member submits a new password where the new password and confirmation do not match, THE Staff_Portal SHALL display a validation error and prevent submission.
6. THE Staff_API SHALL reject profile update requests where the `staffId` in the request does not match the authenticated staff member's ID from the JWT token.
7. WHEN a profile update is successfully saved, THE Staff_Portal SHALL display a success confirmation message.

---

### Requirement 10: Staff-Specific API Layer

**User Story:** As a system, I want staff portal API endpoints to enforce staff-scoped data access, so that staff members can only read and write data they are authorized to access.

#### Acceptance Criteria

1. THE Staff_API SHALL extract the staff member's identity from the JWT token on every request and reject requests with missing or invalid tokens with HTTP 401.
2. THE Staff_API SHALL filter all data queries by the authenticated staff member's ID, preventing access to other staff members' leave, payroll, and attendance records.
3. WHEN a staff member submits attendance for a class, THE Staff_API SHALL verify the staff member is the assigned teacher for that class before saving.
4. THE Staff_API SHALL expose the following endpoints: `GET /api/staff/dashboard`, `GET /api/staff/timetable`, `GET /api/staff/classes`, `GET /api/staff/attendance`, `POST /api/staff/attendance`, `GET /api/staff/leave`, `POST /api/staff/leave`, `GET /api/staff/payslips`, `GET /api/staff/messages`, `POST /api/staff/messages`, `PUT /api/staff/messages/:id/read`, `GET /api/staff/announcements`, `GET /api/staff/profile`, `PUT /api/staff/profile`, `POST /api/staff/change-password`.
5. THE Staff_API SHALL reuse existing `_lib` data access functions from `api/tenant/_lib/staff.ts`, `api/tenant/timetable/`, and `api/tenant/attendance.ts` rather than duplicating database logic.
6. IF a staff member attempts to access a resource belonging to another staff member, THEN THE Staff_API SHALL return HTTP 403.
