# Requirements Document

## Introduction

SCHOLIX is a multi-tenant school management system. The tenant admin dashboard currently has several critical gaps: the main dashboard renders no live data, two Vercel API handlers use the wrong framework imports (Next.js instead of Vercel), the student promotion screen uses hardcoded mock performance data, the enrollment pipeline is static, there is no authentication or route-guard protecting the tenant shell, most feature pages (Finance, Staff/HR, Attendance, Results, Communication) have no backend integration, several API endpoints are missing, and the `Student` type is duplicated across three files with inconsistencies.

This feature spec closes all identified gaps to make the tenant admin dashboard production-ready.

---

## Glossary

- **Dashboard**: The main landing page at `/tenant` that aggregates school-wide KPIs, charts, and operational queues.
- **Integrated_Dashboard_API**: The existing Vercel Function at `/api/tenant/integrated-dashboard` that aggregates data from students, teachers, exams, and progress endpoints.
- **Auth_Guard**: A React component or hook that redirects unauthenticated users to `/login` before rendering protected routes.
- **Auth_Token**: A short-lived JWT or opaque token issued on successful login and stored in `localStorage` / `sessionStorage`.
- **TenantContext**: The React context that holds the active `tenantId` and `tenantName` for the current session.
- **CA_Config_API**: The Vercel Function at `/api/tenant/ca-config` that manages continuous-assessment weight configuration per tenant.
- **Lead_API**: The Vercel Function at `/api/tenant/lead` that creates inquiry leads.
- **Promotion_Rules_API**: A Vercel Function at `/api/tenant/promotion-rules` that serves configurable promotion/repeat/review thresholds.
- **Student_Scores_Table**: A Vercel Postgres table (`student_scores`) that stores per-student, per-subject, per-term academic scores and attendance percentages.
- **Finance_API**: A Vercel Function at `/api/tenant/finance` that manages fee structures, fee records, and payment transactions.
- **Staff_API**: A Vercel Function at `/api/tenant/staff` that manages staff records, roles, and HR data.
- **Attendance_API**: A Vercel Function at `/api/tenant/attendance` that manages daily student and staff attendance records.
- **Results_API**: A Vercel Function at `/api/tenant/results` that manages CA scores, exam scores, and computed term results.
- **Communication_API**: A Vercel Function at `/api/tenant/communication` that manages announcements, bulk notifications, and message logs.
- **Enrollment_Pipeline**: The Kanban-style view in `StudentEnrollment.tsx` showing applications moving through Inquiry → Application → Review → Assessment → Offer → Enrollment stages.
- **Student**: A canonical data type representing a school student with fields: `id`, `admissionNo`, `name`, `class`, `arm`, `gender`, `status`, `guardian`, `phone`.
- **VercelHandler**: The Vercel Node.js serverless function signature `(req: VercelRequest, res: VercelResponse) => void | Promise<void>` from `@vercel/node`.

---

## Requirements

### Requirement 1: Dashboard Live Data Integration

**User Story:** As a tenant admin, I want the main dashboard to display real school statistics and charts, so that I can monitor school operations at a glance without navigating to individual modules.

#### Acceptance Criteria

1. WHEN the Dashboard component mounts, THE Dashboard SHALL call the Integrated_Dashboard_API endpoint and populate the stats grid, enrollment trend chart, fee collection pie chart, academic performance bar chart, capacity utilization panel, operational queues, and compliance signals with the returned data.
2. WHILE the Integrated_Dashboard_API request is in flight, THE Dashboard SHALL display a loading skeleton in place of each data section.
3. IF the Integrated_Dashboard_API returns an error response, THEN THE Dashboard SHALL display an inline error message with a retry button for each failed section, without crashing the page.
4. WHEN the Integrated_Dashboard_API returns an empty data set for any section, THE Dashboard SHALL display a contextual empty-state message for that section rather than a blank area.
5. THE Integrated_Dashboard_API SHALL aggregate student count, teacher count, exam count, active exam count, class summaries, and recent activity into a single response object.
6. WHEN the Dashboard receives a valid API response, THE Dashboard SHALL render the enrollment trend as a line chart, fee collection status as a pie chart, and academic performance by class as a stacked bar chart using the Recharts library.

---

### Requirement 2: Vercel API Handler Framework Compliance

