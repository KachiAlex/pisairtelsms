# CBT Dashboard Deployment Guide

**Version**: 1.0.0  
**Last Updated**: April 28, 2026

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, verify:

### Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] Code review completed
- [ ] Security scan passed

### Documentation
- [ ] API documentation complete
- [ ] Component documentation complete
- [ ] Deployment guide reviewed
- [ ] Configuration guide reviewed
- [ ] Troubleshooting guide reviewed

### Database
- [ ] Migration scripts tested on clean database
- [ ] Database backups configured
- [ ] Connection pooling configured
- [ ] Indexes verified

### Infrastructure
- [ ] Server resources adequate (CPU, RAM, disk)
- [ ] Network connectivity verified
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] Load balancer configured (if applicable)

### Monitoring
- [ ] Logging configured
- [ ] Error tracking configured
- [ ] Performance monitoring configured
- [ ] Alerts configured
- [ ] Backup procedures tested

---

## Environment Setup

### 1. Environment Variables

Create `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
APP_URL=https://api.scholarx.app
APP_PORT=3000

# Database
DB_HOST=db.production.internal
DB_PORT=5432
DB_NAME=school_management
DB_USER=cbt_user
DB_PASSWORD=<secure_password>
POSTGRES_URL=postgresql://cbt_user:password@db.production.internal:5432/school_management

# Authentication
JWT_SECRET=<secure_jwt_secret>
JWT_EXPIRY=86400

# Security
CORS_ORIGIN=https://scholarx.app
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket
WS_URL=wss://api.scholarx.app/ws
WS_HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/var/log/cbt/app.log

# Monitoring
SENTRY_DSN=<sentry_dsn>
DATADOG_API_KEY=<datadog_key>

# Email (for notifications)
SMTP_HOST=smtp.production.internal
SMTP_PORT=587
SMTP_USER=noreply@scholarx.app
SMTP_PASSWORD=<secure_password>
SMTP_FROM=noreply@scholarx.app

# File Storage
STORAGE_TYPE=s3
S3_BUCKET=cbt-exports
S3_REGION=us-east-1
S3_ACCESS_KEY=<aws_access_key>
S3_SECRET_KEY=<aws_secret_key>
```

### 2. Verify Environment Variables

```bash
# Check all required variables are set
node scripts/verify-env.js

# Expected output:
# ✓ All required environment variables are set
```

### 3. SSL/TLS Configuration

```bash
# Verify SSL certificates
openssl x509 -in /etc/ssl/certs/api.crt -text -noout

# Expected: Certificate is valid and not expired
```

---

## Database Setup

### 1. Create Database User

```sql
-- Connect as superuser
psql -h db.production.internal -U postgres

-- Create user
CREATE USER cbt_user WITH PASSWORD '<secure_password>';

-- Create database
CREATE DATABASE school_management OWNER cbt_user;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE school_management TO cbt_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO cbt_user;
```

### 2. Run Migrations

```bash
# Option A: Using API endpoint
curl -X POST https://api.scholarx.app/api/tenant/cbt/init-db \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"

# Option B: Using direct SQL
psql -h db.production.internal -U cbt_user -d school_management \
  -f api/tenant/cbt/_lib/migrations/001_create_cbt_tables.sql

# Option C: Using Node.js script
NODE_ENV=production node api/tenant/cbt/_lib/migrations/run-migration.js
```

### 3. Verify Database Setup

```bash
# Connect to database
psql -h db.production.internal -U cbt_user -d school_management

# List tables
\dt

# Expected: All 8 tables created
# - exam_questions
# - exam_results
# - exams
# - proctoring_logs
# - questions_bank
# - security_settings
# - student_answers
# - student_exam_progress

# Check indexes
\di

# Expected: All indexes created

# Exit
\q
```

### 4. Configure Connection Pooling

```javascript
// config/database.js
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

module.exports = pool
```

### 5. Setup Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-cbt-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/cbt"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cbt_backup_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "cbt_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /usr/local/bin/backup-cbt-db.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-cbt-db.sh" | crontab -
```

---

## Application Deployment

### 1. Build Application

```bash
# Install dependencies
npm install --production

# Build application
npm run build

