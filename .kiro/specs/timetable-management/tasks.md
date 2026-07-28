# Implementation Plan: Timetable Management System

## Overview

Transform the existing view-only TimetableScheduling component into a full-featured timetable management hub with configuration, creation, conflict detection, change request management, and publishing capabilities. Consolidate the sidebar navigation into a single unified entry point with sub-tabs.

## Tasks

- [x] 1. Phase 1 — Database Tables & API Foundation

  - [x] 1.1 Implement Calendar API (`api/tenant/timetable/calendar.ts`)
    - Auto-create `school_terms`, `holidays`, and `exam_periods` tables on startup
    - GET: return all terms, holidays, exam periods for tenant (query params: `academicYear`, `termId`)
    - POST `/terms`: validate non-overlapping dates, insert term, return 201
    - PUT `/terms/:id`: update term fields, return updated record, 404 if not found
    - DELETE `/terms/:id`: reject if schedules exist, return 204
    - POST `/holidays`: validate dates within term, insert, return 201
    - POST `/exam-periods`: validate dates within term, insert, return 201
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 1.1–1.8_

  - [x] 1.2 Implement Time Slots API (`api/tenant/timetable/time-slots.ts`)
    - Auto-create `time_slots` table on startup
    - GET: return all time slots ordered by `day_of_week`, `sequence`
    - POST: validate no overlapping slots for same day, compute `duration_minutes`, insert, return 201
    - PUT `/:id`: update slot fields, return updated record
    - DELETE `/:id`: return 204
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 2.1–2.8_

  - [x] 1.3 Implement Class Schedules API (`api/tenant/timetable/class-schedules.ts`)
    - Auto-create `class_schedules` and `class_schedule_entries` tables on startup
    - GET: return schedules filtered by `classId`, `termId`
    - POST: create schedule for class+term, return 201
    - GET `/:id`: return schedule with all entries
    - POST `/:id/entries`: validate teacher availability, detect conflicts, insert entry, return 201
    - PUT `/:scheduleId/entries/:entryId`: update entry, re-validate conflicts
    - DELETE `/:scheduleId/entries/:entryId`: remove entry, return 204
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 3.1–3.9_

  - [x] 1.4 Implement Teacher Schedules API (`api/tenant/timetable/teacher-schedules.ts`)
    - Auto-create `teacher_schedules` and `teacher_workload` tables on startup
    - GET: return teacher schedules filtered by `teacherId`, `termId`
    - GET `/:id`: return schedule with workload breakdown
    - PUT `/:id`: update `maxHoursLimit`, return updated record
    - Auto-compute `total_hours` and `total_classes` from class schedule entries
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 4.1–4.8_

  - [x] 1.5 Implement Exam Schedules API (`api/tenant/timetable/exam-schedules.ts`)
    - Auto-create `exam_schedules`, `exam_halls`, `exam_hall_assignments`, and `invigilators` tables on startup
    - GET: return exam schedules filtered by `examPeriodId`, `subjectId`
    - POST: validate exam date within exam period, insert, return 201
    - GET `/:id`: return schedule with hall assignments and invigilators
    - POST `/:id/hall-assignments`: validate `studentCount` ≤ hall capacity, insert, return 201
    - POST `/:id/invigilators`: validate no overlapping invigilator assignments, insert, return 201
    - DELETE `/:id/invigilators/:invigilatorId`: remove invigilator, return 204
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 5.1–5.11_

  - [x] 1.6 Implement Conflicts API (`api/tenant/timetable/conflicts.ts`)
    - Auto-create `conflicts` table on startup
    - GET: return conflicts filtered by `status`, `severity`, `entityType`
    - POST `/:id/resolve`: update status to `resolved`, record `resolutionNotes` and `resolved_at`
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 6.1–6.8_

  - [x] 1.7 Implement Change Requests API (`api/tenant/timetable/change-requests.ts`)
    - Auto-create `change_requests` table on startup
    - GET: return requests filtered by `status`
    - POST: validate entity exists, insert with status `pending`, return 201
    - PUT `/:id`: update status (`approved`/`rejected`), record reviewer and comments
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 7.1–7.10_

  - [x] 1.8 Implement Publish API (`api/tenant/timetable/publish.ts`)
    - POST: validate all schedules are conflict-free before publishing, mark as published, return 201
    - GET `/status`: return list of published schedules with `publishedAt` timestamps
    - Return 400 with conflict details if unresolved conflicts exist
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 8.1–8.9_

  - [x] 1.9 Wire all timetable API routes in `vercel.json`
    - Add routes for all 8 new API endpoints under `/api/tenant/timetable/*`
    - _Requirements: 10.1_

  - [x] 1.10 Checkpoint — Verify TypeScript build is clean
    - Run `tsc --noEmit` and confirm zero errors across all new API files
    - _Requirements: 10.8_

