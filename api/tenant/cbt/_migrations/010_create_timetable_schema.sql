-- Timetable Schema Migration
-- Replaces in-memory mock stores with persistent DB tables

CREATE TABLE IF NOT EXISTS timetable_terms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_terms_tenant ON timetable_terms(tenant_id);

CREATE TABLE IF NOT EXISTS timetable_holidays (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  term_id TEXT NOT NULL REFERENCES timetable_terms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_holidays_term ON timetable_holidays(term_id);

CREATE TABLE IF NOT EXISTS timetable_exam_periods (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  term_id TEXT NOT NULL REFERENCES timetable_terms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_exam_periods_term ON timetable_exam_periods(term_id);

CREATE TABLE IF NOT EXISTS timetable_time_slots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  is_break BOOLEAN NOT NULL DEFAULT FALSE,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_time_slots_tenant ON timetable_time_slots(tenant_id);

CREATE TABLE IF NOT EXISTS timetable_class_schedules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  term_id TEXT NOT NULL REFERENCES timetable_terms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, class_id, term_id)
);
CREATE INDEX IF NOT EXISTS idx_tt_class_schedules_tenant ON timetable_class_schedules(tenant_id);

CREATE TABLE IF NOT EXISTS timetable_class_schedule_entries (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES timetable_class_schedules(id) ON DELETE CASCADE,
  time_slot_id TEXT NOT NULL REFERENCES timetable_time_slots(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name VARCHAR(255) NOT NULL,
  room_id TEXT,
  day_of_week INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_cse_schedule ON timetable_class_schedule_entries(schedule_id);

CREATE TABLE IF NOT EXISTS timetable_teacher_schedules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  term_id TEXT NOT NULL REFERENCES timetable_terms(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  time_slot_id TEXT NOT NULL REFERENCES timetable_time_slots(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_teacher_schedules_teacher ON timetable_teacher_schedules(tenant_id, teacher_id);

CREATE TABLE IF NOT EXISTS timetable_exam_halls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_exam_halls_tenant ON timetable_exam_halls(tenant_id);

CREATE TABLE IF NOT EXISTS timetable_exam_schedules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  exam_period_id TEXT NOT NULL REFERENCES timetable_exam_periods(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  exam_type VARCHAR(50) NOT NULL DEFAULT 'written',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_exam_schedules_period ON timetable_exam_schedules(exam_period_id);

CREATE TABLE IF NOT EXISTS timetable_exam_hall_assignments (
  id TEXT PRIMARY KEY,
  exam_schedule_id TEXT NOT NULL REFERENCES timetable_exam_schedules(id) ON DELETE CASCADE,
  hall_id TEXT NOT NULL REFERENCES timetable_exam_halls(id) ON DELETE CASCADE,
  hall_name VARCHAR(255) NOT NULL,
  student_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_invigilators (
  id TEXT PRIMARY KEY,
  exam_schedule_id TEXT NOT NULL REFERENCES timetable_exam_schedules(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  hall_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_change_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  entry_id TEXT NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_change_requests_tenant ON timetable_change_requests(tenant_id);

CREATE TABLE IF NOT EXISTS timetable_conflicts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  conflict_type VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT NOT NULL,
  owner VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tt_conflicts_tenant ON timetable_conflicts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tt_conflicts_status ON timetable_conflicts(status);

INSERT INTO schema_migrations (version, description)
VALUES (10, 'Create timetable schema')
ON CONFLICT DO NOTHING;
