-- Migration 004: Add columns for student management endpoints

-- Add created_at and updated_at to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add academic_session and updated_at to leads table (used by applications API)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS academic_session VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create student_documents table
CREATE TABLE IF NOT EXISTS student_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  student_id TEXT,
  student_name TEXT NOT NULL,
  cohort TEXT,
  category TEXT NOT NULL DEFAULT 'Academic',
  doc_name TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'Awaiting upload',
  aging TEXT,
  file_type TEXT,
  requirement TEXT,
  file_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_tenant ON student_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON student_documents(status);

-- Create student_health table
CREATE TABLE IF NOT EXISTS student_health_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  student_id TEXT,
  student_name TEXT NOT NULL,
  cohort TEXT,
  record_type TEXT NOT NULL DEFAULT 'screening',
  details TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  severity TEXT DEFAULT 'Low',
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_health_tenant ON student_health_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_health_student_id ON student_health_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_health_status ON student_health_records(status);
CREATE INDEX IF NOT EXISTS idx_student_health_type ON student_health_records(record_type);
