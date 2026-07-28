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

    // Migrate data from timetable_terms to academic_years
    console.log('Migrating academic years from timetable_terms...');
    const insertResult = await client.query(`
      INSERT INTO academic_years (id, tenant_id, name, start_date, end_date, is_current)
      SELECT 
        gen_random_uuid()::text as id,
        tenant_id,
        academic_year as name,
        MIN(start_date) as start_date,
        MAX(end_date) as end_date,
        FALSE as is_current
      FROM timetable_terms
      GROUP BY tenant_id, academic_year
      ON CONFLICT DO NOTHING
      RETURNING *
    `);
    console.log(`Inserted ${insertResult.rows.length} academic years`);
    insertResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.start_date} to ${row.end_date})`);
    });

    // Update timetable_terms to reference academic_years
    console.log('Updating timetable_terms with academic_year_id...');
    const updateResult = await client.query(`
      UPDATE timetable_terms
      SET academic_year_id = (
        SELECT ay.id 
        FROM academic_years ay 
        WHERE ay.name = timetable_terms.academic_year 
        AND ay.tenant_id = timetable_terms.tenant_id
        LIMIT 1
      )
      WHERE academic_year_id IS NULL
    `);
    console.log(`Updated ${updateResult.rowCount} timetable terms`);

    // Record migration
    await client.query(`
      INSERT INTO schema_migrations (version, description)
      VALUES (12, 'Create academic_years table and migrate existing data')
      ON CONFLICT (version) DO NOTHING
    `);
    console.log('Recorded migration version 12');

    // Verify
    const verifyResult = await client.query('SELECT * FROM academic_years ORDER BY start_date DESC');
    console.log('\nFinal academic_years count:', verifyResult.rows.length);
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.start_date} to ${row.end_date}), tenant: ${row.tenant_id}`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    console.log('Done');
  }
}

runMigration();
