# CBT Dashboard Configuration Guide

**Version**: 1.0.0  
**Last Updated**: April 28, 2026

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Database Configuration](#database-configuration)
3. [Security Configuration](#security-configuration)
4. [Performance Tuning](#performance-tuning)
5. [Feature Flags](#feature-flags)
6. [Logging Configuration](#logging-configuration)
7. [Monitoring Configuration](#monitoring-configuration)
8. [Advanced Configuration](#advanced-configuration)

---

## Environment Configuration

### Development Environment

```bash
# .env.development
NODE_ENV=development
APP_URL=http://localhost:3000
APP_PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_management_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Authentication
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRY=86400

# Security
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=1000

# WebSocket
WS_URL=ws://localhost:3000/ws
WS_HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text

# Features
ENABLE_PROCTORING=true
ENABLE_REAL_TIME_SYNC=true
ENABLE_POLLING_FALLBACK=true
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
APP_URL=https://staging-api.scholarx.app
APP_PORT=3000

# Database
DB_HOST=db.staging.internal
DB_PORT=5432
DB_NAME=school_management_staging
DB_USER=cbt_user
DB_PASSWORD=<secure_password>

# Authentication
JWT_SECRET=<secure_jwt_secret>
JWT_EXPIRY=86400

# Security
CORS_ORIGIN=https://staging.scholarx.app
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=500

# WebSocket
WS_URL=wss://staging-api.scholarx.app/ws
WS_HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Features
ENABLE_PROCTORING=true
ENABLE_REAL_TIME_SYNC=true
ENABLE_POLLING_FALLBACK=true
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
APP_URL=https://api.scholarx.app
APP_PORT=3000

# Database
DB_HOST=db.production.internal
DB_PORT=5432
DB_NAME=school_management
DB_USER=cbt_user
DB_PASSWORD=<secure_password>

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
LOG_LEVEL=warn
LOG_FORMAT=json

# Features
ENABLE_PROCTORING=true
ENABLE_REAL_TIME_SYNC=true
ENABLE_POLLING_FALLBACK=true
```

---

## Database Configuration

### Connection Pool Configuration

```javascript
// config/database.js
const { Pool } = require('pg')

const pool = new Pool({
  // Connection settings
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool settings
  max: process.env.DB_POOL_MAX || 20,           // Maximum connections
  min: process.env.DB_POOL_MIN || 5,            // Minimum connections
  idleTimeoutMillis: 30000,                      // Idle timeout (30 seconds)
  connectionTimeoutMillis: 2000,                 // Connection timeout (2 seconds)
  maxUses: 7500,                                 // Max uses per connection

  // SSL settings
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,

  // Application name
  application_name: 'cbt-dashboard'
})

module.exports = pool
```

### Connection Pool Tuning

```javascript
// For different workload types

// Light workload (< 100 concurrent users)
{
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000
}

// Medium workload (100-500 concurrent users)
{
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000
}

// Heavy workload (> 500 concurrent users)
{
  max: 50,
  min: 10,
  idleTimeoutMillis: 30000
}
```

### Query Timeout Configuration

```javascript
// config/query-timeout.js
const QUERY_TIMEOUTS = {
  // Short queries (< 1 second)
  questions: 1000,
  exams: 1000,
  security: 1000,

  // Medium queries (1-5 seconds)
  results: 5000,
  monitoring: 5000,

  // Long queries (> 5 seconds)
  export: 30000,
  import: 30000,
  analytics: 30000
}

module.exports = QUERY_TIMEOUTS
```

---

## Security Configuration

### JWT Configuration

```javascript
// config/jwt.js
const jwt = require('jsonwebtoken')

const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRY || 86400,  // 24 hours
  algorithm: 'HS256',
  issuer: 'cbt-dashboard',
  audience: 'cbt-users'
}

// Generate token
function generateToken(payload) {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
    algorithm: JWT_CONFIG.algorithm,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  })
}

// Verify token
function verifyToken(token) {
  return jwt.verify(token, JWT_CONFIG.secret, {
    algorithms: [JWT_CONFIG.algorithm],
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  })
}

module.exports = { JWT_CONFIG, generateToken, verifyToken }
```

### CORS Configuration

```javascript
// config/cors.js
const CORS_CONFIG = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400  // 24 hours
}

module.exports = CORS_CONFIG
```

### Rate Limiting Configuration

```javascript
// config/rate-limit.js
const RATE_LIMIT_CONFIG = {
  // Default rate limit
  default: {
    windowMs: 60000,        // 1 minute
    max: 100,               // 100 requests per minute
    message: 'Too many requests, please try again later'
  },

  // Specific endpoints
  endpoints: {
    '/api/tenant/cbt/questions/import': {
      windowMs: 60000,
      max: 10
    },
    '/api/tenant/cbt/questions/export': {
      windowMs: 60000,
      max: 10
    },
    '/api/tenant/cbt/results/export': {
      windowMs: 60000,
      max: 10
    },
    '/api/tenant/cbt/auth/login': {
      windowMs: 900000,      // 15 minutes
      max: 5
    }
  }
}

module.exports = RATE_LIMIT_CONFIG
```

### Password Policy

```javascript
// config/password-policy.js
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  expiryDays: 90,
  historyCount: 5  // Remember last 5 passwords
}

function validatePassword(password) {
  const errors = []

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`)
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (PASSWORD_POLICY.requireSpecialChars && !new RegExp(`[${PASSWORD_POLICY.specialChars}]`).test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

module.exports = { PASSWORD_POLICY, validatePassword }
```

### IP Whitelist Configuration

```javascript
// config/ip-whitelist.js
const IP_WHITELIST_CONFIG = {
  enabled: process.env.ENABLE_IP_WHITELIST === 'true',
  allowedIPs: process.env.ALLOWED_IPS?.split(',') || [
    '127.0.0.1',
    '::1',
    '192.168.1.0/24'
  ],
  blockUnknownIPs: false,
  logUnknownIPs: true
}

function isIPAllowed(ip) {
  if (!IP_WHITELIST_CONFIG.enabled) return true

  const ipaddr = require('ipaddr.js')
  const addr = ipaddr.process(ip)

  return IP_WHITELIST_CONFIG.allowedIPs.some(allowed => {
    if (allowed.includes('/')) {
      // CIDR notation
      const [network, prefix] = allowed.split('/')
      return addr.match(ipaddr.process(network), parseInt(prefix))
    } else {
      // Exact match
      return addr.toString() === allowed
    }
  })
}

module.exports = { IP_WHITELIST_CONFIG, isIPAllowed }
```

---

## Performance Tuning

### Query Optimization

```javascript
// config/query-optimization.js
const QUERY_OPTIMIZATION = {
  // Enable query caching
  caching: {
    enabled: true,
    ttl: 300,  // 5 minutes
    maxSize: 1000  // Max cached queries
  },

  // Connection pooling
  pooling: {
    enabled: true,
    maxConnections: 20,
    minConnections: 5
  },

  // Query batching
  batching: {
    enabled: true,
    batchSize: 100,
    batchTimeout: 1000
  },

  // Index hints
  indexHints: {
    questions: 'idx_questions_tenant',
    exams: 'idx_exams_status',
    results: 'idx_results_exam'
  }
}

module.exports = QUERY_OPTIMIZATION
```

### Caching Configuration

```javascript
// config/cache.js
const CACHE_CONFIG = {
  // Redis cache
  redis: {
    enabled: process.env.ENABLE_REDIS === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    ttl: 300  // 5 minutes
  },

  // In-memory cache
  memory: {
    enabled: true,
    maxSize: 1000,
    ttl: 300
  },

  // Cache keys
  keys: {
    questions: 'cbt:questions:*',
    exams: 'cbt:exams:*',
    results: 'cbt:results:*',
    monitoring: 'cbt:monitoring:*'
  }
}

module.exports = CACHE_CONFIG
```

### Compression Configuration

```javascript
// config/compression.js
const COMPRESSION_CONFIG = {
  enabled: true,
  level: 6,  // 1-9, higher = better compression but slower
  threshold: 1024,  // Only compress responses > 1KB
  types: [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'application/javascript'
  ]
}

module.exports = COMPRESSION_CONFIG
```

### WebSocket Configuration

```javascript
// config/websocket.js
const WEBSOCKET_CONFIG = {
  // Connection settings
  pingInterval: 30000,  // 30 seconds
  pingTimeout: 5000,    // 5 seconds
  maxPayload: 1024 * 1024,  // 1MB

  // Reconnection settings
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,

  // Polling fallback
  pollingFallback: {
    enabled: process.env.ENABLE_POLLING_FALLBACK === 'true',
    interval: 3000,  // 3 seconds
    maxAttempts: 10
  }
}

module.exports = WEBSOCKET_CONFIG
```

---

## Feature Flags

### Feature Configuration

```javascript
// config/features.js
const FEATURE_FLAGS = {
  // Proctoring features
  proctoring: {
    enabled: process.env.ENABLE_PROCTORING === 'true',
    cameraRequired: true,
    recordingEnabled: true,
    tabSwitchDetection: true,
    copyPasteDetection: true
  },

  // Real-time features
  realTime: {
    enabled: process.env.ENABLE_REAL_TIME_SYNC === 'true',
    websocket: true,
    pollingFallback: process.env.ENABLE_POLLING_FALLBACK === 'true',
    updateInterval: 1000  // 1 second
  },

  // Question randomization
  randomization: {
    enabled: true,
    questionOrder: true,
    answerOptions: true
  },

  // Analytics
  analytics: {
    enabled: true,
    detailedReports: true,
    exportFormats: ['csv', 'pdf']
  },

  // Security
  security: {
    ipWhitelist: process.env.ENABLE_IP_WHITELIST === 'true',
    passwordProtection: true,
    sessionTimeout: 3600  // 1 hour
  }
}

function isFeatureEnabled(feature) {
  const parts = feature.split('.')
  let current = FEATURE_FLAGS

  for (const part of parts) {
    if (!current[part]) return false
    current = current[part]
  }

  return current.enabled !== false
}

module.exports = { FEATURE_FLAGS, isFeatureEnabled }
```

---

## Logging Configuration

### Logger Configuration

```javascript
// config/logger.js
const winston = require('winston')

const LOGGER_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'json',
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // File transport
    new winston.transports.File({
      filename: '/var/log/cbt/error.log',
      level: 'error',
      format: winston.format.json()
    }),

    // Combined log file
    new winston.transports.File({
      filename: '/var/log/cbt/app.log',
      format: winston.format.json()
    })
  ]
}

const logger = winston.createLogger(LOGGER_CONFIG)

module.exports = logger
```

### Log Levels

```
error   - Error messages (level 0)
warn    - Warning messages (level 1)
info    - Informational messages (level 2)
http    - HTTP request logs (level 3)
debug   - Debug messages (level 4)
```

### Log Format

```json
{
  "timestamp": "2026-04-28T10:30:00Z",
  "level": "info",
  "message": "Question created successfully",
  "userId": "user-123",
  "tenantId": "tenant-456",
  "questionId": "q-789",
  "duration": 125,
  "requestId": "req-abc123"
}
```

---

## Monitoring Configuration

### Sentry Configuration

```javascript
// config/sentry.js
const Sentry = require('@sentry/node')

const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ request: true, serverName: true })
  ]
}

Sentry.init(SENTRY_CONFIG)

module.exports = Sentry
```

### Datadog Configuration

```javascript
// config/datadog.js
const StatsD = require('node-statsd').StatsD

const DATADOG_CONFIG = {
  host: process.env.DATADOG_HOST || 'localhost',
  port: process.env.DATADOG_PORT || 8125,
  prefix: 'cbt.',
  tags: [
    `env:${process.env.NODE_ENV}`,
    `service:cbt-dashboard`,
    `version:1.0.0`
  ]
}

const statsd = new StatsD(DATADOG_CONFIG)

module.exports = statsd
```

### Metrics Configuration

```javascript
// config/metrics.js
const METRICS = {
  // API metrics
  api: {
    requestCount: 'api.requests.count',
    requestDuration: 'api.requests.duration',
    errorCount: 'api.errors.count',
    statusCodes: 'api.status_codes'
  },

  // Database metrics
  database: {
    queryCount: 'db.queries.count',
    queryDuration: 'db.queries.duration',
    connectionPoolSize: 'db.pool.size',
    connectionPoolWaiting: 'db.pool.waiting'
  },

  // WebSocket metrics
  websocket: {
    connectionCount: 'ws.connections.count',
    messageCount: 'ws.messages.count',
    errorCount: 'ws.errors.count'
  },

  // Business metrics
  business: {
    questionsCreated: 'business.questions.created',
    examsCreated: 'business.exams.created',
    examsCompleted: 'business.exams.completed',
    studentsActive: 'business.students.active'
  }
}

module.exports = METRICS
```

---

## Advanced Configuration

### Multi-Tenancy Configuration

```javascript
// config/multi-tenancy.js
const MULTI_TENANCY_CONFIG = {
  enabled: true,
  isolation: 'database',  // 'database' or 'schema'
  defaultTenant: 'default',
  tenantHeader: 'X-Tenant-ID',
  cacheTenantConfig: true,
  cacheTTL: 3600
}

module.exports = MULTI_TENANCY_CONFIG
```

### Backup Configuration

```javascript
// config/backup.js
const BACKUP_CONFIG = {
  enabled: true,
  schedule: '0 2 * * *',  // Daily at 2 AM
  retention: 30,  // Keep 30 days of backups
  destination: '/backups/cbt',
  compression: 'gzip',
  encryption: {
    enabled: true,
    algorithm: 'aes-256-cbc',
    keyFile: '/etc/cbt/backup.key'
  }
}

module.exports = BACKUP_CONFIG
```

### Audit Logging Configuration

```javascript
// config/audit-logging.js
const AUDIT_LOGGING_CONFIG = {
  enabled: true,
  logLevel: 'info',
  events: [
    'question.created',
    'question.updated',
    'question.deleted',
    'exam.created',
    'exam.updated',
    'exam.deleted',
    'exam.started',
    'exam.completed',
    'security.settings.updated',
    'user.login',
    'user.logout'
  ],
  storage: {
    type: 'database',
    table: 'audit_logs',
    retention: 365  // 1 year
  }
}

module.exports = AUDIT_LOGGING_CONFIG
```

---

**Document Version**: 1.0.0  
**Last Updated**: April 28, 2026  
**Status**: Complete
