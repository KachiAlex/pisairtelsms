-- Update subjects table to support non-UUID tenant identifiers
-- and ensure per-tenant code uniqueness

-- Ensure schema_migrations table exists
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

-- Allow tenant_id and created_by to store non-UUID identifiers
ALTER TABLE subjects
  ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text,
  ALTER COLUMN created_by TYPE TEXT USING created_by::text;

-- Replace previous code index with a per-tenant unique constraint
DROP INDEX IF EXISTS idx_subjects_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_code_tenant ON subjects(tenant_id, code);

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES (5, 'Update subjects table to allow text tenant IDs and add unique index')
ON CONFLICT (version) DO NOTHING;
