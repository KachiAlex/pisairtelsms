-- Fix subjects table column types
-- The original migration created tenant_id and created_by as UUID types
-- but the application passes string values. This migration alters those columns
-- to VARCHAR so any string value is accepted.

-- Alter tenant_id from UUID to VARCHAR if it's currently UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE subjects ALTER COLUMN tenant_id TYPE VARCHAR(255) USING tenant_id::text;
    ALTER TABLE subjects ALTER COLUMN tenant_id SET DEFAULT 'default-tenant-uuid';
  END IF;
END $$;

-- Alter created_by from UUID to VARCHAR if it's currently UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects'
      AND column_name = 'created_by'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE subjects ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::text;
  END IF;
END $$;

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES (6, 'Alter subjects table to fix UUID column types to VARCHAR')
ON CONFLICT (version) DO NOTHING;
