import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false, require: true }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check timetable_terms columns
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'timetable_terms' 
      ORDER BY ordinal_position
    `);
    console.log('timetable_terms columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema();
