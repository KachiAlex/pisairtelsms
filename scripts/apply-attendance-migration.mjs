/**
 * Apply attendance schema migration to the Neon PostgreSQL database.
 * This version removes the FK constraint to tenants(id) since the DB
 * uses tenant_id as a plain UUID column (no tenants table).
 */
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const MIGRATION_SQL = `
-- ============================================================================
-- 1. ABSENCE_REASONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS absence_reasons (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  reason_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, reason_name)
);

CREATE INDEX IF NOT EXISTS idx_absence_reasons_tenant ON absence_reasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_absence_reasons_active ON absence_reasons(is_active);

-- ============================================================================
-- 2. BIOMETRIC_DEVICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS biometric_devices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'inactive',
  sync_status VARCHAR(50) DEFAULT 'pending',
  ip_address VARCHAR(45),
  port INTEGER,
  connection_protocol VARCHAR(50) DEFAULT 'HTTPS',
  sync_frequency VARCHAR(50) DEFAULT 'daily',
  last_sync TIMESTAMP,
  last_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  enrolled_students_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_tenant ON biometric_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_status ON biometric_devices(status);
CREATE INDEX IF NOT EXISTS idx_device_sync_status ON biometric_devices(sync_status);
CREATE INDEX IF NOT EXISTS idx_device_serial_number ON biometric_devices(serial_number);

-- ============================================================================
-- 3. ATTENDANCE_RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  class VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  absence_reason_id TEXT REFERENCES absence_reasons(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL,
  device_id TEXT REFERENCES biometric_devices(id) ON DELETE SET NULL,
  user_id TEXT,
  academic_session VARCHAR(20) NOT NULL,
  term VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(tenant_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance_records(class, date);
CREATE INDEX IF NOT EXISTS idx_attendance_device ON attendance_records(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_source ON attendance_records(source);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_academic_session ON attendance_records(academic_session);
CREATE INDEX IF NOT EXISTS idx_attendance_term ON attendance_records(term);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);

-- ============================================================================
-- 4. ATTENDANCE_AUDIT_TRAIL TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_audit_trail (
  id TEXT PRIMARY KEY,
  attendance_record_id TEXT NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_record ON attendance_audit_trail(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON attendance_audit_trail(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON attendance_audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON attendance_audit_trail(changed_by);

-- ============================================================================
-- 5. DEVICE_ENROLLMENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_enrollment (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL,
  biometric_id VARCHAR(255) NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, student_id),
  UNIQUE(device_id, biometric_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_device ON device_enrollment(device_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_student ON device_enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_biometric_id ON device_enrollment(biometric_id);

-- ============================================================================
-- 6. DEVICE_SYNC_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_sync_logs (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES biometric_devices(id) ON DELETE CASCADE,
  sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details TEXT,
  sync_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_device ON device_sync_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON device_sync_logs(sync_timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON device_sync_logs(status);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');

    // Check existing tables
    const existing = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('attendance_records', 'absence_reasons', 'biometric_devices', 'attendance_audit_trail', 'device_enrollment', 'device_sync_logs')
      ORDER BY table_name
    `);
    
    const existingTables = existing.rows.map(r => r.table_name);
    console.log('Existing attendance tables:', existingTables.length > 0 ? existingTables.join(', ') : 'none');

    if (existingTables.length === 6) {
      console.log('All 6 attendance tables already exist. Nothing to do.');
      return;
    }

    console.log('Applying attendance schema migration...');
    await client.query('BEGIN');
    
    try {
      await client.query(MIGRATION_SQL);
      await client.query('COMMIT');
      console.log('Migration committed successfully!');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // Verify
    const verify = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('attendance_records', 'absence_reasons', 'biometric_devices', 'attendance_audit_trail', 'device_enrollment', 'device_sync_logs')
      ORDER BY table_name
    `);
    
    const created = verify.rows.map(r => r.table_name);
    console.log('\nTables now in database:');
    created.forEach(t => console.log(' ✅', t));
    console.log(`\n✅ Migration complete! ${created.length}/6 tables created.`);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  if (err.hint) console.error('Hint:', err.hint);
  process.exit(1);
});
