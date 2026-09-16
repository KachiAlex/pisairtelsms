-- Consolidate all data from legacy tenant IDs into the canonical
-- Kreatix Academy tenant: f038d6a2-8957-45e6-a716-393dfd69173b.
-- Tables known to have orphan rows: academic_departments, announcements,
-- branding_configs, ca_config, classes, exams, fee_structures, parent_students,
-- parents, promotion_rules, question_tag_links, question_tags, questions_bank,
-- report_templates, staff, staff_attendance, students, subjects, tax_config.

\set canonical 'f038d6a2-8957-45e6-a716-393dfd69173b'

BEGIN;

-- 1. Remove duplicate seed-era subject rows from the wrong tenant
--    (ENG already in Kreatix catalog; CoS superseded by 'Computer Studies').
DELETE FROM subjects
WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com')
  AND code IN ('ENG','CoS');

-- 2. One-per-tenant config tables: canonical Kreatix already has rows,
--    so the stale ones must be deleted rather than moved.
DELETE FROM branding_configs WHERE tenant_id = 'default-tenant';
DELETE FROM ca_config WHERE tenant_id = 'default-tenant-uuid';

-- 3. Move staff (admin login + duplicate teacher).
UPDATE staff
SET tenant_id = :'canonical'
WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');

-- 4. Move the tables with orphan rows.
UPDATE academic_departments     SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE academic_programs        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE academic_structure_audit SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE academic_years           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE admin_notifications      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE announcement_reads       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE announcements            SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE api_keys                 SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE api_rate_limit_configs   SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE api_usage                SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE approval_requests        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE approval_streams         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE assignments              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE attendance_records       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE backup_jobs              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE behavioral_incidents     SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE behavioral_recognition   SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE biometric_device_logs    SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE biometric_devices        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE biometric_syncs          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE branding_audit_logs      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE bulk_notification_jobs   SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE bulk_notifications       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE ca_config_audit          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE ca_config_overrides      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE channel_health           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE classes                  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE communication_logs       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE communication_recipients SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE communication_templates  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE communications           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE compiled_results         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE compliance_tasks         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE course_materials         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE discussion_replies       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE discussions              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE encryption_keys          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE escalation_channels      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE exams                    SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE exemptions               SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE fee_assignments          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE fee_items                SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE fee_records              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE fee_structures           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE grading_scale_audit      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE grading_scale_bands      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE grading_scales           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE guardian_notifications   SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE lessons                  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE lms_configs              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE lms_sync_logs            SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE lms_syncs                SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE maintenance_windows      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE notification_preferences SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE notifications            SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE parent_messages          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE parent_students          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE parents                  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payment_gateway_configs  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payment_gateway_transactions SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payment_gateway_webhook_logs SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payment_proofs           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payments                 SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payroll_approvals        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payroll_rules            SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payroll_run_items        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payroll_runs             SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payroll_schedules        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE payslips                 SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE private_lesson_payments  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE private_lesson_rates     SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE private_lesson_requests  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE privileged_roles         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE promotion_records        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE promotion_rules          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE question_tag_links       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE question_tags            SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE questions_bank           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE reminders                SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE report_template_fields   SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE report_templates         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE reviewer_workloads       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE salary_advances          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE security_events          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE sla_breaches             SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE squad_assignments        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE staff_attendance         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE staff_attendance_qr_sessions SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE staff_documents          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE staff_leave              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE staff_messages           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE staff_payroll            SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE staff_tasks              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_allergies        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_documents        SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_emergency_contacts SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_health_records   SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_payments         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_scores           SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_scores_audit     SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE student_vaccinations     SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');

-- 5. Move non-conflicting default-tenant student(s). SAM/2026/0002
--    (Esther Mordi) conflicts with Bright Anyanwu under Kreatix, so it is left
--    orphaned for manual resolution.
UPDATE students
SET tenant_id = :'canonical'
WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com')
  AND (admission_no <> 'SAM/2026/0002' OR admission_no IS NULL);

UPDATE submissions              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE support_tickets          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE tasks                    SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE tax_config               SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE teacher_allocation_slots SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE teacher_comments         SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE teacher_substitution_log SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE tenant_payment_settings  SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE tenant_role_grants       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE tenant_roles             SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_change_requests SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_class_schedules SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_conflicts      SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_exam_halls     SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_exam_periods   SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_exam_schedules SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_holidays       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_teacher_schedules SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_time_slots     SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE timetable_terms          SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE user_sessions            SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE users                    SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE virtual_attendance       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE virtual_classrooms       SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE virtual_learning_consents SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE virtual_learning_notifications SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE virtual_learning_settings SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');
UPDATE workstreams              SET tenant_id = :'canonical' WHERE tenant_id IN ('default-tenant-uuid','default-tenant','akoma@kreatixtech.com');

COMMIT;
