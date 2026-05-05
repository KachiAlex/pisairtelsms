# Attendance Logging System — Production Deployment Checklist

> **Reference**: See `docs/attendance/deployment-guide.md` for detailed procedures on each step.
>
> **Purpose**: This checklist must be completed in full before and during every production deployment. Each item requires a sign-off from the responsible team member. No deployment should proceed to the next stage until all items in the current stage are checked.

---

## Stage 1: Pre-Production Verification

### 1.1 Test Suite Execution

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 1.1.1 | All unit tests pass (`npm run test:unit`) | Dev Lead | ☐ | |
| 1.1.2 | Unit test coverage ≥ 80% confirmed | Dev Lead | ☐ | Report attached |
| 1.1.3 | All integration tests pass (`npm run test:integration`) | Dev Lead | ☐ | |
| 1.1.4 | All end-to-end tests pass (`npm run test:e2e`) | QA Lead | ☐ | |
| 1.1.5 | Performance tests pass — response time < 500ms | Dev Lead | ☐ | Benchmark report attached |
| 1.1.6 | Security tests pass | Security Lead | ☐ | |
| 1.1.7 | No failing tests in CI/CD pipeline | DevOps | ☐ | Pipeline URL: |

**Commands:**
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:security
```

**Sign-off**: _________________________ Date: _____________

---

### 1.2 Security Audit

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 1.2.1 | Dependency vulnerability scan completed (`npm audit`) | Security Lead | ☐ | |
| 1.2.2 | No critical or high vulnerabilities outstanding | Security Lead | ☐ | |
| 1.2.3 | Static code analysis completed (no critical issues) | Dev Lead | ☐ | |
| 1.2.4 | OWASP Top 10 checklist reviewed | Security Lead | ☐ | |
| 1.2.5 | Role-based access control verified for all endpoints | Dev Lead | ☐ | |
| 1.2.6 | Input validation confirmed on all API endpoints | Dev Lead | ☐ | |
| 1.2.7 | Rate limiting configured and tested | DevOps | ☐ | |
| 1.2.8 | CSRF protection verified | Dev Lead | ☐ | |
| 1.2.9 | Sensitive data encrypted in transit (TLS 1.2+) | DevOps | ☐ | |
| 1.2.10 | API keys and secrets stored in environment variables only | DevOps | ☐ | |
| 1.2.11 | No secrets committed to version control | Dev Lead | ☐ | `git log` reviewed |
| 1.2.12 | Penetration test completed (or waived with approval) | Security Lead | ☐ | |

**Commands:**
```bash
npm audit --audit-level=high
npm run lint:security
```

**Sign-off**: _________________________ Date: _____________

---

### 1.3 Performance Benchmarks

| # | Metric | Target | Actual | Status |
|---|--------|--------|--------|--------|
| 1.3.1 | POST /api/tenant/attendance (single record) | < 200ms | | ☐ |
| 1.3.2 | GET /api/tenant/attendance (paginated, 100 records) | < 300ms | | ☐ |
| 1.3.3 | GET /api/tenant/attendance/analytics/dashboard | < 500ms | | ☐ |
| 1.3.4 | GET /api/tenant/attendance/analytics/heatmap | < 500ms | | ☐ |
| 1.3.5 | GET /api/tenant/attendance/analytics/at-risk-students | < 500ms | | ☐ |
| 1.3.6 | POST /api/tenant/attendance/batch-upload (500 rows) | < 5s | | ☐ |
| 1.3.7 | Device sync (1,000 records) | < 30s | | ☐ |
| 1.3.8 | Database query time (attendance with joins) | < 100ms | | ☐ |
| 1.3.9 | Cache hit rate for analytics endpoints | > 80% | | ☐ |
| 1.3.10 | Concurrent users supported without degradation | ≥ 100 | | ☐ |
| 1.3.11 | Load test with 10,000+ records completed | Pass | | ☐ |

**Sign-off**: _________________________ Date: _____________

---

### 1.4 Code Quality

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 1.4.1 | All linting errors resolved (`npm run lint`) | Dev Lead | ☐ | |
| 1.4.2 | TypeScript compilation succeeds with no errors | Dev Lead | ☐ | |
| 1.4.3 | Code review completed for all Phase 6 changes | Dev Lead | ☐ | PR links: |
| 1.4.4 | No TODO/FIXME comments in production code | Dev Lead | ☐ | |
| 1.4.5 | Database migrations reviewed and tested | DBA | ☐ | |

**Sign-off**: _________________________ Date: _____________

---

## Stage 2: Backup & Recovery Preparation

### 2.1 Database Backup

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 2.1.1 | Full database backup taken and verified | DBA | ☐ | Backup location: |
| 2.1.2 | Backup restoration tested in isolated environment | DBA | ☐ | |
| 2.1.3 | Backup size and integrity confirmed | DBA | ☐ | |
| 2.1.4 | Backup stored in geographically separate location | DevOps | ☐ | |
| 2.1.5 | Automated backup schedule confirmed active | DevOps | ☐ | Schedule: |

**Backup Command:**
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f attendance_backup_$(date +%Y%m%d_%H%M%S).dump
```

