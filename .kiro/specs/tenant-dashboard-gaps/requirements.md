# Tenant Dashboard Gaps - Requirements

## Overview
Complete implementation of all non-functional and partially functional dashboard tabs with full backend integration.

## Scope

### Phase 1: Security & Compliance (Partially Functional)
**Status**: 2 of 4 working, need to complete:
- Session Management - Track active user sessions, force logout, session timeout
- Data Encryption - Configure encryption settings, manage encryption keys

### Phase 2: Notifications & Tasks (Completely Non-Functional)
**Status**: 0 of 3 working, implement:
- Pending Approvals - Workflow approvals (results, promotions, fees)
- System Alerts - Real-time system notifications and warnings
- Task Management - Create, assign, track administrative tasks

### Phase 3: Customization (Completely Non-Functional)
**Status**: 0 of 3 working, implement:
- School Branding - Logo, colors, school name customization
- Report Templates - Custom report layouts and formats
- Grading Scale - Define custom grading scales and bands

### Phase 4: Integrations (Completely Non-Functional)
**Status**: 0 of 4 working, implement:
- Payment Gateway - Stripe/Paystack integration for fee collection
- Biometric Devices - Attendance device integration
- LMS Integration - Connect with learning management systems
- API Management - API key management and rate limiting

### Phase 5: Advanced Features (Completely Non-Functional)
**Status**: 0 of 4 working, implement:
- Offline CBT Sync - Sync exam data when offline
- Exam Item Analysis - Statistical analysis of exam questions
- Predictive Risk Alerts - ML-based student risk prediction
- Certificate Verification - Verify certificate authenticity

### Phase 6: Help & Support (Partially Functional)
**Status**: 1 of 4 working, complete:
- System Health - Real-time system monitoring and health checks
- Error Logs - Centralized error logging and debugging
- Support Tickets - Ticket management system for support requests

## Key Requirements

### Security & Compliance
- Session Management:
  - Display active sessions with device info, IP, last activity
  - Force logout from specific sessions
  - Set session timeout policies
  - Track session history

- Data Encryption:
  - Configure encryption algorithms (AES-256, etc.)
  - Manage encryption keys
  - Enable/disable field-level encryption
  - Encryption audit logs

### Notifications & Tasks
- Pending Approvals:
  - Approval workflows for results, promotions, fees
  - Bulk approval/rejection
  - Approval history and audit trail
  - Notification on approval status changes

- System Alerts:
  - Real-time alerts for system events
  - Alert severity levels (Critical, Warning, Info)
  - Alert history and filtering
  - Alert acknowledgment tracking

- Task Management:
  - Create tasks with due dates and priorities
  - Assign to staff members
  - Track completion status
  - Task history and comments

### Customization
- School Branding:
  - Upload school logo
  - Customize primary/secondary colors
  - Set school name and motto
  - Preview branding across UI

- Report Templates:
  - Create custom report layouts
  - Drag-and-drop field arrangement
  - Save as templates
  - Apply templates to reports

- Grading Scale:
  - Define grade bands (A, B, C, etc.)
  - Set score ranges
  - Add grade descriptors
  - Multiple grading scales per school

### Integrations
- Payment Gateway:
  - Stripe/Paystack configuration
  - Test/Live mode toggle
  - Transaction history
  - Webhook management
  - Reconciliation reports

- Biometric Devices:
  - Register devices (fingerprint, face recognition)
  - Device status monitoring
  - Sync attendance data
  - Device logs and troubleshooting

- LMS Integration:
  - Connect to Moodle/Canvas/Blackboard
  - Sync student data
  - Sync grades and results
  - Course enrollment sync

- API Management:
  - Generate API keys
  - Set rate limits per key
  - Monitor API usage
  - Revoke/regenerate keys

### Advanced Features
- Offline CBT Sync:
  - Download exams for offline use
  - Sync responses when online
  - Conflict resolution
  - Sync status tracking

- Exam Item Analysis:
  - Question difficulty analysis
  - Discrimination index
  - Item response theory metrics
  - Performance by question

- Predictive Risk Alerts:
  - Identify at-risk students
  - Risk scoring algorithm
  - Intervention recommendations
  - Historical trend analysis

