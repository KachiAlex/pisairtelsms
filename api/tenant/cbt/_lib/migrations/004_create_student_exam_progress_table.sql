-- Migration: Create student_exam_progress table
-- Description: Creates the student_exam_progress table for live monitoring of student exam progress
-- Version: 004

CREATE TABLE IF NOT EXISTS student_exam_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questions_answered INTEGER DEFAULT 0 CHECK (questions_answered >= 0),
  current_question INTEGER DEFAULT 0 CHECK (current_question >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Paused', 'Flagged')),
  time_remaining INTEGER, -- in seconds
  last_activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flag_reason VARCHAR(255),
  flagged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_exam ON student_exam_progress(exam_id);
CREATE INDEX IF NOT EXISTS idx_progress_student ON student_exam_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON student_exam_progress(status);
CREATE INDEX IF NOT EXISTS idx_progress_exam_status ON student_exam_progress(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_last_activity ON student_exam_progress(last_activity_time);