- [x] 2. Phase 2 — Sidebar Navigation Consolidation

  - [x] 2.1 Update `src/components/Sidebar.tsx` to consolidate timetable navigation
    - Replace the 3 separate timetable menu items (`class-timetable`, `teacher-timetable`, `exam-timetable`) with a single `timetable` parent item
    - Add 4 children: `timetable-configure`, `timetable-class`, `timetable-teacher`, `timetable-exam`
    - Labels: "Configure", "Class Timetable", "Teacher Timetable", "Exam Schedule"
    - _Requirements: 9.1, 9.2_

  - [x] 2.2 Update `src/App.tsx` route handling for new timetable sub-tabs
    - Map `timetable-configure` → `<TimetableScheduling initialView="configure" />`
    - Map `timetable-class` → `<TimetableScheduling initialView="class" />`
    - Map `timetable-teacher` → `<TimetableScheduling initialView="teacher" />`
    - Map `timetable-exam` → `<TimetableScheduling initialView="exam" />`
    - Remove old `class-timetable`, `teacher-timetable`, `exam-timetable` case entries
    - _Requirements: 9.3–9.6_

- [x] 3. Phase 3 — Configure Tab (Calendar & Time Slots)

  - [x] 3.1 Create `src/components/pages/timetable/ConfigureTab.tsx`
    - Two-section layout: "School Calendar" and "Time Slots & Breaks"
    - Fetch calendar data from `/api/tenant/timetable/calendar` on mount
    - Fetch time slots from `/api/tenant/timetable/time-slots` on mount
    - Show loading skeletons while fetching
    - _Requirements: 1.1, 2.1, 9.3_

  - [x] 3.2 Create `TermManager` sub-component within ConfigureTab
    - List existing terms with start/end dates and academic year
    - "Add Term" button opens inline form: name, academicYear, startDate, endDate
    - Validate non-overlapping dates client-side before POST
    - On save, POST to `/api/tenant/timetable/calendar/terms` and refresh list
    - Edit and delete actions per term row
    - _Requirements: 1.1–1.4, 1.7_

  - [x] 3.3 Create `HolidayManager` sub-component within ConfigureTab
    - List holidays grouped by term
    - "Add Holiday" form: name, termId (dropdown), startDate, endDate
    - POST to `/api/tenant/timetable/calendar/holidays` on save
    - _Requirements: 1.3, 1.4, 1.7_

  - [x] 3.4 Create `ExamPeriodManager` sub-component within ConfigureTab
    - List exam periods grouped by term
    - "Add Exam Period" form: name, termId (dropdown), startDate, endDate
    - POST to `/api/tenant/timetable/calendar/exam-periods` on save
    - _Requirements: 1.5, 1.6, 1.7_

  - [x] 3.5 Create `TimeSlotManager` sub-component within ConfigureTab
    - Display time slots in a day-by-day grid (Mon–Fri columns)
    - "Add Time Slot" form: name, dayOfWeek, startTime, endTime, isBreak toggle
    - Validate no overlapping slots for same day before POST
    - POST to `/api/tenant/timetable/time-slots` on save
    - Color-code break slots differently from teaching slots
    - _Requirements: 2.1–2.7_

- [x] 4. Phase 4 — Class Timetable Builder

  - [x] 4.1 Refactor `src/components/pages/TimetableScheduling.tsx` into `TimetableHub`
    - Extend `TimetableView` type to include `'configure'`
    - Add `configure` tab to the tab switcher
    - Render `<ConfigureTab />` when `activeView === 'configure'`
    - Keep existing class/teacher/exam views intact for now
    - _Requirements: 9.1–9.7_

  - [x] 4.2 Create `src/components/pages/timetable/ClassTimetableTab.tsx`
    - Replace hardcoded `schedules.class` data with API fetch from `/api/tenant/timetable/class-schedules`
    - Class selector fetches available classes from `/api/tenant/students` (distinct classes)
    - Term selector fetches terms from `/api/tenant/timetable/calendar`
    - Render timetable grid using fetched `class_schedule_entries`
    - Each cell shows subject + teacher; empty cells show "+" add button
    - _Requirements: 3.1, 3.2, 3.8, 3.9_

  - [x] 4.3 Create `TimetableEntryModal` for adding/editing schedule entries
    - Form fields: subject (dropdown), teacher (dropdown from staff API), room (text)
    - On submit, POST to `/api/tenant/timetable/class-schedules/:id/entries`
    - If API returns conflict error, display conflict details inline
    - On success, refresh the timetable grid
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 4.4 Wire ClassTimetableTab into TimetableHub
    - Render `<ClassTimetableTab />` when `activeView === 'class'`
    - Pass selected term and class as props
    - _Requirements: 9.4_

