-- Migration to recreate payment tables with tenant_id column
-- Run this to fix the schema if tables were created without tenant_id

-- Drop existing tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS payment_proofs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS tenant_payment_settings CASCADE;

-- Recreate payments table with tenant_id
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  fee_assignment_id TEXT NOT NULL,
  fee_structure_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL,
  payment_time TIME NOT NULL,
  recorded_by TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  gateway TEXT,
  gateway_ref TEXT,
  gateway_response TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payments
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_fee_assignment_id ON payments(fee_assignment_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_ref ON payments(gateway_ref);

-- Recreate tenant_payment_settings table with tenant_id
CREATE TABLE tenant_payment_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  gateway TEXT NOT NULL,
  public_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  metadata TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tenant_payment_settings
CREATE INDEX idx_tenant_payment_settings_tenant_id ON tenant_payment_settings(tenant_id);
CREATE UNIQUE INDEX idx_tenant_payment_settings_tenant_gateway ON tenant_payment_settings(tenant_id, gateway);

-- Recreate payment_proofs table
CREATE TABLE payment_proofs (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
