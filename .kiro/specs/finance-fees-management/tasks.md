# Implementation Plan: Finance & Fees Management System

## Overview

Build a comprehensive finance and fees management system with hierarchical fee configuration, payment processing, reconciliation, and reporting capabilities. The system supports multiple payment methods, payment plans, exemptions, and maintains complete audit trails.

## Tasks

- [x] 1. Phase 1 — Database Tables & API Foundation

  - [x] 1.1 Create database tables for fee structures
    - Create `fee_structures` table with effective dating
    - Create `fee_items` table with category and amount
    - Create indexes on tenant_id, academic_session, term
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 1.2 Create database tables for fee assignments
    - Create `fee_assignments` table linking students to fee structures
    - Create `exemptions` table for waivers and discounts
    - Create indexes on student_id, fee_structure_id
    - _Requirements: 2.1, 2.2, 1.4_

  - [x] 1.3 Create database tables for payments
    - Create `payments` table with payment method and reference tracking
    - Create `payment_reconciliation` table for bank matching
    - Create `payment_plans` and `payment_plan_installments` tables
    - Create indexes on fee_assignment_id, payment_date, status
    - _Requirements: 3.1, 3.2, 3.3, 4.1_

  - [x] 1.4 Create database tables for adjustments and audit
    - Create `fee_adjustments` table for refunds and corrections
    - Create `audit_log` table (immutable) for all transactions
    - Create indexes on entity_type, entity_id, timestamp
    - _Requirements: 2.3, 6.1, 6.3_

  - [x] 1.5 Implement Fee Structures API (`api/tenant/finance/fee-structures.ts`)
    - GET: return fee structures filtered by academic_session, term, status
    - POST: create fee structure with fee items
    - PUT: update fee structure (only if not yet applied to students)
    - POST `/copy`: copy fee structure to new term
    - GET `/history`: return version history
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 1.6 Implement Fee Assignments API (`api/tenant/finance/fee-assignments.ts`)
    - GET: return assignments filtered by student_id, class, term
    - POST: create assignment for single student
    - POST `/bulk`: bulk assign fees to all students in class
    - PUT: update assignment (recalculate balance)
    - GET `/:id/ledger`: return complete fee ledger with payments and adjustments
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 2.1, 2.2_

  - [x] 1.7 Implement Payments API (`api/tenant/finance/payments.ts`)
    - POST: record single payment with allocation logic (FIFO)
    - POST `/bulk`: bulk record payments from CSV
    - GET: list payments with filters (student, date, method, status)
    - POST `/:id/reverse`: reverse payment with reason
    - POST `/:id/receipt`: generate receipt
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 1.8 Implement Payment Plans API (`api/tenant/finance/payment-plans.ts`)
    - POST: create payment plan with installments
    - GET: list plans filtered by student, status
    - PUT: update plan (modify installments)
    - GET `/:id/installments`: list installments with payment status
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 3.3_

  - [x] 1.9 Implement Reconciliation API (`api/tenant/finance/reconciliation.ts`)
    - POST `/match`: match payment to bank deposit
    - GET `/unmatched`: list unmatched transactions
    - POST `/bulk-match`: bulk match payments
    - GET `/report`: generate reconciliation report
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 1.10 Implement Reports API (`api/tenant/finance/reports.ts`)
    - GET `/collection-summary`: collection metrics by class, term, method
    - GET `/aging-analysis`: aging report with 30/60/90+ buckets
    - GET `/defaulters`: list students with outstanding balances
    - GET `/revenue-forecast`: project collections based on history
    - GET `/payment-methods`: breakdown by payment method
    - GET `/financial-statement`: monthly revenue summary
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 1.11 Implement Audit Log API (`api/tenant/finance/audit-log.ts`)
    - GET: list audit entries with filters (entity_type, action, user, date)
    - GET `/:entity_id`: get audit history for specific entity
    - Ensure immutability (no delete operations)
    - Use `VercelRequest`/`VercelResponse` from `@vercel/node`
    - _Requirements: 6.1, 6.3_

  - [x] 1.12 Wire all finance API routes in `vercel.json`
    - Add routes for all 7 new API endpoints under `/api/tenant/finance/*`
    - _Requirements: 10.1_

  - [x] 1.13 Checkpoint — Verify TypeScript build is clean
    - Run `tsc --noEmit` and confirm zero errors across all new API files
    - _Requirements: 10.8_

