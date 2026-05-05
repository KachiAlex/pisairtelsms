# Attendance Logging System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Attendance Logging System to development, staging, and production environments. The system consists of a Node.js backend API, React frontend, PostgreSQL database, Redis cache, and biometric device integration.

---

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Database Migration Steps](#database-migration-steps)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Procedures](#deployment-procedures)
5. [Deployment Checklist](#deployment-checklist)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Verification](#monitoring--verification)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Requirements

### System Requirements

#### Node.js Runtime
- **Version**: Node.js 18.x or higher
- **Installation**: Download from [nodejs.org](https://nodejs.org)
- **Verification**:
  ```bash
  node --version  # Should output v18.x.x or higher
  npm --version   # Should output 9.x.x or higher
  ```

#### PostgreSQL Database
- **Version**: PostgreSQL 13 or higher
- **Installation**: Download from [postgresql.org](https://www.postgresql.org/download/)
- **Verification**:
  ```bash
  psql --version  # Should output PostgreSQL 13.x or higher
  ```
- **Required Extensions**:
  - `uuid-ossp` (for UUID generation)
  - `pg_trgm` (for text search optimization)

#### Redis Cache
- **Version**: Redis 6.0 or higher
- **Installation**: Download from [redis.io](https://redis.io/download)
- **Verification**:
  ```bash
  redis-cli --version  # Should output Redis 6.x or higher
  ```
- **Configuration**:
  - Default port: 6379
  - Memory allocation: Minimum 512MB recommended
  - Persistence: RDB snapshots enabled

### Network Requirements

#### Firewall Rules
- **API Port**: 3000 (or configured port)
- **Database Port**: 5432 (PostgreSQL)
- **Redis Port**: 6379 (Redis)
- **WebSocket Port**: 3000 (same as API)
- **Biometric Device Ports**: 8080-8090 (configurable per device)

#### Network Connectivity
- Outbound HTTPS (443) for external API calls
- Outbound SMTP (587 or 25) for email notifications
- Inbound HTTP/HTTPS for client connections
- Device network must be accessible from server

### Security Requirements

#### SSL/TLS Certificates
- **Production**: Valid SSL certificate from trusted CA
- **Staging**: Self-signed or staging certificate
- **Certificate Location**: `/etc/ssl/certs/` (Linux) or `C:\Certificates\` (Windows)
- **Renewal**: Set up automatic renewal (e.g., Let's Encrypt)

#### API Keys & Secrets
- **JWT Secret**: Generate strong random key (minimum 32 characters)
  ```bash
  openssl rand -base64 32
  ```
- **Database Password**: Strong password (minimum 16 characters, mixed case, numbers, symbols)
- **API Keys**: For external services (email, SMS, etc.)
- **Device API Keys**: For biometric device authentication

#### Access Control
- Database user with limited permissions (not root/admin)
- Separate credentials for each environment
- Secure credential storage (environment variables, secrets manager)
- Regular credential rotation (every 90 days)

### Backup Requirements

#### Database Backups
- **Frequency**: Daily automated backups
- **Retention**: Minimum 30 days
- **Location**: Separate storage from production server
- **Testing**: Weekly backup restoration tests
- **Backup Command**:
  ```bash
  pg_dump -U postgres -h localhost attendance_db > backup_$(date +%Y%m%d).sql
  ```

#### File Backups
- **CSV Uploads**: Backup directory for uploaded files
- **Configuration Files**: Backup environment configurations
- **Logs**: Archive logs older than 30 days

#### Disaster Recovery Plan
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 1 hour
- Documented recovery procedures
- Regular disaster recovery drills

---

## Database Migration Steps

### 1. Pre-Migration Checklist

Before running migrations:

```bash
# Verify database connectivity
psql -U postgres -h localhost -d attendance_db -c "SELECT version();"

# Check current database size
psql -U postgres -h localhost -d attendance_db -c "SELECT pg_size_pretty(pg_database_size('attendance_db'));"

# Create backup before migration
pg_dump -U postgres -h localhost attendance_db > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup integrity
pg_restore --list backup_pre_migration_*.sql | head -20
```

### 2. Migration Scripts Location

Migration scripts are located in:
```
project-root/
├── migrations/
│   ├── 001_create_attendance_tables.sql
│   ├── 002_create_device_tables.sql
│   ├── 003_create_audit_tables.sql
│   ├── 004_create_indexes.sql
│   └── 005_create_functions.sql
└── scripts/
    └── run-migrations.sh
```

### 3. Running Migrations

#### Automated Migration (Recommended)

```bash
# Install dependencies
npm install

# Run migrations automatically
npm run migrate:attendance

# Expected output:
# ✓ Migration 001_create_attendance_tables.sql completed
# ✓ Migration 002_create_device_tables.sql completed
# ✓ Migration 003_create_audit_tables.sql completed
# ✓ Migration 004_create_indexes.sql completed
# ✓ Migration 005_create_functions.sql completed
# All migrations completed successfully
```

#### Manual Migration (If Needed)

```bash
# Connect to database
psql -U postgres -h localhost -d attendance_db

# Run each migration file in order
\i migrations/001_create_attendance_tables.sql
\i migrations/002_create_device_tables.sql
\i migrations/003_create_audit_tables.sql
\i migrations/004_create_indexes.sql
\i migrations/005_create_functions.sql

# Verify migrations
\dt  # List all tables
\di  # List all indexes
```

### 4. Verifying Migrations

After running migrations, verify the schema:

```bash
# Check attendance_records table
psql -U postgres -h localhost -d attendance_db -c "\d attendance_records"

# Check biometric_devices table
psql -U postgres -h localhost -d attendance_db -c "\d biometric_devices"

# Check indexes
psql -U postgres -h localhost -d attendance_db -c "\di"

# Verify row counts (should be 0 for new database)
psql -U postgres -h localhost -d attendance_db -c "
  SELECT 
    'attendance_records' as table_name, COUNT(*) as row_count FROM attendance_records
  UNION ALL
  SELECT 'biometric_devices', COUNT(*) FROM biometric_devices
  UNION ALL
  SELECT 'device_enrollment', COUNT(*) FROM device_enrollment
  UNION ALL
  SELECT 'device_sync_logs', COUNT(*) FROM device_sync_logs
  UNION ALL
  SELECT 'attendance_audit_trail', COUNT(*) FROM attendance_audit_trail
  UNION ALL
  SELECT 'absence_reasons', COUNT(*) FROM absence_reasons;
"
```

### 5. Rollback Procedures

If migrations fail or need to be rolled back:

```bash
# Restore from backup
psql -U postgres -h localhost -d attendance_db < backup_pre_migration_*.sql

# Verify restoration
psql -U postgres -h localhost -d attendance_db -c "SELECT COUNT(*) FROM attendance_records;"

# Check for any errors in logs
tail -100 migration.log
```

---

## Environment Configuration

### Development Environment

**File**: `.env.local`

```env
# Database Configuration
DATABASE_URL=postgresql://attendance_user:password@localhost:5432/attendance_db
DATABASE_POOL_SIZE=10
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=2000

# Redis Cache Configuration
REDIS_URL=redis://localhost:6379
REDIS_DB=0
CACHE_TTL=3600

# API Configuration
API_URL=http://localhost:3000
API_PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=dev-secret-key-minimum-32-characters-long
JWT_EXPIRY=24h

# Biometric Device Configuration
DEVICE_SYNC_TIMEOUT=30000
DEVICE_RETRY_MAX_ATTEMPTS=5
DEVICE_RETRY_INITIAL_DELAY=1000
DEVICE_RETRY_MAX_DELAY=3600000

# Attendance Configuration
ATTENDANCE_BATCH_SIZE=100
ATTENDANCE_ANALYTICS_CACHE_TTL=3600
AT_RISK_THRESHOLD=85

# Email Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@school.example.com

# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=json

# Feature Flags
ENABLE_BIOMETRIC_SYNC=true
ENABLE_BATCH_UPLOAD=true
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
```

### Staging Environment

**File**: `.env.staging`

```env
# Database Configuration
DATABASE_URL=postgresql://attendance_user:password@staging-db.example.com:5432/attendance_staging
DATABASE_POOL_SIZE=20
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=2000
DATABASE_SSL=true

# Redis Cache Configuration
REDIS_URL=redis://staging-redis.example.com:6379
REDIS_DB=1
CACHE_TTL=3600

# API Configuration
API_URL=https://staging-api.example.com
API_PORT=443
NODE_ENV=staging

# JWT Configuration
JWT_SECRET=staging-secret-key-minimum-32-characters-long
JWT_EXPIRY=24h

# Biometric Device Configuration
DEVICE_SYNC_TIMEOUT=30000
DEVICE_RETRY_MAX_ATTEMPTS=5
DEVICE_RETRY_INITIAL_DELAY=1000
DEVICE_RETRY_MAX_DELAY=3600000

# Attendance Configuration
ATTENDANCE_BATCH_SIZE=100
ATTENDANCE_ANALYTICS_CACHE_TTL=3600
AT_RISK_THRESHOLD=85

# Email Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-staging-api-key
EMAIL_FROM=noreply-staging@school.example.com

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Feature Flags
ENABLE_BIOMETRIC_SYNC=true
ENABLE_BATCH_UPLOAD=true
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
```

### Production Environment

**File**: `.env.production` (stored in secrets manager)

```env
# Database Configuration
DATABASE_URL=postgresql://attendance_user:strong-password@prod-db.example.com:5432/attendance_prod
DATABASE_POOL_SIZE=50
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=2000
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# Redis Cache Configuration
REDIS_URL=redis://:password@prod-redis.example.com:6379
REDIS_DB=0
REDIS_TLS=true
CACHE_TTL=3600

# API Configuration
API_URL=https://api.school.example.com
API_PORT=443
NODE_ENV=production

# JWT Configuration
JWT_SECRET=production-secret-key-minimum-32-characters-long-strong
JWT_EXPIRY=24h

# Biometric Device Configuration
DEVICE_SYNC_TIMEOUT=30000
DEVICE_RETRY_MAX_ATTEMPTS=5
DEVICE_RETRY_INITIAL_DELAY=1000
DEVICE_RETRY_MAX_DELAY=3600000

# Attendance Configuration
ATTENDANCE_BATCH_SIZE=100
ATTENDANCE_ANALYTICS_CACHE_TTL=3600
AT_RISK_THRESHOLD=85

# Email Configuration
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-production-api-key
EMAIL_FROM=noreply@school.example.com

# Logging Configuration
LOG_LEVEL=warn
LOG_FORMAT=json

# Feature Flags
ENABLE_BIOMETRIC_SYNC=true
ENABLE_BATCH_UPLOAD=true
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://school.example.com
```

### Configuration File Setup

#### 1. Create Configuration Directory

```bash
# Create config directory
mkdir -p config

# Create environment-specific config files
touch config/development.json
touch config/staging.json
touch config/production.json
```

#### 2. Database Connection Strings

**Format**: `postgresql://username:password@host:port/database`

**Examples**:
```
Development:  postgresql://attendance_user:dev_password@localhost:5432/attendance_db
Staging:      postgresql://attendance_user:staging_password@staging-db.example.com:5432/attendance_staging
Production:   postgresql://attendance_user:prod_password@prod-db.example.com:5432/attendance_prod
```

#### 3. API Key Generation

Generate secure API keys for external services:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate API key for device authentication
openssl rand -hex 32

# Generate encryption key
openssl rand -base64 32
```

#### 4. Cache Configuration

Redis configuration for different environments:

```javascript
// Development
{
  "redis": {
    "host": "localhost",
    "port": 6379,
    "db": 0,
    "ttl": 3600
  }
}

// Production
{
  "redis": {
    "host": "prod-redis.example.com",
    "port": 6379,
    "password": "strong-redis-password",
    "db": 0,
    "ttl": 3600,
    "tls": true
  }
}
```

---

## Deployment Procedures

### Staging Deployment

#### Step 1: Prepare Staging Environment

```bash
# Clone repository
git clone https://github.com/your-org/attendance-system.git
cd attendance-system

# Checkout staging branch
git checkout staging

# Install dependencies
npm install

# Create environment file
cp .env.example .env.staging
# Edit .env.staging with staging values
```

#### Step 2: Run Database Migrations

```bash
# Set environment
export NODE_ENV=staging

# Run migrations
npm run migrate:attendance

# Verify migrations
npm run verify:migrations
```

#### Step 3: Build Application

```bash
# Build frontend
npm run build

# Build backend
npm run build:api

# Verify build
npm run verify:build
```

#### Step 4: Deploy to Staging

```bash
# Deploy using your deployment tool (e.g., Vercel, Docker, etc.)
npm run deploy:staging

# Verify deployment
npm run verify:deployment:staging
```

#### Step 5: Run Smoke Tests

```bash
# Run smoke tests
npm run test:smoke:staging

# Expected output:
# ✓ API health check passed
# ✓ Database connectivity verified
# ✓ Redis connectivity verified
# ✓ Authentication working
# ✓ Attendance endpoints responding
```

### Production Deployment

#### Step 1: Pre-Deployment Verification

```bash
# Verify all tests pass
npm run test

# Run security audit
npm audit

# Check code quality
npm run lint

# Verify performance benchmarks
npm run test:performance
```

#### Step 2: Create Production Release

```bash
# Create release branch
git checkout -b release/v1.0.0

# Update version
npm version patch  # or minor/major

# Create git tag
git tag -a v1.0.0 -m "Production release v1.0.0"

# Push to repository
git push origin release/v1.0.0
git push origin v1.0.0
```

#### Step 3: Database Backup

```bash
# Create pre-deployment backup
pg_dump -U postgres -h prod-db.example.com -d attendance_prod > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
pg_restore --list backup_prod_*.sql | wc -l

# Store backup in secure location
aws s3 cp backup_prod_*.sql s3://backups/attendance/
```

#### Step 4: Deploy to Production

```bash
# Set production environment
export NODE_ENV=production

# Deploy application
npm run deploy:production

# Monitor deployment
npm run monitor:deployment

# Expected output:
# ✓ Application deployed successfully
# ✓ All services healthy
# ✓ Database migrations completed
# ✓ Cache initialized
```

#### Step 5: Post-Deployment Verification

```bash
# Run health checks
npm run health:check:production

# Verify all endpoints
npm run test:endpoints:production

# Check performance metrics
npm run metrics:production

# Monitor error rates
npm run logs:errors:production
```

### Blue-Green Deployment Strategy

For zero-downtime deployments:

```bash
# 1. Deploy new version to "green" environment
npm run deploy:green

# 2. Run tests on green environment
npm run test:green

# 3. Switch traffic from blue to green
npm run switch:traffic:blue-to-green

# 4. Monitor green environment
npm run monitor:green

# 5. Keep blue environment as rollback target
npm run keep:blue:standby

# 6. After 24 hours, decommission blue
npm run decommission:blue
```

### Canary Deployment Strategy

For gradual rollout:

```bash
# 1. Deploy new version to canary environment (5% traffic)
npm run deploy:canary --traffic=5

# 2. Monitor canary metrics
npm run monitor:canary

# 3. If metrics good, increase to 25%
npm run deploy:canary --traffic=25

# 4. Monitor again
npm run monitor:canary

# 5. If metrics good, increase to 50%
npm run deploy:canary --traffic=50

# 6. If metrics good, increase to 100%
npm run deploy:canary --traffic=100

# 7. Promote canary to production
npm run promote:canary:to-production
```

---

## Deployment Checklist

### Pre-Deployment Checks

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed and approved
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Database backups created and verified
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Monitoring and alerting configured
- [ ] Incident response plan ready
- [ ] Communication channels open

### Deployment Steps

- [ ] Environment variables configured
- [ ] Database migrations tested in staging
- [ ] Application built successfully
- [ ] Deployment initiated
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Database connectivity verified
- [ ] Cache initialized
- [ ] Biometric device sync working
- [ ] Analytics calculations accurate

### Post-Deployment Verification

- [ ] All endpoints responding with correct status codes
- [ ] Database queries performing within SLA
- [ ] Cache hit rates above 80%
- [ ] Error rates below 0.1%
- [ ] Response times under 500ms
- [ ] No critical errors in logs
- [ ] Biometric device syncs completing
- [ ] Notifications sending successfully
- [ ] Analytics dashboard showing data
- [ ] User acceptance testing passed

### Rollback Plan

- [ ] Rollback procedure documented
- [ ] Previous version tagged and available
- [ ] Database rollback scripts prepared
- [ ] Communication plan for rollback
- [ ] Rollback decision criteria defined
- [ ] Team trained on rollback procedure

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Critical errors in logs (error rate > 1%)
- Database connectivity issues
- API response times > 2 seconds
- Biometric device sync failures
- Data corruption detected
- Security vulnerability discovered
- User-facing functionality broken

### Rollback Steps

#### Step 1: Assess Situation

```bash
# Check error logs
tail -100 logs/error.log

# Check metrics
npm run metrics:current

# Check database integrity
npm run verify:database

# Notify team
# Send message to #incidents channel
```

#### Step 2: Initiate Rollback

```bash
# Stop current deployment
npm run stop:deployment

# Switch traffic back to previous version
npm run switch:traffic:green-to-blue

# Verify traffic switched
npm run verify:traffic:switched
```

#### Step 3: Restore Database (If Needed)

```bash
# Stop application
npm run stop:app

# Restore from backup
psql -U postgres -h prod-db.example.com -d attendance_prod < backup_prod_pre_deployment.sql

# Verify restoration
npm run verify:database

# Start application
npm run start:app
```

#### Step 4: Verify Rollback

```bash
# Run health checks
npm run health:check:production

# Verify endpoints
npm run test:endpoints:production

# Check error rates
npm run metrics:production

# Confirm with team
# Send message: "Rollback completed successfully"
```

#### Step 5: Post-Rollback Analysis

```bash
# Collect logs from failed deployment
npm run collect:logs:failed-deployment

# Analyze root cause
npm run analyze:failure

# Document incident
# Create incident report in wiki

# Schedule post-mortem
# Send calendar invite to team
```

### Data Recovery

If data corruption occurred:

```bash
# Restore from backup
pg_restore -U postgres -h prod-db.example.com -d attendance_prod backup_prod_pre_deployment.sql

# Verify data integrity
npm run verify:data:integrity

# Check for missing records
npm run check:missing:records

# Notify affected users
npm run notify:users:data-recovery
```

### Communication Plan

1. **Immediate** (within 5 minutes):
   - Notify team lead
   - Post to #incidents channel
   - Update status page

2. **Within 15 minutes**:
   - Send email to stakeholders
   - Document incident details
   - Begin root cause analysis

3. **Within 1 hour**:
   - Complete rollback
   - Verify system stability
   - Send all-clear notification

4. **Within 24 hours**:
   - Complete incident report
   - Schedule post-mortem
   - Implement preventive measures

---

## Monitoring & Verification

### Health Checks

Run health checks regularly:

```bash
# API health
curl -X GET https://api.school.example.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-05-04T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "api": "responding"
  }
}
```

### Performance Monitoring

Monitor key metrics:

```bash
# Response time
npm run metrics:response-time

# Database query performance
npm run metrics:database-queries

# Cache hit rate
npm run metrics:cache-hit-rate

# Error rate
npm run metrics:error-rate
```

### Error Monitoring

Monitor error logs:

```bash
# View recent errors
npm run logs:errors:recent

# View errors by endpoint
npm run logs:errors:by-endpoint

# View errors by severity
npm run logs:errors:by-severity

# Alert on critical errors
npm run alerts:critical-errors
```

### User Acceptance Testing

Verify functionality:

```bash
# Test teacher attendance entry
npm run test:uat:teacher-entry

# Test biometric device sync
npm run test:uat:device-sync

# Test batch upload
npm run test:uat:batch-upload

# Test analytics dashboard
npm run test:uat:analytics
```

---

## Troubleshooting

### Common Deployment Issues

#### Issue: Database Connection Failed

**Symptoms**: "Cannot connect to database" error

**Solution**:
```bash
# Verify database is running
psql -U postgres -h prod-db.example.com -c "SELECT 1"

# Check connection string
echo $DATABASE_URL

# Verify credentials
psql -U attendance_user -h prod-db.example.com -d attendance_prod

# Check firewall rules
telnet prod-db.example.com 5432
```

#### Issue: Redis Connection Failed

**Symptoms**: "Cannot connect to Redis" error

**Solution**:
```bash
# Verify Redis is running
redis-cli -h prod-redis.example.com ping

# Check connection string
echo $REDIS_URL

# Verify credentials
redis-cli -h prod-redis.example.com -a password ping

# Check firewall rules
telnet prod-redis.example.com 6379
```

#### Issue: Migration Failed

**Symptoms**: "Migration error" during deployment

**Solution**:
```bash
# Check migration logs
tail -50 migration.log

# Verify database state
psql -U postgres -h prod-db.example.com -d attendance_prod -c "\dt"

# Rollback to previous state
psql -U postgres -h prod-db.example.com -d attendance_prod < backup_pre_migration.sql

# Re-run migrations
npm run migrate:attendance
```

#### Issue: Biometric Device Sync Failing

**Symptoms**: "Device sync failed" errors

**Solution**:
```bash
# Check device connectivity
npm run test:device:connection --device-id=<device-id>

# Verify device configuration
npm run show:device:config --device-id=<device-id>

# Check device logs
npm run logs:device --device-id=<device-id>

# Restart device sync
npm run restart:device:sync --device-id=<device-id>
```

#### Issue: High Error Rate

**Symptoms**: Error rate > 1%

**Solution**:
```bash
# Check error logs
npm run logs:errors:recent

# Identify error patterns
npm run analyze:errors

# Check resource usage
npm run metrics:resources

# Scale up if needed
npm run scale:up --instances=5
```

### Database Issues

#### Issue: Slow Queries

**Solution**:
```bash
# Identify slow queries
psql -U postgres -h prod-db.example.com -d attendance_prod -c "
  SELECT query, calls, mean_time FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 10;
"

# Add missing indexes
npm run optimize:indexes

# Analyze query plans
EXPLAIN ANALYZE SELECT * FROM attendance_records WHERE date = '2024-05-04';
```

#### Issue: Disk Space Full

**Solution**:
```bash
# Check disk usage
df -h

# Check database size
psql -U postgres -h prod-db.example.com -d attendance_prod -c "
  SELECT pg_size_pretty(pg_database_size('attendance_prod'));
"

# Archive old logs
npm run archive:logs --older-than=30days

# Vacuum database
VACUUM ANALYZE;
```

### API Issues

#### Issue: API Not Responding

**Solution**:
```bash
# Check API status
curl -X GET https://api.school.example.com/health

# Check API logs
npm run logs:api:recent

# Restart API
npm run restart:api

# Check resource usage
npm run metrics:resources
```

#### Issue: High Latency

**Solution**:
```bash
# Check response times
npm run metrics:response-time

# Identify slow endpoints
npm run analyze:slow-endpoints

# Check database performance
npm run metrics:database-queries

# Enable caching
npm run enable:caching
```

### Device Sync Issues

#### Issue: Device Not Syncing

**Solution**:
```bash
# Check device status
npm run show:device:status --device-id=<device-id>

# Test device connection
npm run test:device:connection --device-id=<device-id>

# Check device logs
npm run logs:device --device-id=<device-id>

# Manually trigger sync
npm run sync:device --device-id=<device-id>
```

#### Issue: Sync Records Not Appearing

**Solution**:
```bash
# Check sync logs
npm run logs:sync:recent

# Verify enrollment mapping
npm run verify:enrollment:mapping --device-id=<device-id>

# Check for unmatched records
npm run show:unmatched:records --device-id=<device-id>

# Re-enroll students
npm run enroll:students --device-id=<device-id>
```

---

## Support & Escalation

### Support Contacts

- **Technical Support**: support@school.example.com
- **On-Call Engineer**: +1-555-0100
- **Incident Commander**: incidents@school.example.com

### Escalation Path

1. **Level 1**: Support team (response time: 15 minutes)
2. **Level 2**: Engineering team (response time: 30 minutes)
3. **Level 3**: Senior engineer (response time: 1 hour)
4. **Level 4**: CTO (response time: 2 hours)

### Documentation

- [User Guide](./teacher-user-guide.md)
- [Admin Guide](./admin-user-guide.md)
- [API Documentation](./api-documentation.md)
- [Device Setup Guide](./device-setup-guide.md)
- [Troubleshooting Guide](./troubleshooting-guide.md)

---

## Appendix

### A. Useful Commands

```bash
# Check application status
npm run status

# View logs
npm run logs:app

# Run tests
npm run test

# Build application
npm run build

# Start application
npm run start

# Stop application
npm run stop

# Restart application
npm run restart
```

### B. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| REDIS_URL | Redis connection string | redis://host:6379 |
| JWT_SECRET | JWT signing secret | random-32-char-string |
| API_URL | API base URL | https://api.example.com |
| NODE_ENV | Environment | production |
| LOG_LEVEL | Logging level | info |

### C. Monitoring Dashboards

- **Grafana**: https://monitoring.school.example.com
- **Datadog**: https://app.datadoghq.com
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch

### D. Incident Response

- **Incident Report Template**: [Link to template]
- **Post-Mortem Template**: [Link to template]
- **Runbook**: [Link to runbook]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-05-04 | Initial deployment guide |

---

**Last Updated**: 2024-05-04  
**Maintained By**: DevOps Team  
**Next Review**: 2024-06-04
