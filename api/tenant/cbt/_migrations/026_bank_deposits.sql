-- Bank deposits for payment reconciliation
CREATE TABLE IF NOT EXISTS bank_deposits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  deposit_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference TEXT NOT NULL,
  description TEXT,
  matched_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_deposits_tenant ON bank_deposits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_unmatched ON bank_deposits(tenant_id) WHERE matched_payment_id IS NULL;

-- Tenant isolation + deposit linkage on existing reconciliation records
ALTER TABLE payment_reconciliation ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE payment_reconciliation ADD COLUMN IF NOT EXISTS bank_deposit_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_tenant ON payment_reconciliation(tenant_id);
