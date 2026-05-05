-- Attendance Logging System Database Schema Verification Script
-- This script verifies that all required tables, columns, indexes, and constraints exist

-- ============================================================================
-- Table Verification
-- ============================================================================

-- Verify absence_reasons table
SELECT 'absence_reasons' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'absence_reasons'
GROUP BY table_name;

-- Verify biometric_devices table
SELECT 'biometric_devices' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'biometric_devices'
GROUP BY table_name;

-- Verify attendance_records table
SELECT 'attendance_records' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'attendance_records'
GROUP BY table_name;

-- Verify attendance_audit_trail table
SELECT 'attendance_audit_trail' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'attendance_audit_trail'
GROUP BY table_name;

-- Verify device_enrollment table
SELECT 'device_enrollment' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'device_enrollment'
GROUP BY table_name;

-- Verify device_sync_logs table
SELECT 'device_sync_logs' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'device_sync_logs'
GROUP BY table_name;

-- ============================================================================
-- Index Verification
-- ============================================================================

-- List all indexes for attendance tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'absence_reasons',
    'biometric_devices',
    'attendance_records',
    'attendance_audit_trail',
    'device_enrollment',
    'device_sync_logs'
)
ORDER BY tablename, indexname;

-- ============================================================================
-- Foreign Key Verification
-- ============================================================================

-- List all foreign keys for attendance tables
SELECT
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
JOIN information_schema.key_column_usage kcu2 ON rc.unique_constraint_name = kcu2.constraint_name
WHERE table_name IN (
    'absence_reasons',
    'biometric_devices',
    'attendance_records',
    'attendance_audit_trail',
    'device_enrollment',
    'device_sync_logs'
)
ORDER BY table_name, constraint_name;

-- ============================================================================
-- Constraint Verification
-- ============================================================================

-- List all constraints for attendance tables
SELECT
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name IN (
    'absence_reasons',
    'biometric_devices',
    'attendance_records',
    'attendance_audit_trail',
    'device_enrollment',
    'device_sync_logs'
)
ORDER BY table_name, constraint_name;

-- ============================================================================
-- Summary Report
-- ============================================================================

-- Count total tables
SELECT COUNT(*) as total_attendance_tables
FROM information_schema.tables
WHERE table_name IN (
    'absence_reasons',
    'biometric_devices',
    'attendance_records',
    'attendance_audit_trail',
    'device_enrollment',
    'device_sync_logs'
);

-- Count total indexes
SELECT COUNT(*) as total_attendance_indexes
FROM pg_indexes
WHERE tablename IN (
    'absence_reasons',
    'biometric_devices',
    'attendance_records',
    'attendance_audit_trail',
    'device_enrollment',
    'device_sync_logs'
);

-- ============================================================================
-- Sample Data Verification
-- ============================================================================

-- Verify tables are empty (for new migration)
SELECT 'absence_reasons' as table_name, COUNT(*) as row_count FROM absence_reasons
UNION ALL
SELECT 'biometric_devices' as table_name, COUNT(*) as row_count FROM biometric_devices
UNION ALL
SELECT 'attendance_records' as table_name, COUNT(*) as row_count FROM attendance_records
UNION ALL
SELECT 'attendance_audit_trail' as table_name, COUNT(*) as row_count FROM attendance_audit_trail
UNION ALL
SELECT 'device_enrollment' as table_name, COUNT(*) as row_count FROM device_enrollment
UNION ALL
SELECT 'device_sync_logs' as table_name, COUNT(*) as row_count FROM device_sync_logs;

-- ============================================================================
-- Migration Status
-- ============================================================================

-- Check migration status
SELECT version, description, executed_at
FROM schema_migrations
WHERE version = 2
ORDER BY version DESC;
