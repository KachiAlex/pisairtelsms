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
  ('default-tenant-uuid', 'ENG', 'English Language', '["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"]'::jsonb, 'Core', 'Languages', 'system-user'),
  ('default-tenant-uuid', 'MAT', 'Mathematics', '["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'SCI', 'Integrated Science', '["JSS 1", "JSS 2", "JSS 3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'BIO', 'Biology', '["SS 1", "SS 2", "SS 3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'CHM', 'Chemistry', '["SS 1", "SS 2", "SS 3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'PHY', 'Physics', '["SS 1", "SS 2", "SS 3"]'::jsonb, 'Core', 'Sciences', 'system-user'),
  ('default-tenant-uuid', 'HIS', 'History', '["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"]'::jsonb, 'Core', 'Social Studies', 'system-user'),
  ('default-tenant-uuid', 'GEO', 'Geography', '["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"]'::jsonb, 'Core', 'Social Studies', 'system-user'),
  ('default-tenant-uuid', 'CIV', 'Civic Education', '["JSS 1", "JSS 2", "JSS 3"]'::jsonb, 'Core', 'Social Studies', 'system-user'),
  ('default-tenant-uuid', 'ECO', 'Economics', '["SS 1", "SS 2", "SS 3"]'::jsonb, 'Elective', 'Social Studies', 'system-user')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED CLASSES
-- ============================================================================
INSERT INTO classes (tenant_id, name, arm, level)
VALUES 
  ('default-tenant-uuid', 'JSS 1', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 1', 'B', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 2', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 2', 'B', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 3', 'A', 'Junior Secondary'),
  ('default-tenant-uuid', 'JSS 3', 'B', 'Junior Secondary'),
  ('default-tenant-uuid', 'SS 1', 'A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 1', 'B', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 2', 'A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 2', 'B', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 3', 'A', 'Senior Secondary'),
  ('default-tenant-uuid', 'SS 3', 'B', 'Senior Secondary')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
INSERT INTO schema_migrations (version, description) 
VALUES (5, 'Seed subjects and classes with default tenant')
ON CONFLICT (version) DO NOTHING;
