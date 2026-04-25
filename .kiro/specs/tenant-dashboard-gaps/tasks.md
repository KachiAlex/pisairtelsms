# Implementation Plan: Tenant Dashboard Gaps

## Overview

Close all identified gaps in the tenant admin dashboard: fix Vercel framework compliance issues, consolidate the Student type, create missing database tables and API endpoints, add authentication/route guards, and refactor all feature components to use live data instead of hardcoded mocks.

## Tasks

- [x] 1. Phase 1 — Framework Compliance & Type Consolidation
  - [x] 1.1 Fix `api/tenant/ca-config.ts` to use `@vercel/node` imports
    - Replace any Next.js (`NextApiRequest`/`NextApiResponse`) imports with `VercelRequest` and `VercelResponse` from `@vercel/node`
    - Ensure the default export matches the `VercelHandler` signature `(req: VercelRequest, res: VercelResponse) => void | Promise<void>`
    - Verify GET returns 200 with CA weight config for a valid `tenantId`, and PUT returns 400 when weights don't sum to 100
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ]* 1.2 Write property test for CA Config weight validation
    - **Property 4: CA Config Weight Validation**
    - For any CA weight configuration update where the sum of weights for any school level ≠ 100, the handler must return HTTP 400
    - **Validates: Requirements 2.4**

  - [x] 1.3 Fix `api/tenant/lead.ts` to use `@vercel/node` imports
    - Replace any Next.js imports with `VercelRequest` and `VercelResponse` from `@vercel/node`
    - Ensure the default export matches the `VercelHandler` signature
    - Verify POST returns 201 on valid payload and 400 with field-level errors when any required field is missing
    - _Requirements: 2.2, 2.5, 2.6_

  - [ ]* 1.4 Write property test for Lead creation validation
    - **Property 5: Lead Creation Validation**
    - For any lead payload missing any of `studentName`, `parentName`, `contactPhone`, `contactEmail`, the handler must return HTTP 400 with field-level error details
    - **Property 6: Lead Persistence Round Trip**
    - For any valid lead payload, the handler must return HTTP 201 and the persisted data must match the input
    - **Validates: Requirements 2.5, 2.6**

  - [x] 1.5 Consolidate `Student` type in `src/types.ts`
    - Ensure `src/types.ts` exports exactly one canonical `Student` interface with fields: `id`, `admissionNo`, `name`, `class`, `arm`, `gender`, `status` (`'Active' | 'Suspended' | 'Graduated'`), `guardian`, `phone`, `created_at?`, `updated_at?`
    - Remove any duplicate `Student` interface definitions from `src/lib/studentsClient.ts`
    - _Requirements: 12.1, 12.2_

  - [x] 1.6 Update `src/lib/studentsClient.ts` to re-export `Student` from `src/types.ts`
    - Remove the local `Student` type definition
    - Add `export type { Student } from '../types'` so all existing consumers continue to compile
    - _Requirements: 12.3_

  - [x] 1.7 Update `api/tenant/_lib/students.ts` to use a separate internal `StudentRow` DB type
    - Define a `StudentRow` interface with snake_case fields (`admission_no`, etc.) for DB rows
    - Add a `rowToStudent(row: StudentRow): Student` conversion function
    - Do not import the frontend `Student` type into the API layer
    - _Requirements: 12.4_

  - [ ]* 1.8 Write unit tests for `rowToStudent` conversion
    - Test that every field maps correctly from snake_case DB row to camelCase frontend type
    - Test that optional fields (`created_at`, `updated_at`) are preserved
    - _Requirements: 12.4_

  - [x] 1.9 Checkpoint — Verify zero TypeScript errors
    - Run `tsc --noEmit` and confirm zero type errors related to the `Student` interface across all importing files
    - _Requirements: 12.5_

