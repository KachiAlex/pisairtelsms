-- Migration 008: Per-school URL identity engine.
-- Enables unique application & inquiry URLs per school via wildcard
-- subdomains (lincolnhigh.pisairtelsms.com), custom domains, and short
-- "/join" codes, all resolved from the Host header at the edge.

-- Central alias registry: maps a public URL/handle to a tenant.
-- kind:
--   'subdomain'     -> lincolnhigh.<root-domain> (primary school identity)
--   'custom_domain' -> school-owned domain (premium / white-label)
--   'short_code'    -> printable / QR link handle (scholarx.io/join/<code>)
CREATE TABLE IF NOT EXISTS tenant_aliases (
  id          TEXT PRIMARY KEY,
  alias       TEXT NOT NULL UNIQUE,
  tenant_id   TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'subdomain' CHECK (kind IN ('subdomain', 'custom_domain', 'short_code')),
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_aliases_tenant_id ON tenant_aliases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_aliases_kind_status ON tenant_aliases(kind, status);

-- Backfill the primary subdomain alias for every existing tenant so current
-- deployments get per-school URLs with zero manual setup.
INSERT INTO tenant_aliases (id, alias, tenant_id, kind, is_primary, status)
SELECT
  'alias_' || LOWER(subdomain),
  LOWER(subdomain),
  id::text,
  'subdomain',
  TRUE,
  'active'
FROM tenants
WHERE subdomain IS NOT NULL AND LENGTH(TRIM(subdomain)) > 0
ON CONFLICT (alias) DO NOTHING;

-- Scope leads to the resolved school so the public inquiry/application forms
-- feed each school's own admissions pipeline.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);