- Certificate Verification:
  - Generate unique certificate codes
  - Verify certificate authenticity
  - Certificate revocation
  - Verification audit logs

### Help & Support
- System Health:
  - API health status
  - Database connectivity
  - Server resource usage
  - Uptime metrics

- Error Logs:
  - Centralized error collection
  - Error filtering and search
  - Stack trace viewing
  - Error trend analysis

- Support Tickets:
  - Create/manage support tickets
  - Ticket assignment
  - Priority and status tracking
  - Ticket history and resolution

## API Endpoints Required

### Security & Compliance
- `GET /api/tenant/security/sessions` - List active sessions
- `POST /api/tenant/security/sessions/{id}/logout` - Force logout
- `PUT /api/tenant/security/session-policy` - Update session policy
- `GET /api/tenant/security/encryption-config` - Get encryption settings
- `PUT /api/tenant/security/encryption-config` - Update encryption settings

### Notifications & Tasks
- `GET /api/tenant/approvals` - List pending approvals
- `POST /api/tenant/approvals/{id}/approve` - Approve item
- `POST /api/tenant/approvals/{id}/reject` - Reject item
- `GET /api/tenant/alerts` - List system alerts
- `POST /api/tenant/alerts/{id}/acknowledge` - Acknowledge alert
- `GET /api/tenant/tasks` - List tasks
- `POST /api/tenant/tasks` - Create task
- `PUT /api/tenant/tasks/{id}` - Update task

### Customization
- `GET /api/tenant/branding` - Get branding config
- `PUT /api/tenant/branding` - Update branding
- `GET /api/tenant/report-templates` - List templates
- `POST /api/tenant/report-templates` - Create template
- `GET /api/tenant/grading-scales` - List grading scales
- `POST /api/tenant/grading-scales` - Create grading scale

### Integrations
- `GET /api/tenant/integrations/payment-gateway` - Get payment config
- `PUT /api/tenant/integrations/payment-gateway` - Update payment config
- `GET /api/tenant/integrations/biometric-devices` - List devices
- `POST /api/tenant/integrations/biometric-devices` - Register device
- `GET /api/tenant/integrations/lms` - Get LMS config
- `PUT /api/tenant/integrations/lms` - Update LMS config
- `GET /api/tenant/api-keys` - List API keys
- `POST /api/tenant/api-keys` - Generate API key

### Advanced Features
- `POST /api/tenant/cbt/offline-sync` - Sync offline data
- `GET /api/tenant/exams/{id}/item-analysis` - Get item analysis
- `GET /api/tenant/students/risk-alerts` - Get risk alerts
- `GET /api/tenant/certificates/{code}/verify` - Verify certificate

### Help & Support
- `GET /api/tenant/system-health` - Get system health
- `GET /api/tenant/error-logs` - List error logs
- `GET /api/tenant/support-tickets` - List support tickets
- `POST /api/tenant/support-tickets` - Create support ticket

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP,
  last_activity TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Approvals Table
```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  type VARCHAR(50), -- 'result', 'promotion', 'fee'
  reference_id UUID NOT NULL,
  status VARCHAR(20), -- 'pending', 'approved', 'rejected'
  requested_by UUID NOT NULL,
  approved_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID,
  priority VARCHAR(20), -- 'low', 'medium', 'high'
  status VARCHAR(20), -- 'pending', 'in_progress', 'completed'
  due_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### Alerts Table
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  type VARCHAR(50),
  severity VARCHAR(20), -- 'critical', 'warning', 'info'
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

## Success Criteria

1. All 20 non-functional/partially functional items have working implementations
2. Each feature has corresponding API endpoints
3. Database schema supports all features
4. UI components are fully functional with real data
5. All features have proper error handling
6. Audit logs track all important actions
7. Features integrate seamlessly with existing dashboard

## Timeline

- Phase 1 (Security): 2 days
- Phase 2 (Notifications): 3 days
- Phase 3 (Customization): 2 days
- Phase 4 (Integrations): 4 days
- Phase 5 (Advanced): 3 days
- Phase 6 (Support): 2 days
- Testing & Refinement: 2 days

**Total: ~18 days**

