-- 011_schema_consolidation.sql
-- Consolidates the request-time ALTER TABLE statements scattered across API
-- handlers into one canonical, idempotent migration. Also adds the columns
-- introduced by the staff-portal sync work (sender_id / admin_read_at on
-- staff_messages, leave_policies table).

-- ── Staff domain ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS staff
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  ADD COLUMN IF NOT EXISTS staff_id TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS salary NUMERIC,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_recipient_code VARCHAR(255);

ALTER TABLE IF EXISTS staff_leave
  ADD COLUMN IF NOT EXISTS staff_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS staff_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  ADD COLUMN IF NOT EXISTS leave_type TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS days NUMERIC,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE IF EXISTS staff_attendance
  ADD COLUMN IF NOT EXISTS staff_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS staff_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS check_in TEXT,
  ADD COLUMN IF NOT EXISTS check_out TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE IF EXISTS staff_payroll
  ADD COLUMN IF NOT EXISTS staff_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS staff_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  ADD COLUMN IF NOT EXISTS month TEXT,
  ADD COLUMN IF NOT EXISTS year NUMERIC,
  ADD COLUMN IF NOT EXISTS basic_salary NUMERIC,
  ADD COLUMN IF NOT EXISTS allowances NUMERIC,
  ADD COLUMN IF NOT EXISTS deductions NUMERIC,
  ADD COLUMN IF NOT EXISTS net_salary NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE IF EXISTS staff_tasks ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE IF EXISTS staff_documents ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE IF EXISTS staff_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE IF EXISTS staff_messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE IF EXISTS staff_messages ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_attendance_unique ON staff_attendance(tenant_id, staff_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_payroll_unique ON staff_payroll(staff_id, month, year);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_tenant_id ON staff_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_tenant_id ON staff_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_tenant_id ON staff_messages(tenant_id);

-- ── Leave policies (tenant-configured allowances) ───────────────────────────
CREATE TABLE IF NOT EXISTS leave_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  leave_type TEXT NOT NULL,
  annual_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_policies_tenant_type ON leave_policies(tenant_id, leave_type);

-- ── Messaging ───────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS student_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS student_messages ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE IF EXISTS student_message_replies ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE IF EXISTS parent_notifications ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';

-- ── Virtual learning ────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS virtual_classrooms ADD COLUMN IF NOT EXISTS class_level TEXT;
ALTER TABLE IF EXISTS virtual_classrooms ADD COLUMN IF NOT EXISTS co_teacher_id TEXT;
ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homework';

-- ── Results / CA ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS ca_config
  ADD COLUMN IF NOT EXISTS draft_config JSONB,
  ADD COLUMN IF NOT EXISTS published_config JSONB,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS student_scores
  ADD COLUMN IF NOT EXISTS assignments_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_max NUMERIC,
  ADD COLUMN IF NOT EXISTS tests_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tests_max NUMERIC,
  ADD COLUMN IF NOT EXISTS projects_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_max NUMERIC,
  ADD COLUMN IF NOT EXISTS exams_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exams_max NUMERIC,
  ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS submitted_by TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;

-- ── Tenant settings ─────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS tenant_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE IF EXISTS exemptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
