-- Add fee management tables
CREATE TABLE IF NOT EXISTS fee_assignments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  fee_structure_id TEXT NOT NULL,
  academic_session TEXT NOT NULL,
  term TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  total_paid NUMERIC(12,2) DEFAULT 0,
  total_balance NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_assignments_student_id ON fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_fee_structure_id ON fee_assignments(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_session_term ON fee_assignments(academic_session, term);

CREATE TABLE IF NOT EXISTS exemptions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  fee_assignment_id TEXT NOT NULL,
  exemption_type TEXT NOT NULL,
  amount NUMERIC(12,2),
  percentage NUMERIC(5,2),
  reason TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approval_date TIMESTAMP WITH TIME ZONE NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exemptions_student_id ON exemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_exemptions_fee_assignment_id ON exemptions(fee_assignment_id);

CREATE TABLE IF NOT EXISTS student_payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  fee_structure_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_student_payments_student_id ON student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_fee_structure_id ON student_payments(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_paid_at ON student_payments(paid_at);
