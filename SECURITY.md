# Security Features

## Authentication & Authorization

### JWT Role-Based Access Control
All API endpoints use `requireRole()` middleware for consistent JWT verification:
- **Staff APIs**: `/api/staff/*` - Requires `staff` role
- **Parent APIs**: `/api/parent/*` - Requires `parent` role with parent-child relationship verification
- **Student APIs**: `/api/student/*` - Requires `student` role
- **Tenant APIs**: `/api/tenant/*` - Requires `tenant` role

### Parent-Child Relationship Verification
Parent APIs enforce strict parent-child relationship checks:
- All parent requests validate the parent has access to the requested child
- Failed attempts are logged to `parent_child_violations` table
- Repeated failures (≥5 attempts) trigger webhook alerts

## Violation Logging & Cleanup

### Table Schema
```sql
CREATE TABLE parent_child_violations (
  parent_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  context TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_id, child_id, context)
);
```

### Alert Threshold
- **5 failed attempts** triggers a webhook alert (configurable via `VIOLATION_ALERT_THRESHOLD`)

### Automated Cleanup
- **Daily at 3:00 AM UTC** via Vercel Cron Jobs
- **30-day retention** by default (configurable via `VIOLATION_RETENTION_DAYS`)
- **Manual cleanup**: `npm run clean-violations` or `pnpm run clean-violations`

### Environment Variables
```bash
# Required for webhook alerts
PARENT_CHILD_VIOLATION_WEBHOOK=https://hooks.slack.com/services/...

# Optional - retention period (default: 30)
VIOLATION_RETENTION_DAYS=30

# Optional - cron authentication
CRON_SECRET=your-secret-key
```

### Per-Tenant Webhook Configuration

Each tenant can configure their own webhook URL for security violation alerts.

**Step 1: Add Column to Tenants Table**

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS security_webhook_url TEXT;
```

**Step 2: Set Tenant Webhook**

```sql
-- Set webhook for a specific tenant
UPDATE tenants 
SET security_webhook_url = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
WHERE id = 'tenant-uuid-here';
```

**Step 3: (Optional) Global Fallback**

If a tenant has no webhook configured, alerts fall back to the global webhook:

```bash
# Add to .env.local or Vercel env
PARENT_CHILD_VIOLATION_WEBHOOK=https://hooks.slack.com/services/FALLBACK/WEBHOOK/URL
```

**Supported Webhook Formats:**
- Slack: `https://hooks.slack.com/services/...`
- Discord: `https://discord.com/api/webhooks/...`
- Generic POST endpoints

Alert payload format:
```json
{
  "parentId": "...",
  "childId": "...",
  "context": "parent-messages",
  "attempts": 5,
  "tenantId": "tenant-uuid",
  "message": "Parent-child verification failed 5 times for ...",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Frontend Bundle Optimization

### Lazy Loading
- `BulkImportStudents` component lazy-loaded in StudentsList
- Reduces initial bundle size by ~150KB

### Chunk Splitting
Vite config includes manual chunking:
```js
manualChunks: {
  'students-list': ['./src/components/pages/StudentsList.tsx'],
  'vendor': ['react', 'react-dom', 'lucide-react']
}
```

### Monitoring
- **Chunk size limit**: 900KB
- **Check command**: `npm run check-chunks`
- **CI integration**: Run on every build

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

The CI pipeline automatically runs on every push and pull request:

```yaml
name: CI
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm run check-chunks  # Fails if chunks exceed 900KB
```

### CI Checks

- **Build**: Verifies production build succeeds
- **Chunk Size**: Fails if any chunk exceeds 900KB (excluding vendor/StudentsList)
- **Type Check**: Validates TypeScript types
- **Tests**: Runs test suite

## Security Layers

### 1. Rate Limiting
All authentication endpoints have rate limiting (10 requests/minute):
- Parent login: `/api/parent/auth/login`
- Staff login: `/api/staff/auth/login`
- Student login: `/api/student/auth/login`
- Tenant login: `/api/tenant/auth/login`
- Super admin login: `/api/super-admin/auth/login`

**Implementation**: `api/_lib/rate-limit.ts`

### 2. Security Headers
All responses include security headers:
- **Content-Security-Policy (CSP)**: Prevents XSS attacks
- **X-Frame-Options: DENY**: Prevents clickjacking
- **X-Content-Type-Options: nosniff**: Prevents MIME-sniffing
- **X-XSS-Protection**: Browser XSS filter
- **Strict-Transport-Security (HSTS)**: Forces HTTPS in production
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

**Implementation**: `api/_lib/security-headers.ts`

### 3. Input Validation
All user inputs are validated before processing:
- Email format validation
- Password minimum length (6-8 chars)
- Required field checks
- Pattern matching for phone numbers
- Custom validation rules

**Implementation**: `api/_lib/validator.ts`

### 4. CSRF Protection
CSRF tokens required for state-changing requests:
- Tokens stored server-side (1-hour expiry)
- Single-use tokens (consumed after verification)
- Exempt methods: GET, HEAD, OPTIONS

**Implementation**: `api/_lib/csrf.ts`

### 5. Secure Error Handling
Errors don't leak sensitive information:
- Stack traces only in development
- Error IDs for tracking without exposing details
- Generic error messages to clients
- Full logging server-side

**Implementation**: `api/_lib/error-handler.ts`

### 6. SQL Injection Prevention
All database queries use parameterized statements:
- `@vercel/postgres` sql template literals
- Automatic parameter escaping
- No string concatenation in queries

### 7. Secure Cookies
Authentication cookies are secure:
- `HttpOnly`: Prevents JavaScript access
- `Secure`: HTTPS only in production
- `SameSite=Strict`: CSRF protection
- `Max-Age`: 24-hour expiration

### 8. Dependency Security
CI pipeline includes security auditing:
- `pnpm audit` runs on every build
- Flags high-severity vulnerabilities
- Updated via `.github/workflows/ci.yml`

## Secrets Management

### Environment Variables

| Variable | Purpose | Rotation Frequency |
|----------|---------|-------------------|
| `JWT_SECRET` | Token signing | Every 90 days |
| `PARENT_CHILD_VIOLATION_WEBHOOK` | Alert notifications | If compromised |
| `CRON_SECRET` | Cron authentication | Every 90 days |
| `DATABASE_URL` | Database connection | If compromised |

### Rotation Procedure

1. **Generate new secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Add to Vercel**:
   ```bash
   vercel env add JWT_SECRET production
   ```

3. **Deploy** to apply new secret

4. **Remove old secret** after verifying new one works

5. **Update** any external services using the old secret

## Security Checklist

- [x] Rate limiting on all auth endpoints
- [x] Security headers on all responses
- [x] Input validation on all user inputs
- [x] CSRF protection for state-changing requests
- [x] Secure error handling (no stack traces in production)
- [x] SQL injection prevention (parameterized queries)
- [x] Secure cookies (HttpOnly, Secure, SameSite)
- [x] Dependency auditing in CI
- [ ] Set `PARENT_CHILD_VIOLATION_WEBHOOK` for alerts
- [ ] Set `CRON_SECRET` for cron authentication
- [ ] Rotate `JWT_SECRET` every 90 days
- [ ] Review `parent_child_violations` table monthly
- [ ] Run penetration testing annually
