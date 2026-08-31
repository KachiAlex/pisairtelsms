# Requirements: Finance & Fees Management System

## Overview

The Finance & Fees Management system enables schools to configure flexible fee structures, track student payments, reconcile transactions, and generate financial reports. It supports hierarchical fee setup (school-wide, class-level, term-specific), multiple payment methods, payment plans, and comprehensive audit trails.

## Business Requirements

### 1. Fee Structure Configuration

**Req 1.1: Hierarchical Fee Setup**
- Define fees at multiple levels: school-wide defaults, class-level overrides, term-specific adjustments
- Support effective dating: fees can have start and end dates for version control
- Allow copying fee structures from previous terms to new terms
- Track fee structure history and changes

**Req 1.2: Fee Categories**
- Support multiple fee types: tuition, development levy, exam fees, activity fees, transport, meals, uniforms, technology, sports, etc.
- Allow custom fee categories per school
- Each fee category has: name, description, amount, applicable classes, applicable terms
- Mark fees as mandatory or optional

**Req 1.3: Class-Level Customization**
- Override school-wide fees at class level (e.g., SS 3 pays higher exam fees)
- Support section-level fees (e.g., Science section has lab fees)
- Bulk update fees across multiple classes
- Preview impact of fee changes before applying

**Req 1.4: Exemptions & Discounts**
- Configure student-specific fee waivers (scholarship, financial hardship, staff children)
- Support percentage-based and fixed-amount discounts
- Track exemption reason and approval authority
- Set exemption effective dates and expiry

**Req 1.5: Fee Structure Versioning**
- Maintain audit trail of all fee structure changes
- View historical fee structures by date
- Rollback to previous fee structure if needed
- Compare fee structures across terms

### 2. Student Fee Assignment

**Req 2.1: Automatic Fee Assignment**
- Automatically assign fees to students based on their class and term
- Bulk assign fees to all students in a class
- Manual override for individual students
- Recalculate fees when student class changes

**Req 2.2: Fee Ledger**
- Display complete fee history per student: all fees, payments, adjustments
- Show current balance and payment status
- Track payment due dates and overdue amounts
- Display exemptions and discounts applied

**Req 2.3: Fee Adjustments**
- Record fee adjustments: refunds, corrections, additional charges
- Require approval for adjustments above threshold
- Maintain audit trail of who approved what and when
- Prevent deletion of adjustments (only reversal allowed)

### 3. Payment Processing

**Req 3.1: Payment Recording**
- Record single and bulk payments
- Support multiple payment methods: bank transfer, cash, online payment, check, mobile money
- Capture payment reference/receipt number
- Record payment date and time
- Assign payments to specific fee items or auto-allocate to oldest outstanding

**Req 3.2: Payment Allocation**
- Auto-allocate payments to oldest outstanding fees first (FIFO)
- Allow manual allocation to specific fee items
- Support partial payments
- Handle overpayments (credit to next term or refund)

**Req 3.3: Payment Plans**
- Create installment-based payment plans
- Define number of installments and due dates
- Track installment status (pending, partial, paid)
- Send reminders for upcoming installment due dates
- Allow plan modification with approval

**Req 3.4: Payment Receipts**
- Generate receipt with: receipt number, student details, amount, date, payment method
- Support receipt templates per school
- Track receipt numbers to prevent duplicates
- Email receipts to guardians
- Reprint receipts for past payments

### 4. Payment Reconciliation

**Req 4.1: Bank Reconciliation**
- Match bank deposits to student payments
- Identify unmatched deposits and payments
- Support bulk reconciliation
- Generate reconciliation reports
- Track reconciliation status (pending, matched, exception)

**Req 4.2: Payment Verification**
- Verify payment against bank statement
- Flag suspicious transactions
- Support payment reversal/refund with reason
- Maintain reversal audit trail

**Req 4.3: Reconciliation Reports**
- Daily reconciliation summary
- Monthly bank reconciliation statement
- Unmatched transactions report
- Payment method reconciliation

### 5. Reporting & Analytics

**Req 5.1: Collection Dashboard**
- Real-time collection metrics: target vs. actual, collection rate %
- Collection by class, term, payment method
- Collection trend chart (daily, weekly, monthly)
- Top collectors and payment methods
- Quick stats: total expected, collected, outstanding

**Req 5.2: Aging Analysis**
- Categorize outstanding balances: current, 30 days, 60 days, 90+ days overdue
- Aging summary by class and term
- Aging trend chart
- Identify high-risk defaulters

**Req 5.3: Defaulter Reports**
- List students with outstanding balances
- Sort by amount owed, days overdue, class
- Filter by class, term, payment status
- Export for follow-up actions
- Track defaulter status over time

