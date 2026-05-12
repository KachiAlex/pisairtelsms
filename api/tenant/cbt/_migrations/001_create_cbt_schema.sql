-- CBT & Examinations Database Schema Migration
-- Phase 1: Database Foundation
-- Created: 2026-05-03

-- ============================================================================
-- 1. QUESTIONS_BANK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('objective', 'truefalse', 'essay')),
  options JSONB,
  correct_answer VARCHAR(255),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  subject VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_tenant ON questions_bank(tenant_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions_bank(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions_bank(type);
CREATE INDEX IF NOT EXISTS idx_questions_deleted ON questions_bank(deleted_at);

-- --------------------------------------------------------------------------
-- Question Tags Catalog
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  subject VARCHAR(100),
  description TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_question_tags_tenant ON question_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_usage ON question_tags(tenant_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_question_tags_subject ON question_tags(subject);

CREATE TABLE IF NOT EXISTS question_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES question_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_question_tag_links_tag ON question_tag_links(tag_id);
CREATE INDEX IF NOT EXISTS idx_question_tag_links_question ON question_tag_links(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tag_links_tenant_tag ON question_tag_links(tenant_id, tag_id);

-- ============================================================================
-- 2. EXAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class VARCHAR(50) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL CHECK (duration >= 15 AND duration <= 480),
  pass_mark DECIMAL(5,2) NOT NULL CHECK (pass_mark >= 0 AND pass_mark <= 100),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Ongoing', 'Completed')),
  scheduled_date DATE,
  scheduled_time TIME,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exams_tenant ON exams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_date ON exams(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_exams_deleted ON exams(deleted_at);

-- ============================================================================
-- 3. EXAM_QUESTIONS TABLE (Junction Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  marks DECIMAL(5,2) NOT NULL CHECK (marks > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question ON exam_questions(question_id);

-- ============================================================================
-- 4. STUDENT_EXAM_PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_exam_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questions_answered INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Paused', 'Flagged')),
  time_remaining INTEGER,
  last_activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flag_reason VARCHAR(255),
  flagged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_exam ON student_exam_progress(exam_id);
CREATE INDEX IF NOT EXISTS idx_progress_student ON student_exam_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON student_exam_progress(status);
CREATE INDEX IF NOT EXISTS idx_progress_exam_status ON student_exam_progress(exam_id, status);

-- ============================================================================
-- 5. EXAM_RESULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Passed', 'Failed')),
  time_spent INTEGER NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_status ON exam_results(status);
CREATE INDEX IF NOT EXISTS idx_results_exam_status ON exam_results(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_results_submitted ON exam_results(submitted_at);

-- ============================================================================
-- 6. STUDENT_ANSWERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id),
  student_answer TEXT,
  correct_answer VARCHAR(255),
  is_correct BOOLEAN NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_answers_result ON student_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON student_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_correct ON student_answers(is_correct);

-- ============================================================================
-- 7. SECURITY_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL UNIQUE REFERENCES exams(id) ON DELETE CASCADE,
  enable_proctoring BOOLEAN DEFAULT false,
  disable_copy_paste BOOLEAN DEFAULT false,
  disable_right_click BOOLEAN DEFAULT false,
  require_camera BOOLEAN DEFAULT false,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_options BOOLEAN DEFAULT false,
  allowed_ips JSONB DEFAULT '[]'::jsonb,
  exam_password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_exam ON security_settings(exam_id);

-- ============================================================================
-- 8. PROCTORING_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS proctoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'tab_switch', 'copy_attempt', 'right_click', 'camera_off', 
    'suspicious_activity', 'manual_flag', 'other'
  )),
  event_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proctoring_exam ON proctoring_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_student ON proctoring_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_event_type ON proctoring_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_proctoring_created ON proctoring_logs(created_at);

-- ============================================================================
-- 9. AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL CHECK (action IN (
    'create', 'update', 'delete', 'read', 'export', 'import',
    'start_exam', 'pause_exam', 'resume_exam', 'complete_exam',
    'flag_student', 'approve_results', 'sync_offline'
  )),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'question', 'exam', 'exam_result', 'security_settings', 'student_answer'
  )),
  entity_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================================================
-- 10. OFFLINE_SYNC_QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_student ON offline_sync_queue(student_id);
CREATE INDEX IF NOT EXISTS idx_sync_exam ON offline_sync_queue(exam_id);
CREATE INDEX IF NOT EXISTS idx_sync_status ON offline_sync_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_created ON offline_sync_queue(created_at);

-- ============================================================================
-- CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Ensure pass_mark <= total_marks for exams
DO $$
BEGIN
  ALTER TABLE exams ADD CONSTRAINT check_pass_mark_vs_total
    CHECK (pass_mark <= total_marks);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure scheduled_date is in the future for scheduled exams
DO $$
BEGIN
  ALTER TABLE exams ADD CONSTRAINT check_scheduled_date
    CHECK (scheduled_date IS NULL OR scheduled_date >= CURRENT_DATE);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version, description) 
VALUES (1, 'Create CBT & Examinations database schema')
ON CONFLICT DO NOTHING;