**Sign-off**: _________________________ Date: _____________

---

### 2.2 Recovery Procedures

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 2.2.1 | Database rollback script prepared and tested | DBA | ☐ | Script location: |
| 2.2.2 | Application rollback procedure documented | DevOps | ☐ | |
| 2.2.3 | Recovery Time Objective (RTO) confirmed: < 1 hour | DevOps | ☐ | |
| 2.2.4 | Recovery Point Objective (RPO) confirmed: < 24 hours | DBA | ☐ | |
| 2.2.5 | Rollback triggers and decision criteria agreed upon | Team Lead | ☐ | |
| 2.2.6 | On-call contacts confirmed for deployment window | Team Lead | ☐ | |

**Rollback Command:**
```bash
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -F c attendance_backup_<timestamp>.dump
```

**Sign-off**: _________________________ Date: _____________

---

## Stage 3: Staging Deployment

### 3.1 Staging Environment Setup

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 3.1.1 | Staging environment mirrors production configuration | DevOps | ☐ | |
| 3.1.2 | Staging database seeded with representative test data | DBA | ☐ | |
| 3.1.3 | All environment variables configured in staging | DevOps | ☐ | |
| 3.1.4 | Redis cache configured and accessible | DevOps | ☐ | |
| 3.1.5 | Biometric device simulators configured (if applicable) | Dev Lead | ☐ | |

