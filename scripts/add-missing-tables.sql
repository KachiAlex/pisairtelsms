-- Migration script to add missing tables for real data analytics
-- This script adds: students, staff, classes, subjects, fee_structures
-- Run this using the @vercel/postgres connection

-- Add students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL,
  admission_no TEXT UNIQUE NOT NULL,
  class TEXT NOT NULL,
  arm TEXT NOT NULL,
  gender TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  guardian TEXT NOT NULL,
  phone TEXT NOT NULL,
  guardian_email TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add staff table
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL,
  staff_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  hire_date TIMESTAMP NOT NULL,
  salary DECIMAL(12, 2),
  address TEXT,
  qualification TEXT,
  gender TEXT,
  date_of_birth TIMESTAMP,
  emergency_contact TEXT,
  emergency_phone TEXT,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add classes table
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  arm TEXT,
  level TEXT,
  status TEXT DEFAULT 'active',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Add subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Add fee_structures table
CREATE TABLE IF NOT EXISTS fee_structures (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  academic_session TEXT NOT NULL,
  term TEXT NOT NULL,
  class TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(admission_no);

CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON staff(staff_id);

CREATE INDEX IF NOT EXISTS idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);

CREATE INDEX IF NOT EXISTS idx_subjects_tenant_id ON subjects(tenant_id);

CREATE INDEX IF NOT EXISTS idx_fee_structures_tenant_id ON fee_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_term ON fee_structures(academic_session, term);

-- Add foreign key constraints
ALTER TABLE students ADD CONSTRAINT fk_students_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE students ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE staff ADD CONSTRAINT fk_staff_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
ALTER TABLE staff ADD CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE classes ADD CONSTRAINT fk_classes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE subjects ADD CONSTRAINT fk_subjects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE fee_structures ADD CONSTRAINT fk_fee_structures_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- Add tenant_id to fee_assignments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_assignments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE fee_assignments ADD COLUMN tenant_id TEXT;
    CREATE INDEX idx_fee_assignments_tenant_id ON fee_assignments(tenant_id);
  END IF;
END $$;

-- Add tenant_id to student_payments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_payments' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE student_payments ADD COLUMN tenant_id TEXT;
    CREATE INDEX idx_student_payments_tenant_id ON student_payments(tenant_id);
  END IF;
END $$;
