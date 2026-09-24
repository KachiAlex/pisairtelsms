-- Offline CBT sync infrastructure: registered exam devices, downloadable
-- exam packages, and fallback events when a device loses connectivity.

CREATE TABLE IF NOT EXISTS offline_sync_devices (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  device_name   TEXT NOT NULL,
  device_type   TEXT NOT NULL DEFAULT 'exam-station',
  status        TEXT NOT NULL DEFAULT 'pending',
  last_sync_at  TIMESTAMPTZ,
  os_version    TEXT,
  app_version   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_devices_tenant
  ON offline_sync_devices (tenant_id);

CREATE TABLE IF NOT EXISTS offline_sync_packages (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  exam_id       TEXT,
  package_name  TEXT NOT NULL,
  version       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',
  size_bytes    BIGINT,
  checksum      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  published_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_packages_tenant
  ON offline_sync_packages (tenant_id);

CREATE TABLE IF NOT EXISTS offline_sync_fallbacks (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  device_id     TEXT,
  fallback_type TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'triggered',
  triggered_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  details       JSONB
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_fallbacks_tenant
  ON offline_sync_fallbacks (tenant_id);