- [-] 2. Phase 2 — Database Tables & API Endpoints
  - [x] 2.1 Implement Results API (`api/tenant/results.ts`)
    - Create the file with a `VercelHandler` default export
    - On startup, auto-create the `student_scores` table if it does not exist (schema per design: UUID PK, `student_id`, `subject`, `academic_session`, `term`, `ca_score`, `exam_score`, `total_score` generated column, `attendance_percentage`, `class`, timestamps, unique constraint, indexes)
    - GET: accept `studentId`, `academicSession`, `term` query params and return matching score records
    - POST: validate payload, compute `total_score = ca_score + exam_score`, insert record, return 201
    - Return 400 with validation error when `ca_score` or `exam_score` is outside 0–100
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 2.2 Write property tests for Results API
    - **Property 7: Score Total Computation** — For any `ca_score` and `exam_score`, `total_score` must equal their sum
    - **Property 8: Score Validation** — For any score outside 0–100, the API must return HTTP 400
    - **Property 9: Score Query Filtering** — For any combination of `studentId`, `academicSession`, `term`, only matching records are returned
    - **Validates: Requirements 3.3, 3.5, 3.6**

  - [x] 2.3 Implement Finance API (`api/tenant/finance.ts`)
    - Create the file with a `VercelHandler` default export
    - Auto-create the `fee_records` table if it does not exist (schema per design: UUID PK, `student_id`, `student_name`, `admission_no`, `class`, `fee_type`, `amount`, `paid`, `balance` generated column, `status`, `last_payment_date`, `academic_session`, `term`, timestamps, indexes)
    - GET: accept optional `academicSession`, `term`, `class` query params; return matching fee records
    - POST (payment): accept `fee_record_id`, `amount_paid`, `payment_method`, `transaction_ref`; update `paid` and `balance` on the fee record
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.4 Write property test for Finance API
    - **Property 15: Payment Balance Update** — For any fee record and any payment amount, after the POST `balance` must equal `amount - paid`
    - **Validates: Requirements 8.4**

  - [x] 2.5 Implement Staff API (`api/tenant/staff.ts`)
    - Create the file with a `VercelHandler` default export
    - Auto-create the `staff` table if it does not exist (schema per design: UUID PK, `name`, `role`, `department`, `status`, `email`, `phone`, `hire_date`, timestamps, indexes)
    - GET: accept optional `department` and `status` query params; return records ordered by `hire_date` DESC
    - POST: validate required fields (`name`, `role`, `department`, `hire_date`), insert record, return 201
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 2.6 Write property test for Staff API ordering
    - **Property 16: Staff Ordering** — For any set of staff records, the GET response must be ordered by `hire_date` descending
    - **Validates: Requirements 9.3**

  - [x] 2.7 Implement Attendance API (`api/tenant/attendance.ts`)
    - Create the file with a `VercelHandler` default export
    - Auto-create the `attendance_records` table if it does not exist (schema per design: UUID PK, `student_id`, `class`, `date`, `status` check constraint, `academic_session`, `term`, `created_at`, unique constraint on `student_id + date`, indexes)
    - GET: accept `class`, `date`, `term`, `startDate`, `endDate` query params; return matching records
    - POST: accept batch `records` array; validate no future dates; upsert all records; return count saved
    - Return 400 when any record has a future `date`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [ ]* 2.8 Write property tests for Attendance API
    - **Property 18: Attendance Query Filtering** — For any combination of `class`, `date`, `term`, only matching records are returned
    - **Property 19: Attendance Batch Upsert** — For any batch of records, the returned count must equal the number of records in the batch
    - **Property 20: Attendance Future Date Validation** — For any record with a future date, the API must return HTTP 400
    - **Validates: Requirements 10.3, 10.4, 10.6**

  - [x] 2.9 Implement Communication API (`api/tenant/communication.ts`)
    - Create the file with a `VercelHandler` default export
    - Auto-create the `announcements` table if it does not exist (schema per design: UUID PK, `title`, `body`, `audience` check constraint, `sent_by`, `sent_at`, `status` check constraint, `created_at`, indexes)
    - GET: accept optional `audience` and `status` query params; return announcements ordered by `sent_at` DESC
    - POST: validate required fields (`title`, `body`, `audience`, `status`); insert record; return 201
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 2.10 Write property tests for Communication API
    - **Property 21: Announcement Ordering** — For any set of announcements, the GET response must be ordered by `sent_at` descending
    - **Property 22: Announcement Persistence Round Trip** — For any valid announcement payload, POST returns 201 and subsequent GET returns the same data
    - **Validates: Requirements 11.3, 11.4**

  - [x] 2.11 Implement Promotion Rules API (`api/tenant/promotion-rules.ts`)
    - Create the file as a separate Vercel Function at `/api/tenant/promotion-rules`
    - Auto-create the `promotion_rules` table if it does not exist (schema per design: UUID PK, `tenant_id`, `level`, `promotion_threshold`, `repeat_threshold`, `review_threshold`, `attendance_threshold`, `active`, timestamps, unique constraint on `tenant_id + level`, index)
    - GET: return all promotion rules (active and inactive) for the tenant
    - PUT `/:id`: validate rule `id` exists; update provided fields; return updated record; return 404 if not found
    - Use `VercelRequest` and `VercelResponse` from `@vercel/node`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.12 Write property tests for Promotion Rules API
    - **Property 23: Promotion Rule Retrieval** — For any tenant, GET returns all active and inactive rules for that tenant
    - **Property 24: Promotion Rule Update** — For any rule with a valid id and updated fields, PUT returns the updated record
    - **Validates: Requirements 5.2, 5.3**

  - [x] 2.13 Checkpoint — Verify all new API endpoints respond correctly
    - Confirm each new API file compiles without TypeScript errors (`tsc --noEmit`)
    - Ensure all handlers export a valid `VercelHandler` default export
    - _Requirements: 3.1–3.6, 5.1–5.5, 8.1–8.4, 9.1–9.4, 10.1–10.6, 11.1–11.4_

