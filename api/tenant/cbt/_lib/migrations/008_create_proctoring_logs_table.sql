-- Migration: Create proctoring_logs table
-- Description: Creates the proctoring_logs table for security event tracking during exams
-- Version: 008

CREATE TABLE IF NOT EXISTS proctoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'camera_on',
    'camera_off',
    'tab_switch',
    'copy_attempt',
    'right_click',
    'suspicious_activity',
    'ip_mismatch',
    'password_failed',
    'exam_started',
    'exam_paused',
    'exam_resumed',
    'exam_submitted'
  )),
  event_details JSONB, -- Flexible storage for event-specific details
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_proctoring_exam ON proctoring_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_student ON proctoring_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_event_type ON proctoring_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_proctoring_timestamp ON proctoring_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_proctoring_exam_student ON proctoring_logs(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_exam_timestamp ON proctoring_logs(exam_id, created_at);