- [x] 5. Phase 5 — Teacher Timetable View

  - [x] 5.1 Create `src/components/pages/timetable/TeacherTimetableTab.tsx`
    - Replace hardcoded `schedules.teacher` data with API fetch from `/api/tenant/timetable/teacher-schedules`
    - Teacher selector fetches staff from `/api/tenant/staff`
    - Render teacher's weekly schedule grid from fetched data
    - Show workload summary: total hours, total classes, max limit indicator
    - Highlight over-capacity teachers in amber
    - _Requirements: 4.1–4.6_

  - [x] 5.2 Wire TeacherTimetableTab into TimetableHub
    - Render `<TeacherTimetableTab />` when `activeView === 'teacher'`
    - _Requirements: 9.5_

- [x] 6. Phase 6 — Exam Schedule Builder

  - [x] 6.1 Create `src/components/pages/timetable/ExamScheduleTab.tsx`
    - Replace hardcoded `schedules.exam` data with API fetch from `/api/tenant/timetable/exam-schedules`
    - Exam period selector fetches from `/api/tenant/timetable/calendar`
    - Render exam schedule list with date, time, subject, hall, invigilator count
    - "Add Exam" button opens `ExamEntryModal`
    - _Requirements: 5.1, 5.2, 5.10, 5.11_

  - [x] 6.2 Create `ExamEntryModal` for adding exam schedule entries
    - Form fields: subject, examDate, startTime, endTime, examType
    - Validate exam date within selected exam period
    - POST to `/api/tenant/timetable/exam-schedules` on submit
    - After creation, show hall assignment and invigilator assignment inline
    - _Requirements: 5.1–5.8_

  - [x] 6.3 Create `HallAssignmentPanel` within ExamScheduleTab
    - List available exam halls with capacity
    - Assign hall to exam: select hall, enter student count
    - Validate student count ≤ hall capacity before POST
    - POST to `/api/tenant/timetable/exam-schedules/:id/hall-assignments`
    - _Requirements: 5.3, 5.4_

  - [x] 6.4 Create `InvigilatorAssignmentPanel` within ExamScheduleTab
    - List assigned invigilators per exam
    - "Add Invigilator" dropdown from staff list
    - Validate no overlapping assignments before POST
    - POST to `/api/tenant/timetable/exam-schedules/:id/invigilators`
    - _Requirements: 5.5, 5.6_

  - [x] 6.5 Wire ExamScheduleTab into TimetableHub
    - Render `<ExamScheduleTab />` when `activeView === 'exam'`
    - _Requirements: 9.6_

- [x] 7. Phase 7 — Live Conflict Detection & Change Requests

  - [x] 7.1 Replace hardcoded `conflictsByView` with live API data
    - Fetch conflicts from `/api/tenant/timetable/conflicts` on mount and on schedule changes
    - Filter conflicts by `activeView` entity type
    - "Open playbook" button → POST to `/api/tenant/timetable/conflicts/:id/resolve`
    - Show empty state when no conflicts exist
    - _Requirements: 6.1–6.7_

  - [x] 7.2 Replace hardcoded `requestQueue` with live API data
    - Fetch change requests from `/api/tenant/timetable/change-requests` on mount
    - "Approve" / "Reject" actions → PUT to `/api/tenant/timetable/change-requests/:id`
    - "Submit change request" button opens a form modal
    - Show empty state when queue is empty
    - _Requirements: 7.1–7.9_

- [x] 8. Phase 8 — Publishing Workflow

  - [x] 8.1 Replace hardcoded `publishingMilestones` with live publishing status
    - Fetch publishing status from `/api/tenant/timetable/publish/status` on mount
    - Compute readiness percentage from: conflicts resolved + schedules complete
    - "Send guardian preview" button → POST to `/api/tenant/timetable/publish`
    - Block publish if unresolved conflicts exist; show conflict count
    - Show success toast on successful publish
    - _Requirements: 8.1–8.6_

- [x] 9. Phase 9 — Final Integration & Validation

  - [x] 9.1 Checkpoint — Verify zero TypeScript errors
    - Run `tsc --noEmit` and confirm zero errors across all new and modified files
    - _Requirements: 10.8_

  - [x] 9.2 Verify sidebar navigation works end-to-end
    - Confirm single "Timetable & Scheduling" menu item with 4 sub-tabs
    - Confirm each sub-tab renders the correct component
    - Confirm tab state is maintained when switching between sub-tabs
    - _Requirements: 9.1–9.7_

  - [x] 9.3 Final checkpoint — Ensure all tests pass
    - Run existing test suite and confirm no regressions
    - Verify all API endpoints respond correctly with valid data

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All API handlers must use `VercelRequest`/`VercelResponse` from `@vercel/node`
- All new API files live under `api/tenant/timetable/` subdirectory
- All new component files live under `src/components/pages/timetable/` subdirectory
- The existing `TimetableScheduling.tsx` is refactored into `TimetableHub` — not replaced
- Conflict detection runs server-side on every schedule write operation