- [x] 2. Phase 2 — Dashboard & Overview

  - [x] 2.1 Create Finance Dashboard component (`src/components/pages/finance/Dashboard.tsx`)
    - Display collection metrics: target, actual, rate, outstanding
    - Show collection trend chart (line chart by date)
    - Display payment method breakdown (pie chart)
    - Show recent transactions table
    - Include quick action buttons (record payment, send reminder, view defaulters)
    - Fetch data from `/api/tenant/finance/reports/collection-summary`
    - _Requirements: 5.1_

  - [x] 2.2 Create Dashboard loading and error states
    - Show skeleton loaders while fetching
    - Display error message with retry button
    - Handle empty state gracefully
    - _Requirements: 5.1_

  - [x] 2.3 Update main FinanceManagement component
    - Add tab navigation: Dashboard, Fee Config, Student Accounts, Payments, Reports
    - Integrate Dashboard tab
    - Maintain tab state across navigation
    - _Requirements: 5.1_

- [x] 3. Phase 3 — Fee Structure Configuration

  - [x] 3.1 Create FeeStructureConfig component (`src/components/pages/finance/FeeStructureConfig.tsx`)
    - List existing fee structures with effective dates
    - Show status (active, archived)
    - Include create, edit, delete actions
    - Display version history
    - _Requirements: 1.1, 1.5_

  - [x] 3.2 Create FeeStructureForm component
    - Form fields: name, academic_session, term, effective_from, effective_to
    - Add fee items section (category, description, amount, applicable_classes)
    - Validate non-overlapping effective dates
    - Support copy from previous term
    - _Requirements: 1.1, 1.2_

  - [x] 3.3 Create FeeItemsTable component
    - Display fee items with category, amount, applicable classes
    - Add/edit/delete fee items inline
    - Show total fees
    - _Requirements: 1.2_

  - [x] 3.4 Create class-level override interface
    - Show class-specific fee adjustments
    - Allow override of school-wide fees per class
    - Preview impact before applying
    - _Requirements: 1.3_

  - [x] 3.5 Create fee structure history view
    - Display version history with dates and changes
    - Allow rollback to previous version
    - Compare fee structures across versions
    - _Requirements: 1.5_

- [x] 4. Phase 4 — Student Accounts & Fee Ledger

  - [x] 4.1 Create StudentAccounts component (`src/components/pages/finance/StudentAccounts.tsx`)
    - Student search and filter (by name, admission number, class)
    - Display student fee summary: total fees, paid, balance, status
    - Show payment due dates and overdue amounts
    - _Requirements: 2.2_

  - [x] 4.2 Create fee ledger view
    - Display complete fee history: all fees, payments, adjustments
    - Show transaction timeline
    - Include payment details (method, reference, date)
    - Show exemptions applied
    - _Requirements: 2.2_

  - [x] 4.3 Create quick action buttons
    - Record payment button (opens payment form)
    - Create payment plan button
    - Apply exemption button
    - Send reminder button
    - _Requirements: 2.2, 3.1, 3.4, 7.1_

  - [x] 4.4 Create fee adjustment interface
    - Form to record refunds, corrections, additional charges
    - Require approval for adjustments above threshold
    - Show adjustment reason and approval status
    - _Requirements: 2.3_

