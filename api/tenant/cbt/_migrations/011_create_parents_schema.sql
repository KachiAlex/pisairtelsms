-- Parents Schema Migration
-- Adds guardian_email to students, creates parents and parent_students tables

-- 1. Add guardian_email column to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(255);

-- 2. PARENTS TABLE — one row per guardian email
CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  password_hash TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  portal_access_token TEXT,
  token_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_tenant ON parents(tenant_id);

-- 3. PARENT_STUDENTS junction table
CREATE TABLE IF NOT EXISTS parent_students (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
