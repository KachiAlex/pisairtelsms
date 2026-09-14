-- Academic Departments & Programs
-- Created: 2026-09-13
-- First-class academic structure entities: departments (used by subjects) and
-- programs (academic programmes/levels such as "Junior Secondary").

-- =============================================================================
-- ACADEMIC DEPARTMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS academic_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  head TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_academic_departments_tenant ON academic_departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_departments_status ON academic_departments(status);

-- =============================================================================
-- ACADEMIC PROGRAMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS academic_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(100),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_academic_programs_tenant ON academic_programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_programs_status ON academic_programs(status);

-- =============================================================================
-- SEED DEFAULT DEPARTMENTS (idempotent)
-- Uses 'default-tenant' to match the fallback used across the codebase
-- (decoded.tenantId || 'default-tenant').
-- =============================================================================
INSERT INTO academic_departments (tenant_id, name, description)
VALUES
  ('default-tenant', 'Sciences', 'Science department'),
  ('default-tenant', 'Humanities', 'Humanities department'),
  ('default-tenant', 'Commercial', 'Commercial department'),
  ('default-tenant', 'Languages', 'Languages department')
ON CONFLICT DO NOTHING;

-- Also seed for the legacy 'default-tenant-uuid' if it exists in staff,
-- so tenants created before the fallback was standardized still see defaults.
INSERT INTO academic_departments (tenant_id, name, description)
SELECT s.tenant_id, d.name, d.description
FROM (VALUES
  ('Sciences', 'Science department'),
  ('Humanities', 'Humanities department'),
  ('Commercial', 'Commercial department'),
  ('Languages', 'Languages department')
) AS d(name, description)
CROSS JOIN (SELECT DISTINCT tenant_id FROM staff WHERE tenant_id = 'default-tenant-uuid') s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_departments ad
  WHERE ad.tenant_id = s.tenant_id AND ad.name = d.name
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION METADATA
-- =============================================================================
INSERT INTO schema_migrations (version, description)
VALUES (17, 'Create academic departments and programs tables')
ON CONFLICT (version) DO NOTHING;
