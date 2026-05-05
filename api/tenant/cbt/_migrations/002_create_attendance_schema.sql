-- Attendance Logging System Database Schema Migration
-- Phase 1: Core Attendance Entry & Database
-- Created: 2026-05-04

-- ============================================================================
-- 1. ABSENCE_REASONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS absence_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reason_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, reason_name)
);

CREATE INDEX idx_absence_reasons_tenant ON absence_reasons(tenant_id);
CREATE INDEX idx_absence_reasons_active ON absence_reasons(is_active);

-- ============================================================================
-- 2. BIOMETRIC_DEVICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('fingerprint', 'face', 'iris', 'palm')),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
  sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  ip_address VARCHAR(45),
  port INTEGER CHECK (port >= 1 AND port <= 65535),
  connection_protocol VARCHAR(50) DEFAULT 'HTTPS',
  sync_frequency VARCHAR(50) DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'every_4_hours', 'daily', 'manual')),
  last_sync TIMESTAMP,
  last_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  enrolled_students_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_device_tenant ON biometric_devices(tenant_id);
CREATE INDEX idx_device_status ON biometric_devices(status);
CREATE INDEX idx_device_sync_status ON biometric_devices(sync_status);
CREATE INDEX idx_device_serial_number ON biometric_devices(serial_number);

-- ============================================================================
-- 3. ATTENDANCE_RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  class VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  absence_reason_id UUID REFERENCES absence_reasons(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('teacher_entry', 'biometric_device', 'batch_upload', 'api_entry')),
  device_id UUID REFERENCES biometric_devices(id) ON DELETE SET NULL,
  user_id UUID,
  academic_session VARCHAR(20) NOT NULL,
  term VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  UNIQUE(tenant_id, student_id, date)
);

CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX idx_attendance_class_date ON attendance_records(class, date);
CREATE INDEX idx_attendance_device ON attendance_records(device_id);
CREATE INDEX idx_attendance_source ON attendance_records(source);
CREATE INDEX idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_attendance_academic_session ON attendance_records(academic_session);
CREATE INDEX idx_attendance_term ON attendance_records(term);
CREATE INDEX idx_attendance_date ON attendance_records(date);

-- ============================================================================
-- 4. ATTENDANCE_AUDIT_TRAIL TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_value JSONB,
  new_value JSONB,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_record ON attendance_audit_trail(attendance_record_id);
CREATE INDEX idx_audit_timestamp ON attendance_audit_trail(changed_at);
CREATE INDEX idx_audit_action ON attendance_audit_trail(action);
CREATE INDEX idx_audit_changed_by ON attendance_audit_trail(changed_by);

-- ============================================================================
-- 5. DEVICE_ENROLLMENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  biometric_id VARCHAR(255) NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, student_id),
  UNIQUE(device_id, biometric_id)
);

CREATE INDEX idx_enrollment_device ON device_enrollment(device_id);
CREATE INDEX idx_enrollment_student ON device_enrollment(student_id);
CREATE INDEX idx_enrollment_biometric_id ON device_enrollment(biometric_id);

-- ============================================================================
-- 6. DEVICE_SYNC_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
  sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details TEXT,
  sync_duration_ms INTEGER,
  FOREIGN KEY (device_id) REFERENCES biometric_devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_logs_device ON device_sync_logs(device_id);
CREATE INDEX idx_sync_logs_timestamp ON device_sync_logs(sync_timestamp);
CREATE INDEX idx_sync_logs_status ON device_sync_logs(status);

-- ============================================================================
-- CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Ensure date is not in the future for attendance records
ALTER TABLE attendance_records ADD CONSTRAINT check_attendance_date
  CHECK (date <= CURRENT_DATE);

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
INSERT INTO schema_migrations (version, description) 
VALUES (2, 'Create attendance logging system schema')
ON CONFLICT DO NOTHING;
