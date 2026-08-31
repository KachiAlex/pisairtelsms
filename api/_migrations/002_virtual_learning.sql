-- Virtual Learning Tables (Phase 1: Classrooms, Materials, Assignments, Submissions)
-- Aligned with global LMS standards (Google Classroom, Canvas, Moodle)

-- Virtual classrooms: course shell linked to subject + class arm + teacher
CREATE TABLE IF NOT EXISTS virtual_classrooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  subject_id TEXT,
  class_arm_id TEXT,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | archived | draft
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vclassrooms_tenant ON virtual_classrooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vclassrooms_teacher ON virtual_classrooms(teacher_id);

-- Lessons: scheduled learning sessions within a classroom
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  classroom_id TEXT NOT NULL REFERENCES virtual_classrooms(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'async', -- live | async
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  meeting_url TEXT,
  recording_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | live | completed | cancelled
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lessons_classroom ON lessons(classroom_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tenant ON lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lessons_scheduled ON lessons(scheduled_at);

-- Course materials: resources attached to a classroom or specific lesson
CREATE TABLE IF NOT EXISTS course_materials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  classroom_id TEXT NOT NULL REFERENCES virtual_classrooms(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'document', -- document | video | link | image
  url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  uploaded_by TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_materials_classroom ON course_materials(classroom_id);
CREATE INDEX IF NOT EXISTS idx_materials_tenant ON course_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_lesson ON course_materials(lesson_id);

-- Assignments: tasks created by teachers for students to complete
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  classroom_id TEXT NOT NULL REFERENCES virtual_classrooms(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  points REAL NOT NULL DEFAULT 100,
  due_date TIMESTAMPTZ NOT NULL,
  allow_late_submission BOOLEAN NOT NULL DEFAULT true,
  late_penalty_percent REAL DEFAULT 0,
  attachment_urls TEXT[],
  created_by TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);

-- Submissions: student responses to assignments
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  content TEXT,
  file_urls TEXT[],
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  grade REAL,
  feedback TEXT,
  graded_by TEXT,
  graded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted | graded | returned | resubmitted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Virtual attendance: tracks student participation in live lessons
CREATE TABLE IF NOT EXISTS virtual_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'absent', -- present | absent | late | excused
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_vatt_lesson ON virtual_attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_vatt_student ON virtual_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_vatt_tenant ON virtual_attendance(tenant_id);

-- Discussions: threaded forum per classroom
CREATE TABLE IF NOT EXISTS discussions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  classroom_id TEXT NOT NULL REFERENCES virtual_classrooms(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_by TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'staff',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discussions_classroom ON discussions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_discussions_tenant ON discussions(tenant_id);

-- Discussion replies: threaded responses to discussions
CREATE TABLE IF NOT EXISTS discussion_replies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  parent_reply_id TEXT REFERENCES discussion_replies(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON discussion_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_tenant ON discussion_replies(tenant_id);
