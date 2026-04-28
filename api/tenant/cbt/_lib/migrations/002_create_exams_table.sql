-- Migration: Create exams table
-- Description: Creates the exams table to store exam configurations and metadata
-- Version: 002

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class VARCHAR(50) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL CHECK (duration >= 15 AND duration <= 480), -- in minutes
  pass_mark DECIMAL(5,2) NOT NULL CHECK (pass_mark >= 0 AND pass_mark <= 100),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Ongoing', 'Completed')),
  scheduled_date DATE,
  scheduled_time TIME,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT valid_marks CHECK (pass_mark <= total_marks)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exams_tenant ON exams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_date ON exams(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_deleted_at ON exams(deleted_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_exams_tenant_status ON exams(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_exams_tenant_scheduled_date ON exams(tenant_id, scheduled_date);