# Expected output:
# ✓ Build completed successfully
# ✓ Output: dist/
```

### 2. Deploy to Server

```bash
# Option A: Using Docker
docker build -t cbt-dashboard:1.0.0 .
docker tag cbt-dashboard:1.0.0 registry.production.internal/cbt-dashboard:1.0.0
docker push registry.production.internal/cbt-dashboard:1.0.0

# Option B: Using direct deployment
scp -r dist/ user@production.server:/opt/cbt-dashboard/
scp .env.production user@production.server:/opt/cbt-dashboard/

# Option C: Using CI/CD pipeline
git push origin main  # Triggers automated deployment
```

### 3. Start Application

```bash
# Using Node.js
NODE_ENV=production node dist/main.js

# Using PM2
pm2 start dist/main.js --name "cbt-dashboard" --env production

# Using Docker
docker run -d \
  --name cbt-dashboard \
  --env-file .env.production \
  -p 3000:3000 \
  registry.production.internal/cbt-dashboard:1.0.0

# Using systemd
systemctl start cbt-dashboard
systemctl enable cbt-dashboard
```

### 4. Verify Application is Running

```bash
# Check application status
curl -X GET https://api.scholarx.app/api/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-04-28T10:30:00Z",
#   "version": "1.0.0"
# }

# Check logs
tail -f /var/log/cbt/app.log

# Expected: No errors, application running
```

### 5. Configure Reverse Proxy

```nginx
# /etc/nginx/sites-available/cbt-dashboard
upstream cbt_backend {
  server localhost:3000;
  server localhost:3001;
  server localhost:3002;
  keepalive 64;
}

server {
  listen 443 ssl http2;
  server_name api.scholarx.app;

  ssl_certificate /etc/ssl/certs/api.crt;
  ssl_certificate_key /etc/ssl/private/api.key;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  # Proxy settings
  location /api/tenant/cbt/ {
    proxy_pass http://cbt_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
  }

  # WebSocket
  location /ws/cbt/ {
    proxy_pass http://cbt_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
  }
}

server {
  listen 80;
  server_name api.scholarx.app;
  return 301 https://$server_name$request_uri;
}
```

Enable the configuration:

```bash
ln -s /etc/nginx/sites-available/cbt-dashboard /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API Health
curl -X GET https://api.scholarx.app/api/health

# Database Connection
curl -X GET https://api.scholarx.app/api/tenant/cbt/health/db

# WebSocket Connection
wscat -c wss://api.scholarx.app/ws/cbt/monitoring/test-exam

# Expected: All checks pass
```

### 2. Functional Testing

```bash
# Test Question Bank API
curl -X GET "https://api.scholarx.app/api/tenant/cbt/questions?tenantId=test-tenant&limit=5" \
  -H "Authorization: Bearer <token>"

# Test Exam Management API
curl -X GET "https://api.scholarx.app/api/tenant/cbt/exams?tenantId=test-tenant" \
  -H "Authorization: Bearer <token>"

# Test Results API
curl -X GET "https://api.scholarx.app/api/tenant/cbt/results?tenantId=test-tenant" \
  -H "Authorization: Bearer <token>"

# Expected: All endpoints return 200 OK
```

### 3. Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://api.scholarx.app/api/tenant/cbt/questions?tenantId=test-tenant

# Expected: Response time < 200ms, no errors

# Stress testing with wrk
wrk -t4 -c100 -d30s https://api.scholarx.app/api/tenant/cbt/questions?tenantId=test-tenant

# Expected: Throughput > 100 req/s, error rate < 1%
```

### 4. Security Verification

```bash
# Check SSL/TLS configuration
curl -I https://api.scholarx.app/api/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY

# Test CORS
curl -X OPTIONS https://api.scholarx.app/api/tenant/cbt/questions \
  -H "Origin: https://scholarx.app" \
  -H "Access-Control-Request-Method: GET"

# Expected: CORS headers present
```

### 5. Monitoring Setup

```bash
# Verify logging
tail -f /var/log/cbt/app.log

# Expected: Application logs visible

# Verify error tracking
# Check Sentry dashboard for errors

# Verify performance monitoring
# Check Datadog dashboard for metrics
```

---

## Monitoring and Maintenance

### 1. Application Monitoring

```bash
# Monitor application processes
pm2 monit

# Monitor system resources
top
htop

# Monitor network connections
netstat -an | grep ESTABLISHED | wc -l
```

### 2. Database Monitoring