- [x] 5. Phase 5 — Payment Processing

  - [x] 5.1 Create PaymentProcessing component (`src/components/pages/finance/PaymentProcessing.tsx`)
    - Tab navigation: Single Payment, Bulk Upload, Payment History
    - Display recent payments table
    - Include search and filter options
    - _Requirements: 3.1_

  - [x] 5.2 Create PaymentForm component
    - Form fields: student (search), amount, payment_method, reference_number
    - Auto-calculate balance after payment
    - Show payment allocation preview (which fees will be paid)
    - Submit to `/api/tenant/finance/payments`
    - _Requirements: 3.1, 3.2_

  - [x] 5.3 Create bulk payment upload
    - CSV template download
    - File upload with validation
    - Preview before processing
    - Bulk submit to `/api/tenant/finance/payments/bulk`
    - _Requirements: 3.1_

  - [x] 5.4 Create PaymentPlanForm component
    - Form fields: student, number_of_installments, start_date
    - Auto-calculate installment amounts
    - Display installment schedule
    - Submit to `/api/tenant/finance/payment-plans`
    - _Requirements: 3.3_

  - [x] 5.5 Create receipt generation
    - Generate receipt with: receipt number, student details, amount, date, method
    - Display receipt preview
    - Email receipt to guardian
    - Reprint past receipts
    - _Requirements: 3.4_

  - [x] 5.6 Create payment reversal interface
    - Form to reverse payment with reason
    - Require approval for reversals
    - Show reversal audit trail
    - _Requirements: 4.2_

- [x] 6. Phase 6 — Exemptions & Discounts

  - [x] 6.1 Create ExemptionForm component (`src/components/pages/finance/ExemptionForm.tsx`)
    - Form fields: student, exemption_type, amount/percentage, reason, effective_dates
    - Support fixed-amount and percentage-based exemptions
    - Validate exemption doesn't exceed fee amount
    - Submit to `/api/tenant/finance/fee-assignments/:id/exemptions`
    - _Requirements: 1.4_

  - [x] 6.2 Create exemption management interface
    - List active exemptions per student
    - Show exemption reason and approval status
    - Allow modification with approval
    - Track exemption history
    - _Requirements: 1.4_

- [x] 7. Phase 7 — Reconciliation

  - [x] 7.1 Create Reconciliation component (`src/components/pages/finance/Reconciliation.tsx`)
    - Display unmatched transactions (payments and deposits)
    - Show match interface (drag-drop or form)
    - Display reconciliation status
    - _Requirements: 4.1, 4.2_

  - [x] 7.2 Create payment-to-deposit matching
    - Form to match payment to bank deposit
    - Validate amounts match
    - Record match with bank reference
    - Update reconciliation status
    - _Requirements: 4.1_

  - [x] 7.3 Create bulk reconciliation
    - Upload bank statement (CSV)
    - Auto-match payments to deposits
    - Flag exceptions for manual review
    - Generate reconciliation report
    - _Requirements: 4.1, 4.3_

  - [x] 7.4 Create reconciliation report
    - Display matched and unmatched transactions
    - Show reconciliation summary
    - Export report to PDF
    - _Requirements: 4.3_

- [x] 8. Phase 8 — Reports & Analytics

  - [x] 8.1 Create ReportViewer component (`src/components/pages/finance/ReportViewer.tsx`)
    - Report selector dropdown
    - Filter options (class, term, date range, payment method)
    - Dynamic report display (table, chart, summary)
    - Export options (PDF, CSV, Excel)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 8.2 Create collection summary report
    - Display metrics: target, actual, rate, outstanding
    - Breakdown by class, term, payment method
    - Trend chart
    - Fetch from `/api/tenant/finance/reports/collection-summary`
    - _Requirements: 5.1_

  - [x] 8.3 Create aging analysis report
    - Display aging buckets: current, 30, 60, 90+ days
    - Show count and amount per bucket
    - Aging trend chart
    - Fetch from `/api/tenant/finance/reports/aging-analysis`
    - _Requirements: 5.2_

  - [x] 8.4 Create defaulter report
    - List students with outstanding balances
    - Sort by amount owed, days overdue, class
    - Filter options
    - Export for follow-up
    - Fetch from `/api/tenant/finance/reports/defaulters`
    - _Requirements: 5.3_

  - [x] 8.5 Create revenue forecast report
    - Display projected vs. actual collections
    - Forecast chart by month
    - Identify collection gaps
    - Fetch from `/api/tenant/finance/reports/revenue-forecast`
    - _Requirements: 5.4_

  - [x] 8.6 Create payment method analysis report
    - Breakdown of collections by payment method
    - Payment method trends
    - Pie chart
    - Fetch from `/api/tenant/finance/reports/payment-methods`
    - _Requirements: 5.5_

  - [x] 8.7 Create financial statement report
    - Monthly revenue summary
    - Class-wise revenue breakdown
    - Term-wise comparison
    - Year-over-year analysis
    - Fetch from `/api/tenant/finance/reports/financial-statement`
    - _Requirements: 5.6_

