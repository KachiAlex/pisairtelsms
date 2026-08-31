import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkData() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false, require: true }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check academic_years table
    console.log('=== academic_years table ===');
    const yearsResult = await client.query('SELECT * FROM academic_years ORDER BY start_date DESC');
    console.log('Count:', yearsResult.rows.length);
    yearsResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Tenant: ${row.tenant_id}, Name: ${row.name}, Current: ${row.is_current}`);
    });

    // Check timetable_terms table
    console.log('\n=== timetable_terms table ===');
    const termsResult = await client.query('SELECT * FROM timetable_terms ORDER BY start_date DESC');
    console.log('Count:', termsResult.rows.length);
    termsResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Tenant: ${row.tenant_id}, Name: ${row.name}, Year: ${row.academic_year}`);
    });

    // Check schema_migrations
    console.log('\n=== schema_migrations table ===');
    const migResult = await client.query('SELECT * FROM schema_migrations ORDER BY version');
    console.log('Count:', migResult.rows.length);
    migResult.rows.forEach(row => {
      console.log(`  Version: ${row.version}, Description: ${row.description}`);
    });

    // Check tenant IDs
    console.log('\n=== Unique tenant_ids in academic_years ===');
    const tenantResult = await client.query('SELECT DISTINCT tenant_id FROM academic_years');
    tenantResult.rows.forEach(row => {
      console.log(`  ${row.tenant_id}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkData();