**Required Environment Variables (Staging):**
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BIOMETRIC_SYNC_INTERVAL=3600
ATTENDANCE_CACHE_TTL=3600
AT_RISK_THRESHOLD=0.75
NOTIFICATION_SERVICE_URL=...
JWT_SECRET=...
```

**Sign-off**: _________________________ Date: _____________

---

### 3.2 Staging Deployment Execution

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 3.2.1 | Database migrations run successfully on staging | DBA | ☐ | |
| 3.2.2 | New tables created: `attendance_records`, `attendance_audit_trail`, `absence_reasons`, `biometric_devices`, `device_enrollment`, `device_sync_logs` | DBA | ☐ | |
| 3.2.3 | Application deployed to staging | DevOps | ☐ | |
| 3.2.4 | Health check endpoint returns 200 OK | DevOps | ☐ | |
| 3.2.5 | All API endpoints respond correctly | Dev Lead | ☐ | |
| 3.2.6 | Smoke tests pass on staging | QA Lead | ☐ | |

**Migration Command:**
```bash
npx prisma migrate deploy
```

**Health Check:**
```bash
curl -f https://staging.yourdomain.com/api/health
```

**Sign-off**: _________________________ Date: _____________

---

### 3.3 Staging Validation

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 3.3.1 | Teacher attendance entry flow works end-to-end | QA Lead | ☐ | |
| 3.3.2 | Admin analytics dashboard loads correctly | QA Lead | ☐ | |
| 3.3.3 | Biometric device sync completes successfully | QA Lead | ☐ | |
| 3.3.4 | Batch upload processes CSV files correctly | QA Lead | ☐ | |
| 3.3.5 | Audit trail records all changes | QA Lead | ☐ | |
| 3.3.6 | At-risk student notifications sent correctly | QA Lead | ☐ | |
| 3.3.7 | Report generation (CSV and PDF) works | QA Lead | ☐ | |
| 3.3.8 | Performance benchmarks met on staging | Dev Lead | ☐ | |
| 3.3.9 | No errors in staging application logs | DevOps | ☐ | |

**Sign-off**: _________________________ Date: _____________

---

## Stage 4: User Acceptance Testing (UAT)

### 4.1 UAT Preparation

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 4.1.1 | UAT environment accessible to test users | DevOps | ☐ | URL: |
| 4.1.2 | UAT test accounts created (teacher, admin, device) | Dev Lead | ☐ | |
| 4.1.3 | UAT test scenarios documented and distributed | QA Lead | ☐ | |
| 4.1.4 | UAT participants briefed | Team Lead | ☐ | |

**Sign-off**: _________________________ Date: _____________

---

### 4.2 UAT Test Scenarios

| # | Scenario | Tester | Status | Notes |
|---|----------|--------|--------|-------|
| 4.2.1 | Teacher marks daily attendance for homeroom class | Teacher Rep | ☐ | |
| 4.2.2 | Teacher records absence reason for absent student | Teacher Rep | ☐ | |
| 4.2.3 | Teacher uses bulk "Mark all present" action | Teacher Rep | ☐ | |
| 4.2.4 | Teacher corrects a previously submitted entry | Teacher Rep | ☐ | |
| 4.2.5 | Admin views attendance analytics dashboard | Admin Rep | ☐ | |
| 4.2.6 | Admin views weekly heatmap | Admin Rep | ☐ | |
| 4.2.7 | Admin reviews at-risk students list | Admin Rep | ☐ | |
| 4.2.8 | Admin sends notifications to guardians of at-risk students | Admin Rep | ☐ | |
| 4.2.9 | Admin registers a new biometric device | Admin Rep | ☐ | |
| 4.2.10 | Admin triggers manual device sync | Admin Rep | ☐ | |
| 4.2.11 | Admin uploads batch attendance CSV | Admin Rep | ☐ | |
| 4.2.12 | Admin views audit trail for a student | Admin Rep | ☐ | |
| 4.2.13 | Admin exports attendance report as CSV | Admin Rep | ☐ | |
| 4.2.14 | Admin exports attendance report as PDF | Admin Rep | ☐ | |
| 4.2.15 | Admin manages absence reason categories | Admin Rep | ☐ | |

**UAT Sign-off**: _________________________ Date: _____________

---

### 4.3 UAT Issue Resolution

| # | Issue | Severity | Resolution | Status |
|---|-------|----------|------------|--------|
| | | | | |

> All Critical and High severity issues must be resolved before proceeding to production deployment.
> Medium and Low severity issues may be deferred with documented approval.

**Sign-off**: _________________________ Date: _____________

---

## Stage 5: Production Deployment

### 5.1 Pre-Deployment Final Checks

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 5.1.1 | All previous stages signed off | Team Lead | ☐ | |
| 5.1.2 | Deployment window communicated to stakeholders | Team Lead | ☐ | Window: |
| 5.1.3 | Maintenance page prepared (if applicable) | DevOps | ☐ | |
| 5.1.4 | On-call team confirmed and available | Team Lead | ☐ | |
| 5.1.5 | Rollback plan reviewed by team | Team Lead | ☐ | |
| 5.1.6 | Production database backup taken (within 1 hour of deploy) | DBA | ☐ | Backup ID: |
| 5.1.7 | Deployment artifact (build) verified | DevOps | ☐ | Build ID: |

**Sign-off**: _________________________ Date: _____________

---

### 5.2 Production Deployment Execution

| # | Step | Owner | Status | Time | Notes |
|---|------|-------|--------|------|-------|
| 5.2.1 | Enable maintenance mode (if applicable) | DevOps | ☐ | | |
| 5.2.2 | Run database migrations on production | DBA | ☐ | | |
| 5.2.3 | Verify migration success — check all new tables exist | DBA | ☐ | | |
| 5.2.4 | Deploy application to production | DevOps | ☐ | | |
| 5.2.5 | Verify health check endpoint returns 200 OK | DevOps | ☐ | | |
| 5.2.6 | Disable maintenance mode | DevOps | ☐ | | |
| 5.2.7 | Verify application is accessible | DevOps | ☐ | | |

**Deployment Start Time**: _____________ **End Time**: _____________

**Sign-off**: _________________________ Date: _____________

---

### 5.3 Post-Deployment Verification

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 5.3.1 | Health check endpoint returns 200 OK | DevOps | ☐ | |
| 5.3.2 | Teacher attendance entry works in production | QA Lead | ☐ | |
| 5.3.3 | Analytics dashboard loads in production | QA Lead | ☐ | |
| 5.3.4 | No critical errors in production logs (first 15 min) | DevOps | ☐ | |
| 5.3.5 | Error rate within acceptable threshold (< 0.1%) | DevOps | ☐ | |
| 5.3.6 | Response times within benchmarks | DevOps | ☐ | |
| 5.3.7 | Database connections stable | DBA | ☐ | |
| 5.3.8 | Cache (Redis) operational | DevOps | ☐ | |
| 5.3.9 | Biometric device sync scheduler running | DevOps | ☐ | |
| 5.3.10 | Monitoring alerts configured and active | DevOps | ☐ | |

**Sign-off**: _________________________ Date: _____________

---

## Stage 6: Monitoring & Incident Response

### 6.1 Monitoring Setup

| # | Check | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 6.1.1 | Application performance monitoring (APM) active | DevOps | ☐ | Tool: |
| 6.1.2 | Error tracking configured (e.g., Sentry) | DevOps | ☐ | |
| 6.1.3 | Database performance monitoring active | DBA | ☐ | |
| 6.1.4 | Uptime monitoring configured | DevOps | ☐ | |
| 6.1.5 | Alert thresholds set for error rate, response time, CPU, memory | DevOps | ☐ | |
| 6.1.6 | On-call rotation schedule confirmed for first 48 hours | Team Lead | ☐ | |

**Sign-off**: _________________________ Date: _____________

---

### 6.2 Incident Response Plan

**Rollback Triggers** — initiate rollback immediately if any of the following occur within 2 hours of deployment:

- Error rate exceeds 1% of requests
- Any critical data loss or corruption detected
- Health check endpoint fails for > 2 consecutive minutes
- Response times exceed 2× the benchmark for > 5 minutes
- Database migration causes data integrity issues

**Rollback Procedure:**

```bash
# Step 1: Redeploy previous application version
git checkout <previous-tag>
npm run build
npm run deploy

