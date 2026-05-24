import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', 
  ssl: { rejectUnauthorized: false } 
});

async function checkTaskTables() {
  const client = await pool.connect();
  
  try {
    const tables = ['tasks', 'task_comments', 'notifications', 'reminders', 'workstreams', 'squad_assignments'];
    
    for (const table of tables) {
      console.log(`\n=== ${table} ===`);
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      if (result.rows.length === 0) {
        console.log('Table does not exist');
      } else {
        result.rows.forEach(row => {
          console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
      }
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkTaskTables().catch(e => {
  console.error(e);
  process.exit(1);
});
