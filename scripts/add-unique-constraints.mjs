import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // channel_health unique constraint
    const chk1 = await client.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'channel_health_tenant_channel_unique'
    `);
    if (chk1.rowCount === 0) {
      await client.query(`ALTER TABLE channel_health ADD CONSTRAINT channel_health_tenant_channel_unique UNIQUE (tenant_id, channel)`);
      console.log('Added unique constraint to channel_health');
    } else {
      console.log('channel_health constraint already exists');
    }

    // reviewer_workloads unique constraint
    const chk2 = await client.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'reviewer_workloads_tenant_reviewer_unique'
    `);
    if (chk2.rowCount === 0) {
      await client.query(`ALTER TABLE reviewer_workloads ADD CONSTRAINT reviewer_workloads_tenant_reviewer_unique UNIQUE (tenant_id, reviewer)`);
      console.log('Added unique constraint to reviewer_workloads');
    } else {
      console.log('reviewer_workloads constraint already exists');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
