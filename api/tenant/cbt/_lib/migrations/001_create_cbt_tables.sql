-- Migration: Create CBT Dashboard Tables
-- Description: Creates all 8 tables for CBT Dashboard functionality
-- Created: 2026-04-28

-- ============================================================================
-- 1. questions_bank Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  text TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('objective', 'truefalse', 'essay')),
  options JSONB,
  correct_answer VARCHAR(255),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  subject VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT valid_options CHECK (
    (type = 'essay' AND options IS NULL) OR
    (type IN ('objective', 'truefalse') AND options IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_questions_tenant ON questions_bank(tenant_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions_bank(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions_bank(type);
CREATE INDEX IF NOT EXISTS idx_questions_deleted ON questions_bank(deleted_at);

-- ============================================================================
-- 2. exams Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT valid_marks CHECK (total_marks > pass_mark)
);

CREATE INDEX IF NOT EXISTS idx_exams_tenant ON exams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_date ON exams(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class);
CREATE INDEX IF NOT EXISTS idx_exams_deleted ON exams(deleted_at);

-- ============================================================================
-- 3. exam_questions Table (Junction Table)
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
-- 4. student_exam_progress Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_exam_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  questions_answered INTEGER DEFAULT 0 CHECK (questions_answered >= 0),
  current_question INTEGER DEFAULT 0 CHECK (current_question >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Paused', 'Flagged')),
  time_remaining INTEGER CHECK (time_remaining >= 0),
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
CREATE INDEX IF NOT EXISTS idx_progress_last_activity ON student_exam_progress(last_activity_time);

-- ============================================================================
-- 5. exam_results Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  status VARCHAR(20) NOT NULL CHECK (status IN ('Passed', 'Failed')),
  time_spent INTEGER NOT NULL CHECK (time_spent >= 0),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_status ON exam_results(status);
CREATE INDEX IF NOT EXISTS idx_results_submitted ON exam_results(submitted_at);

-- ============================================================================
-- 6. student_answers Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id) ON DELETE CASCADE,
  student_answer TEXT,
  correct_answer VARCHAR(255),
  is_correct BOOLEAN NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_answers_result ON student_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON student_answers(question_id);

-- ============================================================================
-- 7. security_settings Table
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
-- 8. proctoring_logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS proctoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proctoring_exam ON proctoring_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_student ON proctoring_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_timestamp ON proctoring_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_proctoring_event_type ON proctoring_logs(event_type);

-- ============================================================================
-- End of Migration
-- ============================================================================