```bash
# Monitor active connections
psql -h db.production.internal -U cbt_user -d school_management -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Monitor slow queries
psql -h db.production.internal -U cbt_user -d school_management -c \
  "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor table sizes
psql -h db.production.internal -U cbt_user -d school_management -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### 3. Log Rotation

```bash
# Configure logrotate
cat > /etc/logrotate.d/cbt-dashboard << 'EOF'
/var/log/cbt/*.log {
  daily
  rotate 30
  compress
  delaycompress
  notifempty
  create 0640 www-data www-data
  sharedscripts
  postrotate
    systemctl reload cbt-dashboard > /dev/null 2>&1 || true
  endscript
}
EOF
```

### 4. Maintenance Tasks

```bash
# Weekly: Analyze database statistics
psql -h db.production.internal -U cbt_user -d school_management -c "ANALYZE;"

# Monthly: Reindex tables
psql -h db.production.internal -U cbt_user -d school_management -c "REINDEX DATABASE school_management;"

# Monthly: Vacuum tables
psql -h db.production.internal -U cbt_user -d school_management -c "VACUUM ANALYZE;"

# Quarterly: Update dependencies
npm update
npm audit fix
```

---

## Rollback Procedures

### 1. Application Rollback

```bash
# Using PM2
pm2 stop cbt-dashboard
pm2 delete cbt-dashboard
git checkout <previous_version>
npm install
npm run build
pm2 start dist/main.js --name "cbt-dashboard"

# Using Docker
docker stop cbt-dashboard
docker rm cbt-dashboard
docker run -d \
  --name cbt-dashboard \
  --env-file .env.production \
  -p 3000:3000 \
  registry.production.internal/cbt-dashboard:<previous_version>
```

### 2. Database Rollback

```bash
# Restore from backup
psql -h db.production.internal -U cbt_user -d school_management < /backups/cbt/cbt_backup_20260428_020000.sql

# Verify restoration
psql -h db.production.internal -U cbt_user -d school_management -c "SELECT COUNT(*) FROM exams;"
```

### 3. Verify Rollback

```bash
# Check application status
curl -X GET https://api.scholarx.app/api/health

# Check database
psql -h db.production.internal -U cbt_user -d school_management -c "SELECT version();"

# Check logs
tail -f /var/log/cbt/app.log
```

---

## Troubleshooting

### Issue: Application Won't Start

**Symptoms**: Application crashes on startup

**Solution**:
```bash
# Check logs
tail -f /var/log/cbt/app.log

# Verify environment variables
env | grep DB_

# Verify database connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Check Node.js version
node --version

# Rebuild application
npm install
npm run build
```

### Issue: Database Connection Errors

**Symptoms**: "Connection refused" or "Connection timeout"

**Solution**:
```bash
# Verify database is running
systemctl status postgresql

# Check database credentials
psql -h db.production.internal -U cbt_user -d school_management

# Check firewall rules
sudo ufw status
sudo ufw allow 5432/tcp

# Check connection pooling
# Increase pool size in config/database.js
```

### Issue: High Memory Usage

**Symptoms**: Application consuming excessive memory

**Solution**:
```bash
# Check memory usage
ps aux | grep node

# Monitor memory over time
watch -n 1 'ps aux | grep node'

# Check for memory leaks
# Enable heap snapshots
node --inspect dist/main.js

# Restart application
pm2 restart cbt-dashboard

# Increase available memory
# Modify systemd service limits
```

### Issue: Slow API Responses

**Symptoms**: API endpoints responding slowly

**Solution**:
```bash
# Check database query performance
psql -h db.production.internal -U cbt_user -d school_management -c \
  "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM exams WHERE status = 'Ongoing';

# Add missing indexes
CREATE INDEX idx_exams_status_date ON exams(status, scheduled_date);

# Check application logs for errors
tail -f /var/log/cbt/app.log

# Monitor system resources
top
```

### Issue: WebSocket Connection Failures

**Symptoms**: Real-time monitoring not updating

**Solution**:
```bash
# Check WebSocket server
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://api.scholarx.app/ws/cbt/monitoring/test-exam

# Check firewall rules
sudo ufw allow 443/tcp

# Verify reverse proxy configuration
nginx -t

# Check application logs
tail -f /var/log/cbt/app.log | grep -i websocket
```

---

**Document Version**: 1.0.0  
**Last Updated**: April 28, 2026  
**Status**: Complete