**User Story:** As a backend developer, I want all Vercel Function handlers to use the correct `@vercel/node` types, so that the functions deploy and execute correctly on the Vercel platform without runtime errors.

#### Acceptance Criteria

1. THE CA_Config_API SHALL import `VercelRequest` and `VercelResponse` from `@vercel/node` and export a default handler function matching the VercelHandler signature.
2. THE Lead_API SHALL import `VercelRequest` and `VercelResponse` from `@vercel/node` and export a default handler function matching the VercelHandler signature.
3. WHEN the CA_Config_API receives a GET request with a valid `tenantId` query parameter, THE CA_Config_API SHALL return the tenant's CA weight configuration with HTTP status 200.
4. WHEN the CA_Config_API receives a PUT request with weight totals that do not equal 100 for any school level, THEN THE CA_Config_API SHALL return HTTP status 400 with a descriptive error message.
5. WHEN the Lead_API receives a POST request with all required fields (`studentName`, `parentName`, `contactPhone`, `contactEmail`), THE Lead_API SHALL persist the lead and return HTTP status 201.
6. IF the Lead_API receives a POST request with any required field missing, THEN THE Lead_API SHALL return HTTP status 400 with a field-level error message.

---

### Requirement 3: Student Scores Database Table and API

**User Story:** As a tenant admin, I want student academic scores and attendance to be stored in the database, so that the promotion module and analytics can use real performance data instead of hardcoded values.

#### Acceptance Criteria

1. THE Student_Scores_Table SHALL store the following fields per record: `id`, `student_id`, `subject`, `academic_session`, `term`, `ca_score`, `exam_score`, `total_score`, `attendance_percentage`, `class`, `created_at`, `updated_at`.
2. WHEN the Student_Scores_Table does not exist, THE Results_API SHALL create it automatically before executing any query.
3. WHEN the Results_API receives a GET request with `studentId`, `academicSession`, and `term` query parameters, THE Results_API SHALL return all score records matching those parameters.
4. WHEN the Results_API receives a POST request with a valid score payload, THE Results_API SHALL insert the record and return the created score with HTTP status 201.
5. THE Results_API SHALL compute `total_score` as the sum of `ca_score` and `exam_score` before persisting the record.
6. IF the Results_API receives a score payload where `ca_score` or `exam_score` is outside the range 0–100, THEN THE Results_API SHALL return HTTP status 400 with a validation error.

---

### Requirement 4: Student Promotion — Real Performance Data

**User Story:** As a tenant admin, I want the student promotion screen to display real scores and attendance from the database, so that promotion decisions are based on actual academic performance.

#### Acceptance Criteria

1. WHEN the StudentPromotion component mounts or the class filter changes, THE StudentPromotion component SHALL fetch student records from the Students_API and score records from the Results_API for the selected class, academic session, and term.
2. THE StudentPromotion component SHALL derive `averageScore` and `attendance` for each student from the fetched Results_API data, not from any hardcoded array.
3. WHILE the data fetch is in progress, THE StudentPromotion component SHALL display a loading indicator and disable the bulk promotion button.
4. IF no score records exist for a student in the selected session and term, THEN THE StudentPromotion component SHALL display that student with a "No scores recorded" indicator and mark the recommended action as "review".
5. WHEN promotion rules are fetched from the Promotion_Rules_API, THE StudentPromotion component SHALL apply those rules to compute the recommended action for each student.
6. THE StudentPromotion component SHALL NOT reference the `mockStudentsWithPerformance` array in production code.

---

### Requirement 5: Promotion Rules API Endpoint

**User Story:** As a tenant admin, I want a dedicated API endpoint for promotion rules, so that the client can fetch and update rules independently of promotion records.

#### Acceptance Criteria

1. THE Promotion_Rules_API SHALL be deployed as a separate Vercel Function at the route `/api/tenant/promotion-rules`.
2. WHEN the Promotion_Rules_API receives a GET request, THE Promotion_Rules_API SHALL return all active and inactive promotion rules for the tenant.
3. WHEN the Promotion_Rules_API receives a PUT request with a valid rule `id` and updated fields, THE Promotion_Rules_API SHALL update the rule and return the updated record.
4. IF the Promotion_Rules_API receives a PUT request with an `id` that does not exist, THEN THE Promotion_Rules_API SHALL return HTTP status 404.
5. THE Promotion_Rules_API SHALL use `VercelRequest` and `VercelResponse` from `@vercel/node`.

