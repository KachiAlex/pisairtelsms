# CBT Dashboard Database Migrations

This directory contains all database migrations for the CBT (Computer-Based Testing) Dashboard functionality.

## Overview

The CBT Dashboard uses PostgreSQL for data persistence with the following 8 tables:

1. **questions_bank** - Stores all exam questions
2. **exams** - Stores exam configurations and metadata
3. **exam_questions** - Junction table linking exams to questions
4. **student_exam_progress** - Tracks real-time student progress during exams
5. **exam_results** - Stores final exam results and scores
6. **student_answers** - Stores detailed answer data for each student
7. **security_settings** - Stores security configuration per exam
8. **proctoring_logs** - Logs all proctoring events

## Migration Files

### 001_create_cbt_tables.sql

Creates all 8 tables with:
- Proper data types and constraints
- Foreign key relationships
- Check constraints for data validation
- Indexes for performance optimization
- Soft delete support (deleted_at column)

## Running Migrations

### Automatic Migration (Recommended)

Call the initialization endpoint:

```bash
curl -X POST http://localhost:3000/api/tenant/cbt/init-db \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Manual Migration

Use the migration runner in your application:

```typescript
import { Pool } from 'pg';
import { runMigrations, verifySchema } from './migrations/migrate';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'school_management',
  user: 'postgres',
  password: 'postgres',
});

// Run migrations
const results = await runMigrations(pool);

// Verify schema
const isValid = await verifySchema(pool);

await pool.end();
```

### Direct SQL Execution

Execute the SQL file directly:

```bash
psql -h localhost -U postgres -d school_management -f 001_create_cbt_tables.sql
```

## Database Schema

### questions_bank

Stores all exam questions with support for multiple question types.

```sql
CREATE TABLE questions_bank (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  text TEXT NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'objective', 'truefalse', 'essay'
  options JSONB, -- Array of options for objective/truefalse
  correct_answer VARCHAR(255),
  difficulty VARCHAR(10) NOT NULL, -- 'Easy', 'Medium', 'Hard'
  subject VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Indexes:**
- `idx_questions_tenant` - For filtering by tenant
- `idx_questions_subject` - For subject-based filtering
- `idx_questions_difficulty` - For difficulty filtering
- `idx_questions_type` - For question type filtering
- `idx_questions_deleted` - For soft delete queries

### exams

Stores exam configurations with status tracking.

```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class VARCHAR(50) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- 15-480 minutes
  pass_mark DECIMAL(5,2) NOT NULL, -- 0-100
  total_marks DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Scheduled', 'Ongoing', 'Completed'
  scheduled_date DATE,
  scheduled_time TIME,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Constraints:**
- Duration: 15-480 minutes
- Pass mark: 0-100
- Total marks > pass mark

**Indexes:**
- `idx_exams_tenant` - For tenant filtering
- `idx_exams_status` - For status filtering
- `idx_exams_scheduled_date` - For date-based queries
- `idx_exams_class` - For class filtering

### exam_questions

Junction table linking exams to questions with ordering and marks allocation.

```sql
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, question_id)
);
```

### student_exam_progress

Tracks real-time student progress during exams.

```sql
CREATE TABLE student_exam_progress (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Completed', 'Paused', 'Flagged'
  time_remaining INTEGER, -- in seconds
  last_activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flag_reason VARCHAR(255),
  flagged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);
```

### exam_results

Stores final exam results and scores.

```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'Passed', 'Failed'
  time_spent INTEGER NOT NULL, -- in seconds
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);
```

### student_answers

Stores detailed answer data for each student.

```sql
CREATE TABLE student_answers (
  id UUID PRIMARY KEY,
  result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id) ON DELETE CASCADE,
  student_answer TEXT,
  correct_answer VARCHAR(255),
  is_correct BOOLEAN NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### security_settings

Stores security configuration per exam.

```sql
CREATE TABLE security_settings (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL UNIQUE REFERENCES exams(id) ON DELETE CASCADE,
  enable_proctoring BOOLEAN DEFAULT false,
  disable_copy_paste BOOLEAN DEFAULT false,
  disable_right_click BOOLEAN DEFAULT false,
  require_camera BOOLEAN DEFAULT false,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_options BOOLEAN DEFAULT false,
  allowed_ips JSONB DEFAULT '[]'::jsonb,
  exam_password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### proctoring_logs

Logs all proctoring events.

```sql
CREATE TABLE proctoring_logs (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

Configure the following environment variables for database connection:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_management
DB_USER=postgres
DB_PASSWORD=postgres
```

## Testing

### Property-Based Tests

The migration includes property-based tests to verify schema integrity:

```typescript
import { testQuestionAdditionRoundTrip, testDatabaseConstraints, testIndexesExist } from './schema.test';

// Run tests
await testQuestionAdditionRoundTrip(pool);
await testDatabaseConstraints(pool);
await testIndexesExist(pool);
```

**Property 1: Question Addition Round-Trip**
- Verifies questions persist with identical data
- Tests objective, true/false, and essay questions
- Validates all fields are preserved

**Constraint Tests**
- Invalid question types are rejected
- Invalid difficulty levels are rejected
- Exam duration constraints are enforced
- Pass mark constraints are enforced

**Index Tests**
- Verifies all required indexes exist
- Ensures performance optimization

## Troubleshooting

### Migration Already Executed

If a migration has already been executed, it will be skipped automatically. The migration runner maintains a `migrations` table to track executed migrations.

### Schema Verification Failed

If schema verification fails:

1. Check that all tables were created: `\dt` in psql
2. Verify indexes exist: `\di` in psql
3. Check for constraint violations: `SELECT * FROM information_schema.table_constraints`

### Connection Issues

If you cannot connect to the database:

1. Verify PostgreSQL is running
2. Check connection parameters in environment variables
3. Verify user has necessary permissions
4. Check firewall rules

## Rollback

To rollback the last migration (development only):

```typescript
import { rollbackLastMigration } from './migrate';

await rollbackLastMigration(pool);
```

## Performance Considerations

- All foreign key columns are indexed
- Status columns are indexed for filtering
- Tenant ID is indexed for multi-tenant queries
- Timestamps are indexed for range queries
- Soft delete queries use `deleted_at IS NULL` with index

## Data Retention

- Questions use soft delete (deleted_at column)
- Exams use soft delete for audit trail
- Results and answers are permanently stored
- Proctoring logs are permanently stored for compliance

## Next Steps

After running migrations:

1. Verify schema with `verifySchema(pool)`
2. Run property-based tests
3. Implement API endpoints (Phase 2)
4. Create frontend components (Phase 7)
