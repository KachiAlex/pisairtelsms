-- Create Classes Table and Seed Defaults
-- Created: 2026-05-11
-- Ensures classes table exists for CBT flows

-- =============================================================================
-- CLASSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  arm VARCHAR(50) NOT NULL,
  level VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_classes_tenant ON classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_deleted ON classes(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_tenant_name_arm ON classes(tenant_id, name, arm) WHERE deleted_at IS NULL;

-- =============================================================================
-- DEFAULT SEED DATA (optional, skips if already present)
-- =============================================================================
INSERT INTO classes (tenant_id, name, arm, level)
VALUES
  ('default-tenant-uuid', 'JSS 1', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 1', 'B', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 1', 'C', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 2', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'SS 1', 'Science A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 1', 'Arts A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 2', 'Science B', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 3', 'Commercial', 'Senior Secondary')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION METADATA
-- =============================================================================
INSERT INTO schema_migrations (version, description)
VALUES (7, 'Create classes table for CBT')
ON CONFLICT (version) DO NOTHING;
