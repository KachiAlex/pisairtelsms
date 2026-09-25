-- Migration 027: Student portal sync — notifications feed + attendance excuse requests

-- Event-driven notifications for students (assignment published, work graded,
-- results published, excuse reviewed, etc.). Read via /api/student/notifications.
CREATE TABLE IF NOT EXISTS student_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_notifications_student
  ON student_notifications(student_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_notifications_tenant
  ON student_notifications(tenant_id);

-- Excuse requests: a student or parent submits a justification for an absence;
-- staff review and approve/reject. On approval the attendance record is marked
-- excused via absence_reason_id.
CREATE TABLE IF NOT EXISTS attendance_excuse_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  reason TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_by_role TEXT NOT NULL,
  submitted_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_by_name TEXT,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, student_id, attendance_date)
);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_tenant_status
  ON attendance_excuse_requests(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_student
  ON attendance_excuse_requests(student_id);