---

### Requirement 6: Enrollment Pipeline from Database

**User Story:** As a tenant admin, I want the enrollment pipeline Kanban board to reflect real application data from the database, so that I can track actual applicant progress through each stage.

#### Acceptance Criteria

1. WHEN the StudentEnrollment component mounts, THE StudentEnrollment component SHALL fetch applications from the Applications_API and distribute them into pipeline columns based on each application's `status` field.
2. THE StudentEnrollment component SHALL map application statuses to pipeline stages: `pending` → "Application", `reviewing` → "Review", `approved` → "Offer", `rejected` → excluded from pipeline.
3. WHEN an admin clicks the advance arrow on a pipeline card, THE StudentEnrollment component SHALL call the Applications_API to update the application status and re-render the pipeline.
4. THE StudentEnrollment component SHALL display the count of real applications in each pipeline column badge, not hardcoded numbers.
5. IF the Applications_API returns an error, THEN THE StudentEnrollment component SHALL display an error banner and retain the last successfully loaded pipeline state.
6. THE StudentEnrollment component SHALL NOT read application data from `localStorage` as the primary data source; localStorage may be used only as a fallback cache.

---

### Requirement 7: Authentication and Route Guards

**User Story:** As a security-conscious school administrator, I want unauthenticated users to be redirected to the login page when they attempt to access protected routes, so that student and school data is not exposed to unauthorized visitors.

#### Acceptance Criteria

1. WHEN a user navigates to `/tenant` without a valid Auth_Token in storage, THE Auth_Guard SHALL redirect the user to `/login`.
2. WHEN a user navigates to `/super-admin` without a valid Auth_Token in storage, THE Auth_Guard SHALL redirect the user to `/login`.
3. WHEN a user successfully authenticates as a tenant admin, THE Auth_Guard SHALL store the Auth_Token and the associated `tenantId` in `localStorage` and allow navigation to `/tenant`.
4. WHEN a user successfully authenticates as a super admin, THE Auth_Guard SHALL store the Auth_Token in `localStorage` and allow navigation to `/super-admin`.
5. WHEN a user clicks "Sign Out", THE Auth_Guard SHALL remove the Auth_Token and `tenantId` from storage and redirect to `/login`.
6. WHILE a valid Auth_Token is present in storage, THE Auth_Guard SHALL allow access to protected routes without re-prompting for credentials.
7. THE TenantContext SHALL NOT default to `demo-tenant-001`; THE TenantContext SHALL initialize `tenantId` from the Auth_Token payload or from `localStorage` only when a valid token is present.

---

### Requirement 8: Finance API and Live Finance Data

**User Story:** As a tenant admin, I want the Finance & Fee Management page to display real fee records and transactions from the database, so that I can accurately track collections and outstanding balances.

#### Acceptance Criteria

1. THE Finance_API SHALL be deployed as a Vercel Function at `/api/tenant/finance` using the VercelHandler signature.
2. THE Finance_API SHALL support a `fee_records` table in Vercel Postgres with fields: `id`, `student_id`, `student_name`, `admission_no`, `class`, `fee_type`, `amount`, `paid`, `balance`, `status`, `last_payment_date`, `academic_session`, `term`, `created_at`, `updated_at`.
3. WHEN the Finance_API receives a GET request, THE Finance_API SHALL return all fee records for the current academic session and term.
4. WHEN the Finance_API receives a POST request with a payment payload, THE Finance_API SHALL update the corresponding fee record's `paid` and `balance` fields and record the transaction.
5. WHEN the FinanceManagement component mounts, THE FinanceManagement component SHALL fetch fee records from the Finance_API and replace all hardcoded `mockFeeRecords` with the fetched data.
6. THE FinanceManagement component SHALL compute `totalExpected`, `totalCollected`, and `totalOutstanding` from the fetched data, not from hardcoded values.
7. IF the Finance_API is unavailable, THEN THE FinanceManagement component SHALL display an error state with a retry option.

---

### Requirement 9: Staff/HR API and Live Staff Data

**User Story:** As a tenant admin, I want the Staff & HR workspace to display real staff records from the database, so that headcount, onboarding, and leave data reflects the actual school workforce.

