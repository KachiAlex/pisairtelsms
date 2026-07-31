-- Phase 3: Private Lessons, Approvals, Consents, Notifications

-- Private lesson rate card (admin-configured)
CREATE TABLE IF NOT EXISTS private_lesson_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  rate_type TEXT NOT NULL DEFAULT 'per_session', -- per_session | per_hour | per_subject
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  subject_id TEXT, -- null = global rate, specific subject override
  payment_mode TEXT NOT NULL DEFAULT 'direct_payment', -- direct_payment | add_to_invoice
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plr_tenant ON private_lesson_rates(tenant_id);

-- Private lesson requests (teacher initiates, admin approves, parent approves + pays)
CREATE TABLE IF NOT EXISTS private_lesson_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  student_ids TEXT[] NOT NULL DEFAULT '{}',
  subject_id TEXT,
  classroom_id TEXT, -- optional link to virtual classroom
  purpose TEXT NOT NULL,
  proposed_schedule TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  num_sessions INTEGER NOT NULL DEFAULT 1,
  fee_amount REAL, -- calculated from rate card, confirmed by admin
  fee_currency TEXT DEFAULT 'NGN',
  payment_mode TEXT, -- direct_payment | add_to_invoice
  -- Admin approval
  admin_status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_approved_by TEXT,
  admin_approved_at TIMESTAMPTZ,
  admin_notes TEXT,
  -- Parent approval
  parent_status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | declined
  parent_approved_by TEXT,
  parent_approved_at TIMESTAMPTZ,
  parent_notes TEXT,
  -- Overall status
  status TEXT NOT NULL DEFAULT 'pending_admin', -- pending_admin | pending_parent | approved | scheduled | completed | cancelled | rejected | declined
  lesson_id TEXT, -- linked lesson once fully approved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plr_tenant ON private_lesson_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plr_teacher ON private_lesson_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_plr_status ON private_lesson_requests(status);
CREATE INDEX IF NOT EXISTS idx_plr_admin_status ON private_lesson_requests(admin_status);
CREATE INDEX IF NOT EXISTS idx_plr_parent_status ON private_lesson_requests(parent_status);

-- Private lesson payments
CREATE TABLE IF NOT EXISTS private_lesson_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  request_id TEXT NOT NULL REFERENCES private_lesson_requests(id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  payment_method TEXT, -- card | bank_transfer | cash | invoice
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | refunded
  paid_at TIMESTAMPTZ,
  transaction_ref TEXT,
  invoice_id TEXT, -- if added to term invoice
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plp_tenant ON private_lesson_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plp_request ON private_lesson_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_plp_parent ON private_lesson_payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_plp_status ON private_lesson_payments(payment_status);

-- Virtual learning consents (parental opt-in/out)
CREATE TABLE IF NOT EXISTS virtual_learning_consents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  consent_type TEXT NOT NULL DEFAULT 'standard', -- standard | private_lessons | recording
  status TEXT NOT NULL DEFAULT 'pending', -- granted | denied | pending
  granted_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, consent_type)
);
CREATE INDEX IF NOT EXISTS idx_vlc_tenant ON virtual_learning_consents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vlc_student ON virtual_learning_consents(student_id);
CREATE INDEX IF NOT EXISTS idx_vlc_parent ON virtual_learning_consents(parent_id);

-- Virtual learning notifications
CREATE TABLE IF NOT EXISTS virtual_learning_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL, -- staff | student | parent | tenant_admin
  type TEXT NOT NULL, -- lesson_scheduled | lesson_starting | attendance_recorded | assignment_posted | grade_published | approval_request | approval_result | payment_request | payment_confirmed
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data_json JSONB,
  related_entity_type TEXT, -- private_lesson_request | lesson | assignment | submission
  related_entity_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vln_tenant ON virtual_learning_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vln_user ON virtual_learning_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_vln_unread ON virtual_learning_notifications(user_id, is_read);

-- Virtual learning settings (admin-configured policies)
CREATE TABLE IF NOT EXISTS virtual_learning_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL UNIQUE,
  school_hours_start TIME NOT NULL DEFAULT '08:00',
  school_hours_end TIME NOT NULL DEFAULT '15:00',
  allow_live_outside_school_hours BOOLEAN NOT NULL DEFAULT false,
  max_private_lessons_per_week INTEGER NOT NULL DEFAULT 3,
  require_parent_consent_standard BOOLEAN NOT NULL DEFAULT false,
  require_parent_consent_private BOOLEAN NOT NULL DEFAULT true,
  allow_recording BOOLEAN NOT NULL DEFAULT true,
  recording_retention_days INTEGER NOT NULL DEFAULT 90,
  auto_notify_parents BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
