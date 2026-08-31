-- Guardian Notification History Schema Migration
-- Phase 4: Guardian Notifications for At-Risk Students
-- Created: 2026-05-04

-- ============================================================================
-- 1. GUARDIAN_NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guardian_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  guardian_email VARCHAR(255) NOT NULL,
  guardian_phone VARCHAR(20),
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('at_risk_attendance', 'attendance_improvement', 'manual_alert')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  attendance_percentage DECIMAL(5, 2),
  absence_count INTEGER,
  late_count INTEGER,
  recommended_actions TEXT,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'acknowledged')),
  delivery_channel VARCHAR(50) DEFAULT 'email' CHECK (delivery_channel IN ('email', 'sms', 'both')),
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE INDEX idx_guardian_notifications_tenant ON guardian_notifications(tenant_id);
CREATE INDEX idx_guardian_notifications_student ON guardian_notifications(student_id);
CREATE INDEX idx_guardian_notifications_email ON guardian_notifications(guardian_email);
CREATE INDEX idx_guardian_notifications_status ON guardian_notifications(delivery_status);
CREATE INDEX idx_guardian_notifications_type ON guardian_notifications(notification_type);
CREATE INDEX idx_guardian_notifications_created ON guardian_notifications(created_at);
CREATE INDEX idx_guardian_notifications_sent ON guardian_notifications(sent_at);

-- ============================================================================
-- 2. BULK_NOTIFICATION_JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  job_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('at_risk_students', 'manual_bulk', 'scheduled')),
  total_recipients INTEGER NOT NULL,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  acknowledged_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  filters JSONB,
  created_by TEXT NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bulk_jobs_tenant ON bulk_notification_jobs(tenant_id);
CREATE INDEX idx_bulk_jobs_status ON bulk_notification_jobs(status);
CREATE INDEX idx_bulk_jobs_type ON bulk_notification_jobs(job_type);
CREATE INDEX idx_bulk_jobs_created ON bulk_notification_jobs(created_at);

-- ============================================================================
-- 3. NOTIFICATION_PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  guardian_email VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  delivery_channel VARCHAR(50) DEFAULT 'email' CHECK (delivery_channel IN ('email', 'sms', 'both')),
  frequency VARCHAR(50) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'never')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, guardian_email, notification_type)
);

CREATE INDEX idx_notification_prefs_tenant ON notification_preferences(tenant_id);
CREATE INDEX idx_notification_prefs_email ON notification_preferences(guardian_email);
CREATE INDEX idx_notification_prefs_type ON notification_preferences(notification_type);

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
INSERT INTO schema_migrations (version, description) 
VALUES (3, 'Create guardian notification history schema')
ON CONFLICT DO NOTHING;