# Step 2: Rollback database migrations (if needed)
npx prisma migrate resolve --rolled-back <migration-name>
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -F c attendance_backup_<timestamp>.dump

# Step 3: Verify rollback
curl -f https://yourdomain.com/api/health
```

**Communication Plan:**

| Event | Who to Notify | Channel | Within |
|-------|--------------|---------|--------|
| Deployment started | All stakeholders | Email | Before start |
| Deployment complete | All stakeholders | Email | Immediately |
| Issue detected | On-call team | Slack/Phone | Immediately |
| Rollback initiated | Management + stakeholders | Email + Slack | Within 5 min |
| Rollback complete | All stakeholders | Email | Immediately |
| Post-mortem scheduled | Team | Calendar invite | Within 24 hours |

---

## Go / No-Go Decision

### Go Criteria — ALL must be met

| # | Criterion | Met? |
|---|-----------|------|
| G1 | All unit, integration, and e2e tests passing | ☐ |
| G2 | Code coverage ≥ 80% | ☐ |
| G3 | Security audit passed — no critical/high vulnerabilities | ☐ |
| G4 | All performance benchmarks met | ☐ |
| G5 | Staging deployment successful and validated | ☐ |
| G6 | UAT completed — all critical issues resolved | ☐ |
| G7 | Production database backup taken and verified | ☐ |
| G8 | Rollback plan reviewed and team is ready | ☐ |
| G9 | All team sign-offs obtained (Dev, QA, Security, DevOps, DBA) | ☐ |

### No-Go Criteria — ANY triggers a hold

- Any failing test in the CI/CD pipeline
- Critical or high security vulnerability unresolved
- Performance benchmarks not met
- UAT critical issues unresolved
- Database backup not verified
- Key team member unavailable during deployment window

---

## Final Sign-offs

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Development Lead | | | |
| QA Lead | | | |
| Security Lead | | | |
| DevOps / Infrastructure | | | |
| Database Administrator | | | |
| Product Owner / Team Lead | | | |

---

## Deployment Log

| Timestamp | Action | Performed By | Result | Notes |
|-----------|--------|-------------|--------|-------|
| | | | | |
| | | | | |
| | | | | |

---

*Document version: 1.0 — Attendance Logging System*
*Last updated: See git history*
*Related documents: `docs/attendance/deployment-guide.md`, `docs/attendance/api-documentation.md`*
