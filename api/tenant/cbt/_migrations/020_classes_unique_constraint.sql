-- Academic Structure: add unique constraints on classes and subjects
-- Created: 2026-09-14
-- Prevents duplicate class+arm and subject code combinations within a tenant.
-- The application layer already checks for duplicates, but the DB constraint
-- is a backstop against race conditions and direct data entry.

-- First, remove any existing duplicate classes by keeping only the most recent one.
DELETE FROM classes
WHERE id NOT IN (
  SELECT DISTINCT ON (tenant_id, name, arm) id
  FROM classes
  WHERE deleted_at IS NULL
  ORDER BY tenant_id, name, arm, created_at DESC
)
AND deleted_at IS NULL;

-- Add the unique constraint on classes (only on non-deleted rows).
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_tenant_name_arm_unique
  ON classes (tenant_id, name, arm)
  WHERE deleted_at IS NULL;

-- Remove any existing duplicate subjects by keeping only the most recent one.
DELETE FROM subjects
WHERE id NOT IN (
  SELECT DISTINCT ON (tenant_id, code) id
  FROM subjects
  WHERE deleted_at IS NULL
  ORDER BY tenant_id, code, created_at DESC
)
AND deleted_at IS NULL;

-- Add the unique constraint on subjects (only on non-deleted rows).
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_tenant_code_unique
  ON subjects (tenant_id, code)
  WHERE deleted_at IS NULL;

INSERT INTO schema_migrations (version, description)
VALUES (20, 'Add unique constraints on classes (tenant_id, name, arm) and subjects (tenant_id, code)')
ON CONFLICT (version) DO NOTHING;

