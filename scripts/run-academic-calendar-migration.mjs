import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false, require: true }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationSQL = `
-- Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create timetable_terms table
CREATE TABLE IF NOT EXISTS timetable_terms (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  academic_year VARCHAR(100) NOT NULL,
  academic_year_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create timetable_holidays table
CREATE TABLE IF NOT EXISTS timetable_holidays (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  term_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create timetable_exam_periods table
CREATE TABLE IF NOT EXISTS timetable_exam_periods (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  term_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_academic_years_tenant ON academic_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_dates ON academic_years(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_timetable_terms_tenant ON timetable_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_terms_academic_year ON timetable_terms(academic_year);
CREATE INDEX IF NOT EXISTS idx_timetable_holidays_tenant ON timetable_holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_holidays_term ON timetable_holidays(term_id);
CREATE INDEX IF NOT EXISTS idx_timetable_exam_periods_tenant ON timetable_exam_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_exam_periods_term ON timetable_exam_periods(term_id);
`;

    await client.query(migrationSQL);
    console.log('Migration completed successfully');

    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('academic_years', 'timetable_terms', 'timetable_holidays', 'timetable_exam_periods')
    `);
    console.log('Created tables:', tables.rows.map(r => r.table_name));

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

runMigration();
