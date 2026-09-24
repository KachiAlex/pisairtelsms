-- Fee structure version history and per-class fee overrides.
-- Versions snapshot the full structure + items on every create/update/rollback.
-- Overrides let a class pay a different amount for a given fee category.

CREATE TABLE IF NOT EXISTS fee_structure_versions (
  id                TEXT PRIMARY KEY,
  fee_structure_id  TEXT NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  tenant_id         TEXT NOT NULL,
  version           INTEGER NOT NULL,
  snapshot          JSONB NOT NULL,
  changes           TEXT,
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fee_structure_id, version)
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_versions_structure
  ON fee_structure_versions (fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_structure_versions_tenant
  ON fee_structure_versions (tenant_id);

CREATE TABLE IF NOT EXISTS fee_class_overrides (
  id                TEXT PRIMARY KEY,
  fee_structure_id  TEXT NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  tenant_id         TEXT NOT NULL,
  class_name        TEXT NOT NULL,
  fee_category      TEXT NOT NULL,
  original_amount   NUMERIC(12,2) NOT NULL,
  override_amount   NUMERIC(12,2) NOT NULL,
  reason            TEXT,
  effective_from    DATE NOT NULL,
  effective_to      DATE,
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fee_structure_id, class_name, fee_category)
);

CREATE INDEX IF NOT EXISTS idx_fee_class_overrides_structure
  ON fee_class_overrides (fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_class_overrides_tenant
  ON fee_class_overrides (tenant_id);
