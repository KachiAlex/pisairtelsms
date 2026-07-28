-- Branding config (one row per tenant)
CREATE TABLE IF NOT EXISTS branding_configs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT NOT NULL UNIQUE,
  school_name     TEXT NOT NULL DEFAULT 'Your School',
  school_motto    TEXT,
  primary_color   TEXT NOT NULL DEFAULT '#1E3A8A',
  secondary_color TEXT NOT NULL DEFAULT '#10B981',
  accent_color    TEXT NOT NULL DEFAULT '#F59E0B',
  logo_url        TEXT,
  logo_file_name  TEXT,
  favicon_url     TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  version         INTEGER NOT NULL DEFAULT 1,
  updated_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Branding audit log
CREATE TABLE IF NOT EXISTS branding_audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  changes     JSONB,
  performed_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_branding_audit_tenant ON branding_audit_logs(tenant_id);

-- Grading scales
CREATE TABLE IF NOT EXISTS grading_scales (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id             TEXT NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  type                  TEXT NOT NULL DEFAULT 'primary',
  version               INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'draft',
  minimum_pass_mark     NUMERIC,
  distinction_threshold NUMERIC,
  remediation_trigger   NUMERIC,
  published_at          TIMESTAMPTZ,
  published_by          TEXT,
  created_by            TEXT,
  updated_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grading_scales_tenant ON grading_scales(tenant_id);

-- Grading scale bands
CREATE TABLE IF NOT EXISTS grading_scale_bands (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scale_id    TEXT NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  grade       TEXT NOT NULL,
  min_score   NUMERIC NOT NULL,
  max_score   NUMERIC NOT NULL,
  remark      TEXT,
  gpa_weight  NUMERIC NOT NULL DEFAULT 0,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grading_bands_scale ON grading_scale_bands(scale_id);

-- Grading scale audit log
CREATE TABLE IF NOT EXISTS grading_scale_audit (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id    TEXT NOT NULL,
  scale_id     TEXT,
  action       TEXT NOT NULL,
  description  TEXT,
  performed_by TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_audit_tenant ON grading_scale_audit(tenant_id);

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  audience     TEXT NOT NULL DEFAULT 'parents',
  format       TEXT NOT NULL DEFAULT 'PDF',
  version      INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by TEXT,
  created_by   TEXT,
  updated_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_templates_tenant ON report_templates(tenant_id);

-- Report template fields
CREATE TABLE IF NOT EXISTS report_template_fields (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id TEXT NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'text',
  required    BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  config      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rt_fields_template ON report_template_fields(template_id);
