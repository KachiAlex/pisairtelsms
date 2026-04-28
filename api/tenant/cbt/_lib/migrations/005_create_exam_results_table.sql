-- Migration: Create exam_results table
-- Description: Creates the exam_results table for storing completed exam results and scores
-- Version: 005

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  status VARCHAR(20) NOT NULL CHECK (status IN ('Passed', 'Failed')),
  time_spent INTEGER NOT NULL CHECK (time_spent >= 0), -- in seconds
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_status ON exam_results(status);
CREATE INDEX IF NOT EXISTS idx_results_exam_status ON exam_results(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON exam_results(submitted_at);
CREATE INDEX IF NOT EXISTS idx_results_percentage ON exam_results(percentage);
