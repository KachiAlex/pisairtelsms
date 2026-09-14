-- Fix: Normalize default-tenant-uuid to default-tenant for academic departments
-- Created: 2026-09-14
-- The codebase uses 'default-tenant' as the fallback tenant ID, but migration 017
-- seeded departments under 'default-tenant-uuid'. This migration:
-- 1. Copies any 'default-tenant-uuid' departments to 'default-tenant' (if missing).
-- 2. Ensures both tenant IDs have the default departments for backward compat.

INSERT INTO academic_departments (tenant_id, name, description, head, status)
SELECT 'default-tenant', name, description, head, status
FROM academic_departments
WHERE tenant_id = 'default-tenant-uuid'
  AND deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM academic_departments ad
    WHERE ad.tenant_id = 'default-tenant' AND ad.name = academic_departments.name
  )
ON CONFLICT DO NOTHING;

-- Also ensure programs are seeded for default-tenant (no programs were seeded
-- in 017, but if any were created manually under default-tenant-uuid, copy them).
INSERT INTO academic_programs (tenant_id, name, level, description, status)
SELECT 'default-tenant', name, level, description, status
FROM academic_programs
WHERE tenant_id = 'default-tenant-uuid'
  AND deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM academic_programs ap
    WHERE ap.tenant_id = 'default-tenant' AND ap.name = academic_programs.name
  )
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (version, description)
VALUES (22, 'Normalize default-tenant-uuid to default-tenant for academic departments and programs')
ON CONFLICT (version) DO NOTHING;
