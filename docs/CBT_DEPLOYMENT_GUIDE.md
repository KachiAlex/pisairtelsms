# CBT & Examinations Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the CBT (Computer-Based Testing) & Examinations system to development, staging, and production environments. The system consists of a Node.js/Vercel backend API, React frontend, PostgreSQL database, and WebSocket server for real-time monitoring.

## Pre-Deployment Checklist

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 13+ installed and running
- [ ] Git repository access
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Environment variables configured
- [ ] SSL certificates obtained (production)
- [ ] Database backups configured
- [ ] Monitoring and logging setup
- [ ] All tests passing (100% pass rate)
- [ ] Security audit completed

### Required Credentials
- [ ] Database connection string
- [ ] JWT secret key
- [ ] API keys for external services
- [ ] Email service credentials
- [ ] AWS/Cloud storage credentials
- [ ] Vercel project token

---

## Environment Configuration

### Development Environment

**File**: `.env.local`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cbt_dev
DATABASE_POOL_SIZE=10

# API
API_URL=http://localhost:3000
API_PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRY=24h

# WebSocket
WS_URL=ws://localhost:3000
WS_PORT=3000

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-key

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Feature Flags
ENABLE_PROCTORING=true
ENABLE_OFFLINE_SYNC=true
ENABLE_REAL_TIME_MONITORING=true
```

### Staging Environment

**File**: `.env.staging`

```env
# Database
DATABASE_URL=postgresql://user:password@staging-db.example.com:5432/cbt_staging
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# API
API_URL=https://staging-api.example.com
API_PORT=443
NODE_ENV=staging

# JWT
JWT_SECRET=staging-secret-key-change-in-production
JWT_EXPIRY=24h

# WebSocket
WS_URL=wss://staging-api.example.com
WS_PORT=443

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-staging-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Feature Flags
ENABLE_PROCTORING=true
ENABLE_OFFLINE_SYNC=true
ENABLE_REAL_TIME_MONITORING=true

# Monitoring
SENTRY_DSN=your-sentry-staging-dsn
DATADOG_API_KEY=your-datadog-key
```

### Production Environment

**File**: `.env.production`

```env
# Database
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/cbt_prod
DATABASE_POOL_SIZE=50
DATABASE_SSL=true
DATABASE_REPLICA_URL=postgresql://user:password@prod-db-replica.example.com:5432/cbt_prod

# API
API_URL=https://api.example.com
API_PORT=443
NODE_ENV=production

# JWT
JWT_SECRET=production-secret-key-use-strong-random-key
JWT_EXPIRY=24h

# WebSocket
WS_URL=wss://api.example.com
WS_PORT=443

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-production-key

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json

# Feature Flags
ENABLE_PROCTORING=true
ENABLE_OFFLINE_SYNC=true
ENABLE_REAL_TIME_MONITORING=true

# Monitoring
SENTRY_DSN=your-sentry-production-dsn
DATADOG_API_KEY=your-datadog-production-key

# Security
CORS_ORIGIN=https://example.com
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100

# Performance
CACHE_TTL=3600
REDIS_URL=redis://prod-redis.example.com:6379
```

---

## Database Migration

### Pre-Migration Steps

1. **Backup existing database**
   ```bash
   pg_dump -U postgres cbt_prod > cbt_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Verify backup integrity**
   ```bash
   pg_restore --list cbt_backup_20260504_120000.sql | head -20
   ```

3. **Test migration on staging**
   ```bash
   psql -U postgres -d cbt_staging -f api/tenant/cbt/_migrations/001_create_cbt_schema.sql
   ```

### Running Migrations

**Development**:
```bash
# Connect to development database
psql -U postgres -d cbt_dev -f api/tenant/cbt/_migrations/001_create_cbt_schema.sql

# Verify schema
psql -U postgres -d cbt_dev -c "\dt"
```

**Staging**:
```bash
# Connect to staging database
psql -U postgres -h staging-db.example.com -d cbt_staging -f api/tenant/cbt/_migrations/001_create_cbt_schema.sql

# Verify schema
psql -U postgres -h staging-db.example.com -d cbt_staging -c "\dt"
```

