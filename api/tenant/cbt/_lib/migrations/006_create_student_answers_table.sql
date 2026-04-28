-- Migration: Create student_answers table
-- Description: Creates the student_answers table for detailed answer tracking and result analysis
-- Version: 006

CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id) ON DELETE CASCADE,
  student_answer TEXT,
  correct_answer VARCHAR(10),
  is_correct BOOLEAN NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(result_id, question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_answers_result ON student_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON student_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_is_correct ON student_answers(is_correct);
CREATE INDEX IF NOT EXISTS idx_answers_result_question ON student_answers(result_id, question_id);
