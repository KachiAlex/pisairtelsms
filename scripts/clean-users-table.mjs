import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function cleanUsers() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false, require: true }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Count users before
    const countRes = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(countRes.rows[0].count, 10);
    console.log(`Found ${userCount} user(s) in the database.`);

    if (userCount === 0) {
      console.log('Users table is already empty. Nothing to do.');
      return;
    }

    // Show foreign-key dependencies that will be cascade-deleted
    const fkRes = await client.query(`
      SELECT
        tc.table_name AS dependent_table,
        kcu.column_name AS fk_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public'
    `);

    if (fkRes.rows.length > 0) {
      console.log('\nWARNING: The following tables have foreign-key references to users:');
      for (const row of fkRes.rows) {
        console.log(`  - ${row.dependent_table}.${row.fk_column}`);
      }
      console.log('TRUNCATE ... CASCADE will DELETE rows in those tables too.\n');
    }

    // Execute truncate with cascade
    console.log('Truncating users table with CASCADE...');
    await client.query('TRUNCATE TABLE users CASCADE');
    console.log('Done. Users table (and dependent rows) have been cleared.');

    // Verify
    const verifyRes = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Users remaining: ${verifyRes.rows[0].count}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanUsers();
