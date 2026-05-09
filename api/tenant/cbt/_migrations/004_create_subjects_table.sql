-- Subjects Table Migration
-- Created: 2026-05-06
-- Supports multi-level subjects

-- ============================================================================
-- SUBJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Core', 'Elective')),
  department VARCHAR(100) NOT NULL,
  description TEXT,
  version VARCHAR(20),
  resources_status VARCHAR(20) DEFAULT 'Pending' CHECK (resources_status IN ('Complete', 'Review', 'Upload', 'Pending')),
  owner VARCHAR(255),
  audit_date DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subjects_tenant ON subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department);
CREATE INDEX IF NOT EXISTS idx_subjects_deleted ON subjects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'schema_migrations') THEN
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;

INSERT INTO schema_migrations (version, description) 
VALUES (4, 'Create subjects table with multi-level support')
ON CONFLICT (version) DO NOTHING;
