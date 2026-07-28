-- CBT & Examinations Database Schema Verification Script
-- This script verifies that all required tables, columns, indexes, and constraints exist

-- ============================================================================
-- Table Verification
-- ============================================================================

-- Verify questions_bank table
SELECT 'questions_bank' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'questions_bank'
GROUP BY table_name;

-- Verify exams table
SELECT 'exams' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'exams'
GROUP BY table_name;

-- Verify exam_questions table
SELECT 'exam_questions' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'exam_questions'
GROUP BY table_name;

-- Verify student_exam_progress table
SELECT 'student_exam_progress' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'student_exam_progress'
GROUP BY table_name;

-- Verify exam_results table
SELECT 'exam_results' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'exam_results'
GROUP BY table_name;

-- Verify student_answers table
SELECT 'student_answers' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'student_answers'
GROUP BY table_name;

-- Verify security_settings table
SELECT 'security_settings' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'security_settings'
GROUP BY table_name;

-- Verify proctoring_logs table
SELECT 'proctoring_logs' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'proctoring_logs'
GROUP BY table_name;

-- Verify audit_logs table
SELECT 'audit_logs' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'audit_logs'
GROUP BY table_name;

-- Verify offline_sync_queue table
SELECT 'offline_sync_queue' as table_name,
       COUNT(*) as column_count,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'offline_sync_queue'
GROUP BY table_name;

-- ============================================================================
-- Index Verification
-- ============================================================================

-- List all indexes for CBT tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
)
ORDER BY tablename, indexname;

-- ============================================================================
-- Foreign Key Verification
-- ============================================================================

-- List all foreign keys for CBT tables
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
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
)
ORDER BY table_name, constraint_name;

-- ============================================================================
-- Constraint Verification
-- ============================================================================

-- List all constraints for CBT tables
SELECT
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name IN (
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
)
ORDER BY table_name, constraint_name;

-- ============================================================================
-- Summary Report
-- ============================================================================

-- Count total tables
SELECT COUNT(*) as total_cbt_tables
FROM information_schema.tables
WHERE table_name IN (
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
);

-- Count total indexes
SELECT COUNT(*) as total_cbt_indexes
FROM pg_indexes
WHERE tablename IN (
    'questions_bank',
    'exams',
    'exam_questions',
    'student_exam_progress',
    'exam_results',
    'student_answers',
    'security_settings',
    'proctoring_logs',
    'audit_logs',
    'offline_sync_queue'
);
