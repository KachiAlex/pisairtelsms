-- Migration: Create questions_bank table
-- Description: Creates the questions_bank table to store exam questions with metadata
-- Version: 001

CREATE TABLE IF NOT EXISTS questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('objective', 'truefalse', 'essay')),
  options JSONB, -- Array of options for objective/truefalse
  correct_answer VARCHAR(10),
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  subject VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT valid_options CHECK (
    (type = 'essay' AND options IS NULL) OR
    (type IN ('objective', 'truefalse') AND options IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_tenant ON questions_bank(tenant_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions_bank(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions_bank(type);
CREATE INDEX IF NOT EXISTS idx_questions_deleted_at ON questions_bank(deleted_at);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions_bank(created_by);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_questions_tenant_subject_difficulty ON questions_bank(tenant_id, subject, difficulty);
