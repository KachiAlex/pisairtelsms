-- Fee structure and assignment tables for unified pg database
CREATE TABLE IF NOT EXISTS fee_structures (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  academic_session TEXT NOT NULL,
  term TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_tenant_id ON fee_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_session ON fee_structures(academic_session);
CREATE INDEX IF NOT EXISTS idx_fee_structures_term ON fee_structures(term);
CREATE INDEX IF NOT EXISTS idx_fee_structures_status ON fee_structures(status);

CREATE TABLE IF NOT EXISTS fee_items (
  id TEXT PRIMARY KEY,
  fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  applicable_classes TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_items_fee_structure_id ON fee_items(fee_structure_id);

CREATE TABLE IF NOT EXISTS fee_assignments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  academic_session TEXT NOT NULL,
  term TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_balance NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_assignments_student_id ON fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_fee_structure_id ON fee_assignments(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_academic_session ON fee_assignments(academic_session);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_term ON fee_assignments(term);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_status ON fee_assignments(status);

CREATE TABLE IF NOT EXISTS exemptions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  fee_assignment_id TEXT NOT NULL REFERENCES fee_assignments(id) ON DELETE CASCADE,
  exemption_type TEXT NOT NULL,
  amount NUMERIC(12,2),
  percentage NUMERIC(5,2),
  reason TEXT,
  approved_by TEXT NOT NULL,
  approval_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exemptions_fee_assignment_id ON exemptions(fee_assignment_id);
CREATE INDEX IF NOT EXISTS idx_exemptions_student_id ON exemptions(student_id);

CREATE TABLE IF NOT EXISTS student_payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_payments_student_id ON student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_fee_structure_id ON student_payments(fee_structure_id);
