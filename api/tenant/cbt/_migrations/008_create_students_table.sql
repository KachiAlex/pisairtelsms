-- Students Table Migration
-- Created: 2026-05-04
-- Ensures tenant-scoped unique constraint on (tenant_id, admission_no)

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  admission_no VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  class VARCHAR(50) NOT NULL,
  arm VARCHAR(10),
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Graduated')),
  guardian VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  date_of_birth DATE,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, admission_no)
);

-- If the table was previously created with a global unique on admission_no, fix it.
-- Drop the global unique constraint (name varies by PostgreSQL version)
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_admission_no_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_admission_no_unique;

-- Ensure tenant-scoped unique constraint exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_tenant_id_admission_no_key'
      AND conrelid = 'students'::regclass
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_tenant_id_admission_no UNIQUE (tenant_id, admission_no);
  END IF;
END $$;

-- Add guardian_email column if missing (added in later migration 011)
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(255);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_deleted ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_tenant_status ON students(tenant_id, status);

INSERT INTO schema_migrations (version, description)
VALUES (8, 'Create students table')
ON CONFLICT DO NOTHING;
