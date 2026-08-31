-- Health & Behavioral Schema Migration

-- ============================================================================
-- 1. STUDENT_HEALTH_RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_health_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(100) NOT NULL,        -- e.g. 'Checkup', 'Vaccination', 'Sick Visit'
  description TEXT NOT NULL,
  recorded_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shr_student ON student_health_records(student_id);
CREATE INDEX IF NOT EXISTS idx_shr_tenant ON student_health_records(tenant_id);

-- ============================================================================
-- 2. STUDENT_VACCINATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_vaccinations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  next_due_date DATE,
  status VARCHAR(50) DEFAULT 'completed', -- 'completed' | 'pending' | 'overdue'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sv_student ON student_vaccinations(student_id);

-- ============================================================================
-- 3. STUDENT_ALLERGIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_allergies (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  allergen VARCHAR(255) NOT NULL,
  severity VARCHAR(50) NOT NULL,   -- 'mild' | 'moderate' | 'severe'
  reaction TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sa_student ON student_allergies(student_id);

-- ============================================================================
-- 4. STUDENT_EMERGENCY_CONTACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_emergency_contacts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sec_student ON student_emergency_contacts(student_id);

-- ============================================================================
-- 5. BEHAVIORAL_INCIDENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS behavioral_incidents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50) DEFAULT 'minor',   -- 'minor' | 'moderate' | 'severe'
  action_taken TEXT,
  reported_by TEXT,                        -- staff_id or name
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bi_student ON behavioral_incidents(student_id);

-- ============================================================================
-- 6. BEHAVIORAL_RECOGNITION (positive awards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS behavioral_recognition (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(255) NOT NULL,
  description TEXT,
  awarded_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_br_student ON behavioral_recognition(student_id);

-- ============================================================================
-- 7. TEACHER_COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_comments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  staff_id TEXT,
  tenant_id TEXT NOT NULL,
  subject VARCHAR(255),
  comment TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tc_student ON teacher_comments(student_id);
