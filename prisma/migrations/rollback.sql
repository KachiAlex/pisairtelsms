-- Rollback migration for CBT schema
-- This script reverses all changes made by the initial migration

-- Drop all foreign keys first
ALTER TABLE "offline_sync_queue" DROP CONSTRAINT "offline_sync_queue_tenantId_fkey";
ALTER TABLE "offline_sync_queue" DROP CONSTRAINT "offline_sync_queue_examId_fkey";
ALTER TABLE "offline_sync_queue" DROP CONSTRAINT "offline_sync_queue_studentId_fkey";

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_tenantId_fkey";

ALTER TABLE "proctoring_logs" DROP CONSTRAINT "proctoring_logs_studentId_fkey";
ALTER TABLE "proctoring_logs" DROP CONSTRAINT "proctoring_logs_examId_fkey";

ALTER TABLE "security_settings" DROP CONSTRAINT "security_settings_examId_fkey";

ALTER TABLE "student_answers" DROP CONSTRAINT "student_answers_questionId_fkey";
ALTER TABLE "student_answers" DROP CONSTRAINT "student_answers_resultId_fkey";

ALTER TABLE "exam_results" DROP CONSTRAINT "exam_results_studentId_fkey";
ALTER TABLE "exam_results" DROP CONSTRAINT "exam_results_examId_fkey";

ALTER TABLE "student_exam_progress" DROP CONSTRAINT "student_exam_progress_studentId_fkey";
ALTER TABLE "student_exam_progress" DROP CONSTRAINT "student_exam_progress_examId_fkey";

ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_questionId_fkey";
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_examId_fkey";

ALTER TABLE "exams" DROP CONSTRAINT "exams_createdBy_fkey";
ALTER TABLE "exams" DROP CONSTRAINT "exams_tenantId_fkey";

ALTER TABLE "questions_bank" DROP CONSTRAINT "questions_bank_createdBy_fkey";
ALTER TABLE "questions_bank" DROP CONSTRAINT "questions_bank_tenantId_fkey";

ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- Drop all indexes
DROP INDEX IF EXISTS "offline_sync_queue_createdAt_idx";
DROP INDEX IF EXISTS "offline_sync_queue_syncStatus_idx";
DROP INDEX IF EXISTS "offline_sync_queue_examId_idx";
DROP INDEX IF EXISTS "offline_sync_queue_studentId_idx";

DROP INDEX IF EXISTS "audit_logs_entityType_idx";
DROP INDEX IF EXISTS "audit_logs_createdAt_idx";
DROP INDEX IF EXISTS "audit_logs_userId_idx";
DROP INDEX IF EXISTS "audit_logs_tenantId_idx";

DROP INDEX IF EXISTS "proctoring_logs_createdAt_idx";
DROP INDEX IF EXISTS "proctoring_logs_studentId_idx";
DROP INDEX IF EXISTS "proctoring_logs_examId_idx";

DROP INDEX IF EXISTS "security_settings_examId_idx";
DROP INDEX IF EXISTS "security_settings_examId_key";

DROP INDEX IF EXISTS "student_answers_questionId_idx";
DROP INDEX IF EXISTS "student_answers_resultId_idx";

DROP INDEX IF EXISTS "exam_results_createdAt_idx";
DROP INDEX IF EXISTS "exam_results_studentId_idx";
DROP INDEX IF EXISTS "exam_results_examId_idx";
DROP INDEX IF EXISTS "exam_results_examId_studentId_key";

DROP INDEX IF EXISTS "student_exam_progress_status_idx";
DROP INDEX IF EXISTS "student_exam_progress_studentId_idx";
DROP INDEX IF EXISTS "student_exam_progress_examId_idx";
DROP INDEX IF EXISTS "student_exam_progress_examId_studentId_key";

DROP INDEX IF EXISTS "exam_questions_questionId_idx";
DROP INDEX IF EXISTS "exam_questions_examId_idx";
DROP INDEX IF EXISTS "exam_questions_examId_questionId_key";

DROP INDEX IF EXISTS "exams_createdAt_idx";
DROP INDEX IF EXISTS "exams_status_idx";
DROP INDEX IF EXISTS "exams_tenantId_idx";

DROP INDEX IF EXISTS "questions_bank_createdAt_idx";
DROP INDEX IF EXISTS "questions_bank_difficulty_idx";
DROP INDEX IF EXISTS "questions_bank_subject_idx";
DROP INDEX IF EXISTS "questions_bank_tenantId_idx";

DROP INDEX IF EXISTS "users_tenantId_idx";
DROP INDEX IF EXISTS "users_tenantId_email_key";

DROP INDEX IF EXISTS "tenants_domain_key";

-- Drop all tables
DROP TABLE IF EXISTS "offline_sync_queue";
DROP TABLE IF EXISTS "audit_logs";
DROP TABLE IF EXISTS "proctoring_logs";
DROP TABLE IF EXISTS "security_settings";
DROP TABLE IF EXISTS "student_answers";
DROP TABLE IF EXISTS "exam_results";
DROP TABLE IF EXISTS "student_exam_progress";
DROP TABLE IF EXISTS "exam_questions";
DROP TABLE IF EXISTS "exams";
DROP TABLE IF EXISTS "questions_bank";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "tenants";

-- Drop enum types
DROP TYPE IF EXISTS "UserRole";
