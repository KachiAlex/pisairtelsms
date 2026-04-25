# Design: Finance & Fees Management System

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Finance & Fees UI Layer                   │
├─────────────────────────────────────────────────────────────┤
│  Dashboard │ Fee Config │ Student Accounts │ Payments │ Reports
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API Layer (Vercel)                        │
├─────────────────────────────────────────────────────────────┤
│ /api/tenant/finance/fee-structures                           │
│ /api/tenant/finance/fee-assignments                          │
│ /api/tenant/finance/payments                                 │
│ /api/tenant/finance/reconciliation                           │
│ /api/tenant/finance/reports                                  │
│ /api/tenant/finance/audit-log                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Data Layer (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│ fee_structures │ fee_items │ fee_assignments                 │
│ payments │ payment_reconciliation │ fee_adjustments          │
│ payment_plans │ exemptions │ audit_log                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Core Tables

**fee_structures**
```
id: UUID
tenant_id: TEXT
name: TEXT (e.g., "2025/2026 Session - Term 1")
academic_session: TEXT (e.g., "2025/2026")
term: TEXT (e.g., "Term 1")
effective_from: DATE
effective_to: DATE (nullable)
status: ENUM (active, archived)
created_by: TEXT
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**fee_items**
```
id: UUID
fee_structure_id: UUID (FK)
category: TEXT (tuition, exam, development, etc.)
description: TEXT
amount: DECIMAL(12,2)
applicable_classes: TEXT[] (JSON array of class names)
is_mandatory: BOOLEAN
sequence: INTEGER (for display order)
created_at: TIMESTAMP
```

**fee_assignments**
```
id: UUID
student_id: TEXT
fee_structure_id: UUID (FK)
academic_session: TEXT
term: TEXT
total_amount: DECIMAL(12,2)
total_paid: DECIMAL(12,2) DEFAULT 0
total_balance: DECIMAL(12,2)
status: ENUM (pending, partial, paid)
due_date: DATE
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**payments**
```
id: UUID
fee_assignment_id: UUID (FK)
amount: DECIMAL(12,2)
payment_method: TEXT (bank_transfer, cash, online, check, mobile_money)
reference_number: TEXT (unique per payment method)
receipt_number: TEXT (unique)
payment_date: DATE
payment_time: TIME
recorded_by: TEXT
notes: TEXT
status: ENUM (pending, verified, reconciled, reversed)
created_at: TIMESTAMP
```

**payment_reconciliation**
```
id: UUID
payment_id: UUID (FK)
bank_deposit_date: DATE
bank_deposit_amount: DECIMAL(12,2)
bank_reference: TEXT
matched_at: TIMESTAMP
matched_by: TEXT
status: ENUM (pending, matched, exception)
exception_reason: TEXT
created_at: TIMESTAMP
```

**fee_adjustments**
```
id: UUID
fee_assignment_id: UUID (FK)
adjustment_type: ENUM (refund, correction, additional_charge)
amount: DECIMAL(12,2)
reason: TEXT
approved_by: TEXT
approval_date: TIMESTAMP
created_by: TEXT
created_at: TIMESTAMP
```

**payment_plans**
```
id: UUID
fee_assignment_id: UUID (FK)
number_of_installments: INTEGER
installment_amount: DECIMAL(12,2)
start_date: DATE
status: ENUM (active, completed, cancelled)
created_by: TEXT
created_at: TIMESTAMP
```

**payment_plan_installments**
```
id: UUID
payment_plan_id: UUID (FK)
installment_number: INTEGER
due_date: DATE
amount: DECIMAL(12,2)
paid_amount: DECIMAL(12,2) DEFAULT 0
status: ENUM (pending, partial, paid)
```

**exemptions**
```
id: UUID
student_id: TEXT
fee_assignment_id: UUID (FK)
exemption_type: TEXT (scholarship, hardship, staff_child, etc.)
amount: DECIMAL(12,2)
percentage: DECIMAL(5,2) (nullable, if percentage-based)
reason: TEXT
approved_by: TEXT
approval_date: TIMESTAMP
effective_from: DATE
effective_to: DATE (nullable)
created_at: TIMESTAMP
```

**audit_log**
```
id: UUID
entity_type: TEXT (fee_structure, payment, adjustment, etc.)
entity_id: UUID
action: TEXT (create, update, delete, reverse)
old_values: JSONB
new_values: JSONB
user_id: TEXT
timestamp: TIMESTAMP
ip_address: TEXT (optional)
```

## API Endpoints

### Fee Structure Management
- `GET /api/tenant/finance/fee-structures` - List fee structures
- `POST /api/tenant/finance/fee-structures` - Create fee structure
- `GET /api/tenant/finance/fee-structures/:id` - Get fee structure details
- `PUT /api/tenant/finance/fee-structures/:id` - Update fee structure
- `POST /api/tenant/finance/fee-structures/:id/copy` - Copy to new term
- `GET /api/tenant/finance/fee-structures/:id/history` - View history

### Fee Assignment
- `GET /api/tenant/finance/fee-assignments` - List assignments (filter by student, class, term)
- `POST /api/tenant/finance/fee-assignments/bulk` - Bulk assign fees to class
- `GET /api/tenant/finance/fee-assignments/:id` - Get assignment details
- `PUT /api/tenant/finance/fee-assignments/:id` - Update assignment
- `GET /api/tenant/finance/fee-assignments/:id/ledger` - Get complete fee ledger

### Payment Processing
- `POST /api/tenant/finance/payments` - Record payment
- `POST /api/tenant/finance/payments/bulk` - Bulk record payments
- `GET /api/tenant/finance/payments` - List payments (filter by student, date, method)
- `GET /api/tenant/finance/payments/:id` - Get payment details
- `POST /api/tenant/finance/payments/:id/reverse` - Reverse payment
- `POST /api/tenant/finance/payments/:id/receipt` - Generate receipt

### Payment Plans
- `POST /api/tenant/finance/payment-plans` - Create payment plan
- `GET /api/tenant/finance/payment-plans/:id` - Get plan details
- `PUT /api/tenant/finance/payment-plans/:id` - Update plan
- `GET /api/tenant/finance/payment-plans/:id/installments` - List installments

### Reconciliation
- `POST /api/tenant/finance/reconciliation/match` - Match payment to deposit
- `GET /api/tenant/finance/reconciliation/unmatched` - List unmatched transactions
- `POST /api/tenant/finance/reconciliation/bulk-match` - Bulk match payments
- `GET /api/tenant/finance/reconciliation/report` - Generate reconciliation report

### Reports
- `GET /api/tenant/finance/reports/collection-summary` - Collection metrics
- `GET /api/tenant/finance/reports/aging-analysis` - Aging report
- `GET /api/tenant/finance/reports/defaulters` - Defaulter list
- `GET /api/tenant/finance/reports/revenue-forecast` - Revenue forecast
- `GET /api/tenant/finance/reports/payment-methods` - Payment method analysis
- `GET /api/tenant/finance/reports/financial-statement` - Financial statement

### Audit & Compliance
- `GET /api/tenant/finance/audit-log` - List audit entries
- `GET /api/tenant/finance/audit-log/:entity_id` - Get entity audit history

## UI Components

### Dashboard
- Collection metrics cards (target, actual, rate, outstanding)
- Collection trend chart (line chart by date)
- Payment method breakdown (pie chart)
- Quick actions (record payment, send reminder, view defaulters)
- Recent transactions table

### Fee Structure Configuration
- Fee structure list with effective dates
- Create/edit fee structure form
- Fee items table with add/edit/delete
- Class-level override section
- Preview impact before applying
- History/versioning view

### Student Accounts
- Student search and filter
- Fee ledger: all fees, payments, adjustments, balance
- Payment history timeline
- Payment plan details (if applicable)
- Exemptions display
- Quick actions (record payment, create plan, apply exemption)

### Payment Processing
- Single payment form (student, amount, method, reference)
- Bulk payment upload (CSV)
- Payment allocation interface
- Receipt generation and preview
- Payment history search

### Reconciliation
- Unmatched transactions list
- Match interface (drag-drop or form)
- Reconciliation report
- Exception handling

### Reports
- Report selector with filters (class, term, date range, payment method)
- Dynamic report display (table, chart, summary)
- Export options (PDF, CSV, Excel)
- Scheduled report setup

## Component Structure

```
src/components/pages/
├── FinanceManagement.tsx (main container)
├── finance/
│   ├── Dashboard.tsx
│   ├── FeeStructureConfig.tsx
│   ├── StudentAccounts.tsx
│   ├── PaymentProcessing.tsx
│   ├── Reconciliation.tsx
│   ├── Reports.tsx
│   ├── FeeStructureForm.tsx
│   ├── FeeItemsTable.tsx
│   ├── PaymentForm.tsx
│   ├── PaymentPlanForm.tsx
│   ├── ExemptionForm.tsx
│   └── ReportViewer.tsx
```

## API Implementation

```
api/tenant/finance/
├── fee-structures.ts
├── fee-assignments.ts
├── payments.ts
├── reconciliation.ts
├── reports.ts
├── audit-log.ts
└── _lib/
    ├── fee-structures.ts
    ├── fee-assignments.ts
    ├── payments.ts
    ├── reconciliation.ts
    ├── reports.ts
    └── audit-log.ts
```

## Key Algorithms

### Payment Allocation (FIFO)
1. Get all outstanding fees for student (oldest first)
2. Allocate payment to oldest fee until paid or payment exhausted
3. Move to next fee if payment remains
4. If payment exceeds total outstanding, create credit/overpayment record

### Fee Status Calculation
- If balance = 0: status = "paid"
- If paid > 0 and balance > 0: status = "partial"
- If paid = 0: status = "pending"

### Aging Calculation
- Current: due_date >= today
- 30 days: due_date < today AND due_date >= today - 30 days
- 60 days: due_date < today - 30 days AND due_date >= today - 60 days
- 90+ days: due_date < today - 60 days

### Collection Rate
- (Total Paid / Total Expected) * 100

## Security & Validation

- All financial transactions require user authentication
- Payment recording restricted to authorized roles
- Adjustments above threshold require approval
- Immutable audit trail for all changes
- Prevent duplicate payments (unique receipt number)
- Validate payment amounts (positive, not exceeding balance)
- Reconciliation prevents double-counting

## Performance Considerations

- Index on student_id, fee_assignment_id, payment_date for fast queries
- Aggregate tables for reporting (daily/monthly summaries)
- Pagination for large result sets
- Cache fee structures (updated infrequently)
- Batch operations for bulk imports/updates

## Error Handling

- Graceful handling of payment allocation failures
- Clear error messages for validation failures
- Rollback on transaction failures
- Retry logic for reconciliation mismatches
- Logging of all errors for debugging