- [ ] 3. Phase 3 — Authentication & Route Guards
  - [x] 3.1 Create `src/lib/auth.ts` with token utilities
    - Define `AuthStorage` interface (`token`, `tenantId`, `expiresAt`)
    - Implement `getAuthFromStorage(): AuthStorage | null` — reads from `localStorage`, returns null if missing or malformed
    - Implement `setAuthInStorage(auth: AuthStorage): void`
    - Implement `clearAuthFromStorage(): void`
    - Implement `isTokenExpired(token: string): boolean` — checks `expiresAt` timestamp
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [ ]* 3.2 Write unit tests for auth token utilities
    - Test `isTokenExpired` returns true for past timestamps and false for future timestamps
    - Test `getAuthFromStorage` returns null when localStorage is empty or contains invalid data
    - Test `clearAuthFromStorage` removes all auth keys
    - _Requirements: 7.5, 7.6_

  - [x] 3.3 Implement `ProtectedRoute` component in `src/components/auth/ProtectedRoute.tsx`
    - Accept `children`, optional `requiredRole`, and optional `redirectTo` (default `/login`) props
    - Read auth from storage via `getAuthFromStorage()`
    - If no token or token is expired, render `<Navigate to={redirectTo} />`
    - If `requiredRole` is specified and token role doesn't match, render `<Navigate to="/unauthorized" />`
    - Otherwise render `children`
    - _Requirements: 7.1, 7.2, 7.6_

  - [x] 3.4 Update `src/contexts/TenantContext.tsx` to initialize from auth storage
    - Remove the hardcoded `demo-tenant-001` default
    - In `useEffect`, call `getAuthFromStorage()`; if a valid non-expired token exists, set `tenantId` from `auth.tenantId`
    - Set `loading` to false after initialization
    - _Requirements: 7.7_

  - [x] 3.5 Wrap `/tenant` and `/super-admin` routes with `ProtectedRoute` in `src/App.tsx`
    - Import `ProtectedRoute` and wrap the tenant dashboard route with `requiredRole="tenant_admin"`
    - Wrap the super-admin route with `requiredRole="super_admin"`
    - _Requirements: 7.1, 7.2_

  - [x] 3.6 Implement logout functionality
    - Add a "Sign Out" button/action in the tenant dashboard layout (e.g., `DashboardLayout.tsx` or `Sidebar.tsx`)
    - On click, call `clearAuthFromStorage()` and navigate to `/login`
    - _Requirements: 7.5_

  - [ ]* 3.7 Write unit tests for `ProtectedRoute` component
    - Test redirect to `/login` when no token is present
    - Test redirect to `/login` when token is expired
    - Test children render when valid token is present
    - Test redirect when role does not match `requiredRole`
    - _Requirements: 7.1, 7.2, 7.6_

  - [x] 3.8 Checkpoint — Verify auth flow end-to-end
    - Confirm navigating to `/tenant` without a token redirects to `/login`
    - Confirm `TenantContext` no longer defaults to `demo-tenant-001`
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Phase 4 — Component Refactoring
  - [x] 4.1 Update `src/components/pages/Dashboard.tsx` to use live data
    - Add `loading`, `error`, and `dashboardStats` state
    - In `useEffect`, fetch from `/api/tenant/integrated-dashboard`
    - Render a loading skeleton (animated pulse cards) while the request is in flight
    - Render inline error messages with retry buttons per section on failure
    - Render contextual empty-state messages when a section has zero data
    - Replace any hardcoded stats with values from `dashboardStats`
    - Render enrollment trend as a Recharts `LineChart`, fee collection as a `PieChart`, academic performance as a `BarChart`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [ ]* 4.2 Write property tests for Dashboard data rendering
    - **Property 2: Dashboard Section Rendering** — For any valid `DashboardStats` object, all sections render with correct data values
    - **Property 3: Empty State Display** — For any `DashboardStats` with empty/zero section data, a contextual empty-state message is displayed
    - **Validates: Requirements 1.1, 1.4, 1.6**

  - [x] 4.3 Update `src/components/pages/StudentPromotion.tsx` to use real data
    - Remove the `mockStudentsWithPerformance` array entirely
    - On mount and on class filter change, fetch students from `/api/tenant/students` and scores from `/api/tenant/results` for the selected class, session, and term
    - Derive `averageScore` and `attendance` for each student from the fetched Results API data
    - Fetch promotion rules from `/api/tenant/promotion-rules` and apply them to compute the recommended action per student
    - Show a "No scores recorded" indicator and `review` action for students with no score records
    - Display a loading indicator and disable the bulk promotion button while fetching
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.4 Write property tests for StudentPromotion data derivation
    - **Property 10: StudentPromotion Data Derivation** — For any set of score records, `averageScore` and `attendance` are derived from fetched data, not hardcoded values
    - **Property 11: Promotion Rule Application** — For any student scores and any set of promotion rules, the correct recommended action (promote/repeat/review/hold) is computed
    - **Validates: Requirements 4.2, 4.5**

  - [x] 4.5 Update `src/components/pages/StudentEnrollment.tsx` to use real application data
    - On mount, fetch applications from `/api/tenant/applications`
    - Map application statuses to pipeline stages: `pending` → "Application", `reviewing` → "Review", `approved` → "Offer", `rejected` → excluded
    - Display real application counts in each column badge
    - On advance-arrow click, call the Applications API to update status and re-render the pipeline
    - On API error, display an error banner and retain the last successfully loaded state
    - Remove `localStorage` as the primary data source (may be used only as fallback cache)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 4.6 Write property tests for StudentEnrollment pipeline
    - **Property 12: Enrollment Pipeline Status Mapping** — For any set of applications, each status maps to the correct pipeline stage
    - **Property 13: Enrollment Pipeline Distribution** — For any set of applications, the count in each column badge equals the number of applications in that stage
    - **Validates: Requirements 6.1, 6.2, 6.4**

  - [x] 4.7 Update `src/components/pages/FinanceManagement.tsx` to use Finance API
    - On mount, fetch fee records from `/api/tenant/finance`
    - Replace all `mockFeeRecords` references with the fetched data
    - Compute `totalExpected`, `totalCollected`, and `totalOutstanding` from the fetched records
    - Display an error state with a retry option if the Finance API is unavailable
    - _Requirements: 8.5, 8.6, 8.7_

  - [ ]* 4.8 Write property test for Finance total computation
    - **Property 14: Finance Total Computation** — For any set of fee records, `totalExpected = totalCollected + totalOutstanding`
    - **Validates: Requirements 8.6**

  - [x] 4.9 Update `src/components/pages/StaffHR.tsx` to use Staff API
    - On mount, fetch staff records from `/api/tenant/staff`
    - Replace all hardcoded summary statistics with values computed from the fetched data
    - Compute total staff count, open roles count, and department distribution from the fetched records
    - _Requirements: 9.5, 9.6_

  - [ ]* 4.10 Write property test for StaffHR statistics computation
    - **Property 17: Staff Statistics Computation** — For any set of staff records, total count, open roles count, and department distribution are computed from the fetched data
    - **Validates: Requirements 9.6**

  - [x] 4.11 Update `src/components/pages/StudentAttendance.tsx` to use Attendance API
    - On mount and on class/date filter change, fetch attendance records from `/api/tenant/attendance` for the selected class and date range
    - Display real attendance data in the component
    - _Requirements: 10.5_

  - [x] 4.12 Update `src/components/pages/CommunicationHub.tsx` to use Communication API
    - On mount, fetch announcements from `/api/tenant/communication` and display them in the announcements list
    - On new announcement submission, POST to the Communication API and optimistically add the announcement to the list
    - _Requirements: 11.5, 11.6_

  - [ ]* 4.13 Write property test for Dashboard data aggregation
    - **Property 1: Dashboard Data Aggregation** — For any valid set of upstream API data, the Integrated Dashboard API aggregates them into a single `DashboardStats` object with correct totals
    - **Validates: Requirements 1.5**

  - [x] 4.14 Checkpoint — Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Phase 5 — Final Integration & Validation
  - [x] 5.1 Wire all new API routes in `vercel.json`
    - Add route entries for `/api/tenant/results`, `/api/tenant/finance`, `/api/tenant/staff`, `/api/tenant/attendance`, `/api/tenant/communication`, and `/api/tenant/promotion-rules`
    - Confirm existing routes for `ca-config` and `lead` still resolve correctly after the framework fix
    - _Requirements: 2.1, 2.2, 3.2, 5.1, 8.1, 9.1, 10.1, 11.1_

  - [x] 5.2 Verify TypeScript build is clean across the full codebase
    - Run `tsc --noEmit` and resolve any remaining type errors
    - Confirm zero errors related to the `Student` interface
    - _Requirements: 12.5_

  - [x] 5.3 Final checkpoint — Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Phase 6 — Critical Missing APIs & Secondary Data Gaps

  - [x] 6.1 Implement Students API (`api/tenant/students.ts`)
    - Create the file with a `VercelHandler` default export using `@vercel/node`
    - Auto-create the `students` table if it does not exist (reuse schema from `api/tenant/_lib/students.ts`)
    - GET: accept optional `class`, `status` query params; return matching student records
    - POST: validate required fields (`admissionNo`, `name`, `class`, `arm`, `gender`, `status`, `guardian`, `phone`), insert record, return 201
    - PUT: accept `id` query param; update provided fields; return updated record; return 404 if not found
    - DELETE: accept `id` query param; delete record; return 204
    - Wire route `/api/tenant/students` in `vercel.json`

  - [x] 6.2 Implement Applications API (`api/tenant/applications.ts`)
    - Create the file with a `VercelHandler` default export using `@vercel/node`
    - Auto-create the `applications` table if it does not exist (schema: UUID PK, `student_name`, `parent_name`, `contact_phone`, `contact_email`, `class_applying`, `status` check constraint `('pending','reviewing','approved','rejected')`, `academic_session`, `source`, timestamps, indexes)
    - GET: accept optional `status`, `academicSession` query params; return matching application records ordered by `created_at` DESC
    - POST: validate required fields (`studentName`, `parentName`, `contactPhone`, `contactEmail`, `classApplying`); insert with status `pending`; return 201
    - PUT: accept `id` query param; update `status` field; return updated record; return 404 if not found
    - Wire route `/api/tenant/applications` in `vercel.json`

  - [x] 6.3 Implement Integrated Dashboard API (`api/tenant/integrated-dashboard.ts`)
    - Create the file with a `VercelHandler` default export using `@vercel/node`
    - GET: aggregate data from students, staff, attendance, fee_records, and student_scores tables
    - Return a `DashboardStats` object with: `totalStudents`, `totalTeachers`, `totalExams`, `activeExams`, `classesCount`, `recentActivity`, `classSummaries`, `systemHealth`
    - Compute `classSummaries` by grouping students by class and joining with scores
    - Compute `recentActivity` from the 10 most recent records across students, attendance, and announcements tables
    - Return 200 with aggregated stats; gracefully handle missing tables with zero values
    - Wire route `/api/tenant/integrated-dashboard` in `vercel.json`

  - [x] 6.4 Replace mock revenue data in `Dashboard.tsx`
    - Remove the hardcoded `revenueData` array
    - Extend the `DashboardStats` interface to include `revenueByMonth: Array<{ month: string; amount: number }>`
    - Populate `revenueByMonth` in the Integrated Dashboard API by summing `paid` from `fee_records` grouped by month
    - Render the revenue trend using the live `revenueByMonth` data

  - [x] 6.5 Replace mock summary stats in `StudentAttendance.tsx`
    - Remove hardcoded `summaryStats` (present rate, absent rate, late rate percentages)
    - Compute these from the fetched attendance records: count present/absent/late and derive percentages
    - Replace hardcoded `heatmapWeeks` with real attendance data grouped by week
    - Replace hardcoded `homeroomPerformance` with per-class attendance averages computed from fetched records
    - Replace hardcoded `absenceReasons` with a note that reason tracking is not yet implemented (show empty state)

  - [x] 6.6 Replace mock analytics in `CommunicationHub.tsx`
    - Remove hardcoded `summaryStats` (total sent, open rate, response rate, pending)
    - Compute `totalSent` and `pending` counts from fetched announcements
    - Remove hardcoded `channelPerformance` — show empty state with "Analytics coming soon" message
    - Remove hardcoded `automationFlows` — show empty state
    - Remove hardcoded `inboxMessages` and `communicationLogs` — show empty states

  - [x] 6.7 Replace mock secondary data in `StaffHR.tsx`
    - Remove hardcoded `onboardingPipeline` — show empty state
    - Remove hardcoded `leaveCalendar` — show empty state
    - Remove hardcoded `performanceFocus` — show empty state
    - Remove hardcoded `complianceItems` — show empty state
    - Remove hardcoded `incidentLog` — show empty state

  - [x] 6.8 Replace mock analytics in `StudentEnrollment.tsx`
    - Remove hardcoded conversion time, acceptance rate, and feeder schools data
    - Compute real counts (total applications, pending, reviewing, approved, rejected) from fetched applications
    - Show empty state for feeder schools analytics

  - [x] 6.9 Wire all three new API routes in `vercel.json`
    - Add `/api/tenant/students` → `/api/tenant/students.ts`
    - Add `/api/tenant/applications` → `/api/tenant/applications.ts`
    - Add `/api/tenant/integrated-dashboard` → `/api/tenant/integrated-dashboard.ts`

  - [x] 6.10 Final integration checkpoint
    - Run `tsc --noEmit` and confirm zero type errors
    - Verify Dashboard loads real stats from integrated-dashboard API
    - Verify StudentPromotion loads real students from students API
    - Verify StudentEnrollment loads real applications from applications API
    - Confirm no component renders hardcoded mock data for primary data sources

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- Property tests validate universal correctness properties defined in the design document (Properties 1–24)
- Unit tests validate specific examples and edge cases
- All new API handlers must use `VercelRequest`/`VercelResponse` from `@vercel/node`
- The `Student` canonical type lives in `src/types.ts`; all other files import from there
