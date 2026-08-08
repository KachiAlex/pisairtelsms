-- Finance tables for unified pg database
CREATE TABLE IF NOT EXISTS fee_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  admission_no TEXT NOT NULL,
  class TEXT NOT NULL,
  fee_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_payment_date TIMESTAMP WITH TIME ZONE,
  academic_session TEXT NOT NULL,
  term TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_records_tenant_id ON fee_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_student_id ON fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_class ON fee_records(class);
CREATE INDEX IF NOT EXISTS idx_fee_records_academic_session ON fee_records(academic_session);
CREATE INDEX IF NOT EXISTS idx_fee_records_term ON fee_records(term);
CREATE INDEX IF NOT EXISTS idx_fee_records_status ON fee_records(status);

CREATE TABLE IF NOT EXISTS payments (
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

CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_fee_assignment_id ON payments(fee_assignment_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_ref);

CREATE TABLE IF NOT EXISTS tenant_payment_settings (
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

CREATE INDEX IF NOT EXISTS idx_tenant_payment_settings_tenant_id ON tenant_payment_settings(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_payment_settings_tenant_gateway ON tenant_payment_settings(tenant_id, gateway);

CREATE TABLE IF NOT EXISTS payment_proofs (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payment_id TEXT,
  student_id TEXT,
  student_name TEXT,
  amount NUMERIC(12,2),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_tenant_id ON admin_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
