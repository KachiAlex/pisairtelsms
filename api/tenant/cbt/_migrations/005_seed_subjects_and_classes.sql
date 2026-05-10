-- Seed Subjects and Classes
-- Created: 2026-05-10
-- Adds default subjects and classes for testing

-- ============================================================================
-- CLASSES TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant-uuid',
  name VARCHAR(100) NOT NULL,
  arm VARCHAR(50),
  level VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_classes_tenant ON classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_deleted ON classes(deleted_at);

-- ============================================================================
-- SEED SUBJECTS
-- ============================================================================
INSERT INTO subjects (tenant_id, code, name, levels, type, department, created_by)
VALUES 
  ('default-tenant-uuid', 'ENG', 'English Language', '["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]'::jsonb, 'Core', 'Languages', 'system-user'),
  ('default-tenant-uuid', 'MAT', 'Mathematics', '["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'SCI', 'Integrated Science', '["JSS1", "JSS2", "JSS3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'BIO', 'Biology', '["SS1", "SS2", "SS3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'CHM', 'Chemistry', '["SS1", "SS2", "SS3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'PHY', 'Physics', '["SS1", "SS2", "SS3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'HIS', 'History', '["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]'::jsonb, 'Core', 'Social Studies', 'system-user'),
  ('default-tenant-uuid', 'GEO', 'Geography', '["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]'::jsonb, 'Core', 'Social Studies', 'system-user'),
  ('default-tenant-uuid', 'CIV', 'Civic Education', '["JSS1", "JSS2", "JSS3"]'::jsonb, 'Core', 'Social Studies', 'system-user'),
  ('default-tenant-uuid', 'ECO', 'Economics', '["SS1", "SS2", "SS3"]'::jsonb, 'Elective', 'Social Studies', 'system-user')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED CLASSES
-- ============================================================================
INSERT INTO classes (tenant_id, name, arm, level)
VALUES 
  ('default-tenant-uuid', 'JSS1', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS1', 'B', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS2', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS2', 'B', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS3', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS3', 'B', 'Junior Secondary'),
  ('default-tenant-uuid', 'SS1', 'A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS1', 'B', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS2', 'A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS2', 'B', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS3', 'A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS3', 'B', 'Senior Secondary')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
INSERT INTO schema_migrations (version, description) 
VALUES (5, 'Seed subjects and classes with default tenant')
ON CONFLICT (version) DO NOTHING;
