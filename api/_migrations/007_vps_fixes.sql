-- Fix promotion and payroll tables for VPS deployment
BEGIN;

-- Recreate promotion_rules with the schema the frontend and promotion rules API expect
DROP TABLE IF EXISTS promotion_rules;
CREATE TABLE IF NOT EXISTS promotion_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  action TEXT NOT NULL DEFAULT 'promote',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  from_class TEXT,
  to_class TEXT,
  action TEXT,
  academic_session TEXT,
  term TEXT,
  average_score NUMERIC,
  attendance NUMERIC,
  teacher_recommendation TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add month column to payroll run items for compliance reporting
ALTER TABLE payroll_run_items
  ADD COLUMN IF NOT EXISTS month VARCHAR(20);

COMMIT;
