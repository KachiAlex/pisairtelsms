import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // Check students table structure
    const students = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position"
    );
    console.log('students columns:', students.rows.map(x => x.column_name + ':' + x.data_type).join(', '));

    // Check if there's a tenant_id pattern
    const tenantCols = await client.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'tenant_id' ORDER BY table_name"
    );
    console.log('\nTables with tenant_id:', tenantCols.rows.map(r => r.table_name).join(', '));

    // Check migrations table
    const migrations = await client.query('SELECT * FROM migrations ORDER BY id');
    console.log('\nMigrations applied:', migrations.rows.map(r => r.version || r.name || r.id).join(', '));

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
