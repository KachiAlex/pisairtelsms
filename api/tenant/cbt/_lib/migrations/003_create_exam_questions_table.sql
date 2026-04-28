-- Migration: Create exam_questions table
-- Description: Creates the exam_questions junction table for exam-question relationships
-- Version: 003

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions_bank(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL CHECK (question_order >= 1),
  marks DECIMAL(5,2) NOT NULL CHECK (marks > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question ON exam_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_order ON exam_questions(exam_id, question_order);