#### Acceptance Criteria

1. THE Staff_API SHALL be deployed as a Vercel Function at `/api/tenant/staff` using the VercelHandler signature.
2. THE Staff_API SHALL support a `staff` table in Vercel Postgres with fields: `id`, `name`, `role`, `department`, `status`, `email`, `phone`, `hire_date`, `created_at`, `updated_at`.
3. WHEN the Staff_API receives a GET request, THE Staff_API SHALL return all staff records ordered by `hire_date` descending.
4. WHEN the Staff_API receives a POST request with a valid staff payload, THE Staff_API SHALL insert the record and return it with HTTP status 201.
5. WHEN the StaffHR component mounts, THE StaffHR component SHALL fetch staff records from the Staff_API and replace all hardcoded summary statistics with computed values from the fetched data.
6. THE StaffHR component SHALL compute total staff count, open roles count, and department distribution from the fetched staff data.

---

### Requirement 10: Attendance API and Live Attendance Data

**User Story:** As a tenant admin, I want attendance records to be stored in and retrieved from the database, so that attendance analytics and reports reflect real daily data.

#### Acceptance Criteria

1. THE Attendance_API SHALL be deployed as a Vercel Function at `/api/tenant/attendance` using the VercelHandler signature.
2. THE Attendance_API SHALL support an `attendance_records` table in Vercel Postgres with fields: `id`, `student_id`, `class`, `date`, `status` (`present` | `absent` | `late`), `academic_session`, `term`, `created_at`.
3. WHEN the Attendance_API receives a GET request with `class`, `date`, and `term` query parameters, THE Attendance_API SHALL return all attendance records matching those parameters.
4. WHEN the Attendance_API receives a POST request with a batch of attendance records for a class and date, THE Attendance_API SHALL upsert all records and return the count of records saved.
5. WHEN the StudentAttendance component mounts, THE StudentAttendance component SHALL fetch attendance records from the Attendance_API for the selected class and date range.
6. IF the Attendance_API receives a POST request with a `date` in the future, THEN THE Attendance_API SHALL return HTTP status 400 with an error message.

---

### Requirement 11: Communication API and Live Messaging Data

**User Story:** As a tenant admin, I want announcements and notifications to be persisted in the database, so that communication history is auditable and recipients can be tracked.

#### Acceptance Criteria

1. THE Communication_API SHALL be deployed as a Vercel Function at `/api/tenant/communication` using the VercelHandler signature.
2. THE Communication_API SHALL support an `announcements` table in Vercel Postgres with fields: `id`, `title`, `body`, `audience` (`all` | `students` | `staff` | `parents`), `sent_by`, `sent_at`, `status` (`draft` | `sent`), `created_at`.
3. WHEN the Communication_API receives a GET request, THE Communication_API SHALL return all announcements ordered by `sent_at` descending.
4. WHEN the Communication_API receives a POST request with a valid announcement payload, THE Communication_API SHALL persist the announcement and return it with HTTP status 201.
5. WHEN the CommunicationHub component mounts, THE CommunicationHub component SHALL fetch announcements from the Communication_API and display them in the announcements list.
6. WHEN an admin submits a new announcement, THE CommunicationHub component SHALL POST to the Communication_API and optimistically add the announcement to the list.

---

### Requirement 12: Student Type Consolidation

**User Story:** As a developer, I want a single canonical `Student` type used across the entire codebase, so that type inconsistencies do not cause runtime errors or confusing TypeScript errors.

#### Acceptance Criteria

1. THE codebase SHALL define the canonical `Student` interface exactly once, in `src/types.ts`.
2. THE `Student` interface in `src/types.ts` SHALL include all fields present across the three current definitions: `id`, `admissionNo`, `name`, `class`, `arm`, `gender`, `status`, `guardian`, `phone`, `created_at` (optional), `updated_at` (optional).
3. THE `src/lib/studentsClient.ts` file SHALL import and re-export the `Student` type from `src/types.ts` rather than defining its own.
4. THE `api/tenant/_lib/students.ts` file SHALL define its own internal `Student` DB type (with snake_case DB row fields) separately from the canonical frontend type, to avoid coupling the API layer to the frontend type.
5. WHEN a TypeScript build is run, THE build SHALL produce zero type errors related to the `Student` interface across all files that import it.