- [x] 9. Phase 9 — Audit & Compliance

  - [x] 9.1 Create AuditLog component (`src/components/pages/finance/AuditLog.tsx`)
    - Display audit entries with filters (entity_type, action, user, date)
    - Show entity audit history
    - Display old and new values for changes
    - Export audit trail
    - _Requirements: 6.1, 6.3_

  - [x] 9.2 Implement audit logging in all API endpoints
    - Log all create, update, delete operations
    - Record user, timestamp, old/new values
    - Ensure immutability (no deletion)
    - _Requirements: 6.1_

  - [x] 9.3 Create compliance reports
    - Generate audit trail for auditors
    - Tax compliance tracking
    - Financial year-end closing checklist
    - _Requirements: 6.4_

- [x] 10. Phase 10 — Notifications & Communication

  - [x] 10.1 Implement payment reminders
    - Create reminder templates (due date, overdue 7/14/30 days)
    - Send reminders via email/SMS
    - Track reminder history
    - _Requirements: 7.1_

  - [x] 10.2 Implement payment confirmations
    - Send confirmation after payment recorded
    - Include receipt details and updated balance
    - Provide payment history link
    - _Requirements: 7.2_

  - [x] 10.3 Implement fee statements
    - Generate fee statement for student
    - Show fees, payments, balance, due dates
    - Include payment instructions
    - Email to guardian
    - _Requirements: 7.3_

- [x] 11. Phase 11 — Integration & Data Management

  - [x] 11.1 Integrate with student records
    - Auto-assign fees when student enrolled
    - Update fees when student class changes
    - Mark fees inactive when student withdraws
    - _Requirements: 8.1_

  - [x] 11.2 Integrate with academic calendar
    - Link fees to academic terms
    - Auto-create fees for new terms
    - Support term-specific adjustments
    - _Requirements: 8.2_

  - [x] 11.3 Implement data export
    - Export fee records to CSV/Excel
    - Export payment history
    - Export reports in PDF
    - _Requirements: 8.3_

  - [x] 11.4 Implement data backup & recovery
    - Regular automated backups
    - Point-in-time recovery capability
    - Backup verification
    - _Requirements: 8.4_

- [x] 12. Phase 12 — Final Integration & Validation

  - [x] 12.1 Checkpoint — Verify zero TypeScript errors
    - Run `tsc --noEmit` and confirm zero errors across all new and modified files
    - _Requirements: 10.8_

  - [x] 12.2 Verify end-to-end workflows
    - Test fee structure creation and assignment
    - Test payment recording and allocation
    - Test reconciliation workflow
    - Test report generation
    - _Requirements: All_

  - [x] 12.3 Verify audit trail completeness
    - Confirm all transactions are logged
    - Verify immutability of audit log
    - Test audit trail export
    - _Requirements: 6.1, 6.3_

  - [x] 12.4 Final checkpoint — Ensure all tests pass
    - Run existing test suite and confirm no regressions
    - Verify all API endpoints respond correctly
    - Test data integrity constraints
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All API handlers must use `VercelRequest`/`VercelResponse` from `@vercel/node`
- All new API files live under `api/tenant/finance/` subdirectory
- All new component files live under `src/components/pages/finance/` subdirectory
- Payment allocation uses FIFO (First In, First Out) algorithm
- Audit log is immutable (no deletion, only reversal)
- All financial transactions require proper validation and error handling
- Reconciliation prevents double-counting of payments