**Req 5.4: Revenue Forecasting**
- Project expected collections based on historical data
- Compare projected vs. actual collections
- Identify collection gaps
- Forecast cash flow by month

**Req 5.5: Payment Method Analysis**
- Breakdown of collections by payment method
- Payment method trends
- Identify preferred payment methods
- Cost analysis per payment method

**Req 5.6: Financial Statements**
- Monthly revenue summary
- Class-wise revenue breakdown
- Term-wise revenue comparison
- Year-over-year revenue analysis

### 6. Compliance & Audit

**Req 6.1: Audit Trail**
- Log all financial transactions: who, what, when, why
- Track changes to fee structures, payments, adjustments
- Immutable transaction log (no deletion, only reversal)
- Export audit trail for compliance

**Req 6.2: User Permissions**
- Role-based access: admin, finance officer, accountant, viewer
- Restrict payment recording to authorized users
- Require approval for adjustments above threshold
- Track approval workflows

**Req 6.3: Data Integrity**
- Prevent duplicate payments
- Validate payment amounts
- Reconcile fee records with payments
- Generate data integrity reports

**Req 6.4: Compliance Reports**
- Generate reports for auditors
- Tax compliance tracking
- Financial year-end closing checklist
- Regulatory compliance documentation

### 7. Communication & Notifications

**Req 7.1: Payment Reminders**
- Automated reminders for upcoming due dates
- Escalating reminders for overdue payments (7, 14, 30 days)
- Customizable reminder templates
- Send via SMS, email, or in-app notification

**Req 7.2: Payment Confirmations**
- Send payment confirmation to guardian
- Include receipt details and updated balance
- Provide payment history link

**Req 7.3: Fee Statements**
- Generate and send fee statements to guardians
- Show fees, payments, balance, due dates
- Include payment instructions

### 8. Integration & Data Management

**Req 8.1: Student Integration**
- Link fees to student records
- Update fees when student class changes
- Handle student withdrawal (mark fees as inactive)
- Support bulk student import with fee assignment

**Req 8.2: Academic Calendar Integration**
- Link fees to academic terms
- Auto-create fees for new terms based on previous term
- Support term-specific fee adjustments

**Req 8.3: Data Export**
- Export fee records to CSV/Excel
- Export payment history
- Export reports in PDF format
- Support scheduled exports

**Req 8.4: Data Backup & Recovery**
- Regular automated backups
- Point-in-time recovery capability
- Backup verification and testing

## Correctness Properties

**Property 1: Fee Integrity**
- Total fees assigned to a student = sum of all fee items
- Fee balance = amount - paid
- Fee status correctly reflects payment status (pending/partial/paid)

**Property 2: Payment Accuracy**
- Total payments recorded = sum of all payment transactions
- Payment allocation doesn't exceed fee amount
- Overpayments are tracked separately

**Property 3: Reconciliation Consistency**
- Bank deposits = matched payments + unmatched deposits
- All payments have corresponding fee records
- No orphaned payments or fees

**Property 4: Audit Trail Completeness**
- Every transaction has audit log entry
- Audit log is immutable (no deletion)
- All changes are traceable to user and timestamp

**Property 5: Balance Accuracy**
- Student balance = total fees - total payments - total adjustments
- Class balance = sum of all student balances in class
- School balance = sum of all class balances

**Property 6: Exemption Consistency**
- Exemptions don't exceed fee amount
- Exemption effective dates are valid
- Exemptions are applied to correct fee items

**Property 7: Payment Plan Compliance**
- Installment amounts sum to total fee
- Installment due dates are sequential
- Installment status matches payment records

## Success Criteria

- Fee structures can be configured at multiple levels with effective dating
- Payments are recorded and allocated accurately with full audit trail
- Bank reconciliation identifies all matched and unmatched transactions
- Reports provide actionable insights into collection performance
- System prevents data integrity issues through validation and constraints
- All financial transactions are immutable and traceable
- Users can quickly identify and follow up on defaulters
- System supports multiple payment methods and payment plans
- Compliance and audit requirements are met

## Assumptions

- School operates on academic term basis
- Students are assigned to classes
- Payment methods are pre-configured
- Bank statements are available for reconciliation
- Users have appropriate roles and permissions
- Financial year aligns with academic year

## Out of Scope

- Integration with external accounting systems (Phase 2)
- Automated bank feed integration (Phase 2)
- Multi-currency support (Phase 2)
- Advanced financial forecasting models (Phase 2)
- Mobile app for payment (Phase 2)