**Production**:
```bash
# Connect to production database (with SSL)
psql -U postgres -h prod-db.example.com -d cbt_prod -f api/tenant/cbt/_migrations/001_create_cbt_schema.sql --set=sslmode=require

# Verify schema
psql -U postgres -h prod-db.example.com -d cbt_prod -c "\dt" --set=sslmode=require
```

### Post-Migration Verification

```bash
# Verify all tables created
psql -U postgres -d cbt_prod -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"

# Verify indexes
psql -U postgres -d cbt_prod -c "SELECT indexname FROM pg_indexes WHERE schemaname='public';"

# Verify constraints
psql -U postgres -d cbt_prod -c "SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema='public';"

# Check table row counts
psql -U postgres -d cbt_prod -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Application Deployment

### Development Deployment

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run database migrations**
   ```bash
   npm run migrate:dev
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Verify API health**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Staging Deployment

1. **Build application**
   ```bash
   npm run build
   ```

2. **Run tests**
   ```bash
   npm run test
   npm run test:integration
   npm run test:performance
   ```

3. **Deploy to Vercel staging**
   ```bash
   vercel --prod --env-file .env.staging
   ```

4. **Run database migrations**
   ```bash
   npm run migrate:staging
   ```

5. **Verify deployment**
   ```bash
   curl https://staging-api.example.com/api/health
   ```

6. **Run smoke tests**
   ```bash
   npm run test:smoke:staging
   ```

### Production Deployment

1. **Create release branch**
   ```bash
   git checkout -b release/v1.0.0
   git push origin release/v1.0.0
   ```

2. **Build application**
   ```bash
   npm run build
   ```

3. **Run all tests**
   ```bash
   npm run test
   npm run test:integration
   npm run test:performance
   npm run test:security
   ```

4. **Create backup**
   ```bash
   pg_dump -U postgres cbt_prod > cbt_backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql
   ```

5. **Deploy to Vercel production**
   ```bash
   vercel --prod --env-file .env.production
   ```

6. **Run database migrations**
   ```bash
   npm run migrate:prod
   ```

7. **Verify deployment**
   ```bash
   curl https://api.example.com/api/health
   ```

8. **Run smoke tests**
   ```bash
   npm run test:smoke:prod
   ```

9. **Monitor logs**
   ```bash
   vercel logs --prod
   ```

---

## WebSocket Configuration

### Development

```javascript
// src/config/websocket.ts
export const wsConfig = {
  url: process.env.WS_URL || 'ws://localhost:3000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};
```

### Staging/Production

```javascript
// src/config/websocket.ts
export const wsConfig = {
  url: process.env.WS_URL || 'wss://api.example.com',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  ssl: true,
  cert: process.env.SSL_CERT_PATH,
  key: process.env.SSL_KEY_PATH,
};
```

### WebSocket Server Setup

```bash
# Install WebSocket dependencies
npm install ws socket.io socket.io-client

# Configure WebSocket server
# api/tenant/cbt/ws-monitoring.ts

# Start WebSocket server
npm run start:ws
```

---

## Security Configuration

### SSL/TLS Certificates

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# For production, use Let's Encrypt
certbot certonly --standalone -d api.example.com
```

### Environment Security

```bash
# Encrypt sensitive environment variables
npm install dotenv-vault

# Create encrypted .env.vault file
npx dotenv-vault push

# Verify encryption
npx dotenv-vault status
```

### Database Security

```bash
# Enable SSL for database connections
DATABASE_SSL=true
DATABASE_SSL_CERT=/path/to/cert.pem

# Create database user with limited permissions
CREATE USER cbt_app WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE cbt_prod TO cbt_app;
GRANT USAGE ON SCHEMA public TO cbt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cbt_app;
```

---

## Monitoring and Logging

### Application Monitoring

```bash
# Install monitoring tools
npm install sentry @sentry/node @sentry/tracing

# Configure Sentry
# src/config/monitoring.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Log Aggregation

```bash
# Install logging tools
npm install winston winston-datadog

# Configure Winston
# src/config/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Performance Monitoring

```bash
# Install performance monitoring
npm install @datadog/browser-rum @datadog/browser-logs

