import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function cleanup() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false, require: true }
  });

  try {
    await client.connect();
    console.log('Connected');

    // Delete duplicates, keep one per name/tenant
    const result = await client.query(`
      DELETE FROM academic_years 
      WHERE ctid NOT IN (
        SELECT MIN(ctid) 
        FROM academic_years 
        GROUP BY name, tenant_id
      )
    `);
    console.log('Deleted duplicates:', result.rowCount);

    // Show remaining
    const remaining = await client.query('SELECT id, name, tenant_id FROM academic_years');
    console.log('Remaining rows:', remaining.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

cleanup();
