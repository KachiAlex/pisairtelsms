# Tenant Dashboard Gaps - Design

## Architecture Overview

### Component Structure
```
src/components/pages/
├── security/
│   ├── SessionManagement.tsx
│   └── DataEncryption.tsx
├── notifications/
│   ├── PendingApprovals.tsx
│   ├── SystemAlerts.tsx
│   └── TaskManagement.tsx
├── customization/
│   ├── SchoolBranding.tsx
│   ├── ReportTemplates.tsx
│   └── GradingScale.tsx
├── integrations/
│   ├── PaymentGateway.tsx
│   ├── BiometricDevices.tsx
│   ├── LMSIntegration.tsx
│   └── APIManagement.tsx
├── advanced/
│   ├── OfflineCBTSync.tsx
│   ├── ExamItemAnalysis.tsx
│   ├── PredictiveRiskAlerts.tsx
│   └── CertificateVerification.tsx
└── support/
    ├── SystemHealth.tsx
    ├── ErrorLogs.tsx
    └── SupportTickets.tsx
```

### API Layer
```
api/tenant/
├── security/
│   ├── sessions.ts
│   └── encryption.ts
├── approvals.ts
├── alerts.ts
├── tasks.ts
├── branding.ts
├── report-templates.ts
├── grading-scales.ts
├── integrations/
│   ├── payment-gateway.ts
│   ├── biometric-devices.ts
│   ├── lms.ts
│   └── api-keys.ts
├── cbt/
│   └── offline-sync.ts
├── exams/
│   └── item-analysis.ts
├── students/
│   └── risk-alerts.ts
├── certificates/
│   └── verification.ts
├── system-health.ts
├── error-logs.ts
└── support-tickets.ts
```

## Component Designs

### 1. Session Management
**Purpose**: Monitor and manage active user sessions

**Key Features**:
- Active sessions table with device info, IP, last activity
- Force logout button per session
- Session timeout policy configuration
- Session history view

**UI Layout**:
```
┌─ Session Management ─────────────────────┐
│ ┌─ Active Sessions ────────────────────┐ │
│ │ Device | IP | Last Activity | Action │ │
│ │ ─────────────────────────────────── │ │
│ │ Chrome | 192.168.1.1 | 2 min ago | X │ │
│ │ Safari | 192.168.1.2 | 1 hour ago | X │ │
│ └─────────────────────────────────────┘ │
│ ┌─ Session Policy ─────────────────────┐ │
│ │ Timeout: [30] minutes                │ │
│ │ Max Sessions: [5]                    │ │
│ │ [Save Policy]                        │ │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 2. Data Encryption
**Purpose**: Configure encryption settings for sensitive data

**Key Features**:
- Encryption algorithm selection
- Key management interface
- Field-level encryption toggle
- Encryption audit logs

**UI Layout**:
```
┌─ Data Encryption ────────────────────────┐
│ Algorithm: [AES-256 ▼]                   │
│ Key Rotation: [Every 90 days ▼]          │
│ ┌─ Encrypted Fields ──────────────────┐ │
│ │ ☑ Student SSN                       │ │
│ │ ☑ Parent Phone                      │ │
│ │ ☑ Bank Account                      │ │
│ └─────────────────────────────────────┘ │
│ [Save Settings]                          │
└──────────────────────────────────────────┘
```

### 3. Pending Approvals
**Purpose**: Manage workflow approvals for results, promotions, fees

**Key Features**:
- Approval queue with type filtering
- Bulk approve/reject
- Approval history
- Notification on status change

**UI Layout**:
```
┌─ Pending Approvals ──────────────────────┐
│ Filter: [All ▼] [Approve] [Reject]       │
│ ┌─ Approval Queue ─────────────────────┐ │
│ │ Type | Item | Requested | Action    │ │
│ │ ─────────────────────────────────── │ │
│ │ Result | SS3 Math | 2 days ago | ✓✗ │ │
│ │ Promotion | JSS1→JSS2 | 1 day ago | ✓✗ │ │
│ │ Fee | Exemption | 3 hours ago | ✓✗ │ │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 4. System Alerts
**Purpose**: Real-time system notifications and warnings

**Key Features**:
- Alert severity levels (Critical, Warning, Info)
- Alert history with filtering
- Acknowledgment tracking
- Alert statistics

**UI Layout**:
```
┌─ System Alerts ──────────────────────────┐
│ Filter: [All ▼] [Critical] [Warning]     │
│ ┌─ Alert History ──────────────────────┐ │
│ │ Severity | Message | Time | Action  │ │
│ │ ─────────────────────────────────── │ │
│ │ 🔴 Critical | DB Connection Lost | 5m | ✓ │
│ │ 🟡 Warning | High Memory Usage | 10m | ✓ │
│ │ 🔵 Info | Backup Completed | 1h | ✓ │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 5. Task Management
**Purpose**: Create and track administrative tasks

**Key Features**:
- Create tasks with due dates and priorities
- Assign to staff members
- Status tracking (Pending, In Progress, Completed)
- Task comments and history

**UI Layout**:
```
┌─ Task Management ────────────────────────┐
│ [+ New Task]                             │
│ Filter: [All ▼] [High] [Medium] [Low]    │
│ ┌─ Tasks ──────────────────────────────┐ │
│ │ Title | Assigned | Priority | Status │ │
│ │ ─────────────────────────────────── │ │
│ │ Review Results | John | High | ⏳ | │
│ │ Update Fees | Mary | Medium | ✓ | │
│ │ Backup Data | Admin | Low | ⏳ | │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 6. School Branding
**Purpose**: Customize school appearance

