-- Add users table to match Prisma schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, email)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Update students table to add user_id foreign key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE students ADD COLUMN user_id TEXT UNIQUE;
    CREATE INDEX idx_students_user_id ON students(user_id);
  END IF;
END $$;

-- Update staff table to add user_id foreign key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE staff ADD COLUMN user_id TEXT UNIQUE;
    CREATE INDEX idx_staff_user_id ON staff(user_id);
  END IF;
END $$;

-- Add tenant_id to staff table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE staff ADD COLUMN tenant_id TEXT;
    CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
  END IF;
END $$;

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

-- Add category and amount columns to fee_structures if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_structures' AND column_name = 'category'
  ) THEN
    ALTER TABLE fee_structures ADD COLUMN category TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_structures' AND column_name = 'amount'
  ) THEN
    ALTER TABLE fee_structures ADD COLUMN amount NUMERIC(12, 2);
  END IF;
END $$;

-- Add foreign key constraints for students and staff (skip users foreign key to tenants since tenants table doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'students' AND constraint_name = 'fk_students_user'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'staff' AND constraint_name = 'fk_staff_user'
  ) THEN
    ALTER TABLE staff ADD CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
END $$;