# Configure Datadog
# src/config/datadog.ts
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.DATADOG_APP_ID,
  clientToken: process.env.DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'cbt-examinations',
  env: process.env.NODE_ENV,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});
```

---

## Rollback Procedures

### Application Rollback

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Redeploy previous version
vercel --prod --env-file .env.production
```

### Database Rollback

```bash
# Restore from backup
psql -U postgres -d cbt_prod < cbt_backup_pre_deploy_20260504_120000.sql

# Verify restoration
psql -U postgres -d cbt_prod -c "SELECT COUNT(*) FROM exams;"
```

### Partial Rollback

```bash
# If only specific tables need rollback
psql -U postgres -d cbt_prod << EOF
BEGIN;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS student_answers CASCADE;
COMMIT;
EOF

# Restore specific tables from backup
pg_restore -U postgres -d cbt_prod -t exam_results cbt_backup_pre_deploy_20260504_120000.sql
pg_restore -U postgres -d cbt_prod -t student_answers cbt_backup_pre_deploy_20260504_120000.sql
```

---

## Post-Deployment Verification

### Health Checks

```bash
# API health check
curl -X GET https://api.example.com/api/health

# Database connectivity
curl -X GET https://api.example.com/api/health/db

# WebSocket connectivity
curl -X GET https://api.example.com/api/health/ws
```

### Smoke Tests

```bash
# Run smoke tests
npm run test:smoke:prod

# Expected output:
# ✓ API health check passed
# ✓ Database connectivity verified
# ✓ WebSocket connection established
# ✓ Authentication working
# ✓ Question bank API responding
# ✓ Exam management API responding
# ✓ Results API responding
# ✓ Monitoring API responding
```

### Performance Baseline

```bash
# Run performance tests
npm run test:performance:prod

# Expected results:
# - API response time: < 200ms (p95)
# - Database query time: < 100ms (p95)
# - WebSocket latency: < 50ms
# - Page load time: < 3s
```

### Security Verification

```bash
# Run security tests
npm run test:security:prod

# Expected results:
# - All endpoints require authentication
# - Authorization properly enforced
# - Input validation prevents injection
# - SSL/TLS properly configured
# - CORS properly configured
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit, integration, performance, security)
- [ ] Code review completed
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] Environment variables verified
- [ ] SSL certificates valid
- [ ] Team notified of deployment

### During Deployment
- [ ] Monitor deployment progress
- [ ] Check application logs
- [ ] Verify database migrations
- [ ] Monitor system resources
- [ ] Check error rates
- [ ] Verify WebSocket connections

### Post-Deployment
- [ ] Run health checks
- [ ] Run smoke tests
- [ ] Verify all features working
- [ ] Check performance metrics
- [ ] Review error logs
- [ ] Confirm user access
- [ ] Document deployment
- [ ] Notify stakeholders

---

## Troubleshooting

### Common Deployment Issues

**Issue**: Database migration fails
- **Solution**: Check database connectivity and permissions
- **Command**: `psql -U postgres -d cbt_prod -c "SELECT version();"`

**Issue**: WebSocket connection fails
- **Solution**: Verify WebSocket server is running and SSL configured
- **Command**: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" wss://api.example.com/ws`

**Issue**: High API latency
- **Solution**: Check database query performance and add indexes
- **Command**: `npm run analyze:queries:prod`

**Issue**: Memory leak in Node.js
- **Solution**: Check for unclosed connections and event listeners
- **Command**: `npm run profile:memory:prod`

---

## Maintenance

### Daily Tasks
- [ ] Monitor error rates
- [ ] Check disk space
- [ ] Verify backups completed
- [ ] Review performance metrics

### Weekly Tasks
- [ ] Analyze slow queries
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Run performance tests

### Monthly Tasks
- [ ] Archive old logs
- [ ] Optimize database
- [ ] Review and update documentation
- [ ] Plan capacity upgrades

---

## References

- API Documentation: `docs/CBT_API_DOCUMENTATION.md`
- Component Documentation: `docs/CBT_COMPONENT_DOCUMENTATION.md`
- Database Documentation: `docs/CBT_DATABASE_DOCUMENTATION.md`
- Migration File: `api/tenant/cbt/_migrations/001_create_cbt_schema.sql`
