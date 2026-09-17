-- Audit: for each Kreatix student, count dependent records and show registration order
SELECT s.id, s.admission_no, s.name, s.class, s.created_at,
  (SELECT COUNT(*) FROM student_scores sc WHERE sc.student_id = s.id::text) AS scores,
  (SELECT COUNT(*) FROM compiled_results cr WHERE cr.student_id = s.id::text) AS compiled,
  (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id = s.id::text) AS attendance,
  (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id::text) AS attendance2,
  (SELECT COUNT(*) FROM parent_students ps WHERE ps.student_id = s.id::text) AS parent_links,
  (SELECT COUNT(*) FROM fee_records fr WHERE fr.student_id = s.id::text) AS fees,
  (SELECT COUNT(*) FROM exam_results er WHERE er.student_id = s.id::text) AS exam_results,
  (SELECT COUNT(*) FROM submissions sub WHERE sub.student_id = s.id::text) AS submissions,
  (SELECT COUNT(*) FROM promotion_records pr WHERE pr.student_id = s.id::text) AS promotions,
  (SELECT COUNT(*) FROM student_documents sd WHERE sd.student_id = s.id::text) AS documents,
  (SELECT COUNT(*) FROM parent_notifications pn WHERE pn.student_id = s.id::text) AS parent_notifs,
  s.password_hash IS NOT NULL AS has_login,
  s.user_id
FROM students s
WHERE s.tenant_id = 'f038d6a2-8957-45e6-a716-393dfd69173b'
ORDER BY s.name, s.admission_no;