**Key Features**:
- Logo upload
- Color customization
- School name and motto
- Live preview

**UI Layout**:
```
┌─ School Branding ────────────────────────┐
│ ┌─ Logo ───────────────────────────────┐ │
│ │ [Upload Logo] [Current Logo Preview] │ │
│ └─────────────────────────────────────┘ │
│ ┌─ Colors ─────────────────────────────┐ │
│ │ Primary: [#0066CC] [Color Picker]    │ │
│ │ Secondary: [#FF6600] [Color Picker]  │ │
│ └─────────────────────────────────────┘ │
│ School Name: [School Name]               │
│ Motto: [School Motto]                    │
│ [Preview] [Save]                         │
└──────────────────────────────────────────┘
```

### 7. Payment Gateway
**Purpose**: Configure payment processing

**Key Features**:
- Stripe/Paystack configuration
- Test/Live mode toggle
- Transaction history
- Webhook management

**UI Layout**:
```
┌─ Payment Gateway ────────────────────────┐
│ Provider: [Stripe ▼]                     │
│ Mode: ○ Test ● Live                      │
│ API Key: [••••••••••••••••]               │
│ Secret Key: [••••••••••••••••]            │
│ ┌─ Recent Transactions ────────────────┐ │
│ │ Date | Amount | Status | Reference  │ │
│ │ ─────────────────────────────────── │ │
│ │ Today | ₦50,000 | Success | TXN001 │ │
│ └─────────────────────────────────────┘ │
│ [Test Connection] [Save]                 │
└──────────────────────────────────────────┘
```

### 8. System Health
**Purpose**: Monitor system status

**Key Features**:
- API health status
- Database connectivity
- Server resource usage
- Uptime metrics

**UI Layout**:
```
┌─ System Health ──────────────────────────┐
│ ┌─ Services ───────────────────────────┐ │
│ │ API Server: ● Online (99.9% uptime) │ │
│ │ Database: ● Connected (5ms latency) │ │
│ │ Cache: ● Running (256MB used)       │ │
│ └─────────────────────────────────────┘ │
│ ┌─ Resources ──────────────────────────┐ │
│ │ CPU: ████░░░░░░ 45%                 │ │
│ │ Memory: ██████░░░░ 62%              │ │
│ │ Disk: ███░░░░░░░ 28%                │ │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## Data Flow

### Approval Workflow
```
User Action → Create Approval → Store in DB → Notify Approver → 
Approver Reviews → Approve/Reject → Update Status → Notify Requester
```

### Alert Generation
```
System Event → Generate Alert → Store in DB → Notify Admin → 
Admin Acknowledges → Update Alert Status
```

### Payment Processing
```
Fee Payment → Payment Gateway → Process → Webhook Callback → 
Update Payment Status → Generate Receipt → Notify Parent
```

## State Management

### Redux Store Structure
```typescript
{
  security: {
    sessions: [],
    encryptionConfig: {},
    loading: false,
    error: null
  },
  notifications: {
    approvals: [],
    alerts: [],
    tasks: [],
    loading: false,
    error: null
  },
  customization: {
    branding: {},
    reportTemplates: [],
    gradingScales: [],
    loading: false,
    error: null
  },
  integrations: {
    paymentGateway: {},
    biometricDevices: [],
    lmsConfig: {},
    apiKeys: [],
    loading: false,
    error: null
  },
  advanced: {
    offlineSyncStatus: {},
    itemAnalysis: {},
    riskAlerts: [],
    certificates: [],
    loading: false,
    error: null
  },
  support: {
    systemHealth: {},
    errorLogs: [],
    supportTickets: [],
    loading: false,
    error: null
  }
}
```

## Error Handling

### Common Error Scenarios
1. **API Failures**: Retry with exponential backoff
2. **Network Issues**: Queue actions for retry when online
3. **Validation Errors**: Display field-level error messages
4. **Permission Errors**: Show "Access Denied" message
5. **Timeout Errors**: Auto-retry or prompt user

### Error Display
- Toast notifications for transient errors
- Modal dialogs for critical errors
- Inline error messages for form validation
- Error logs for debugging

## Performance Considerations

1. **Pagination**: Implement for large lists (approvals, alerts, tasks)
2. **Caching**: Cache frequently accessed data (branding, config)
3. **Lazy Loading**: Load components on demand
4. **Debouncing**: Debounce search and filter inputs
5. **Virtualization**: Use virtual scrolling for large lists

## Security Considerations

1. **Authentication**: Verify user permissions before showing data
2. **Authorization**: Check role-based access for each feature
3. **Data Encryption**: Encrypt sensitive data in transit and at rest
4. **Audit Logging**: Log all important actions
5. **Rate Limiting**: Limit API requests per user/IP
6. **CSRF Protection**: Include CSRF tokens in forms

