import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_BIlfNjZg2Ko7@ep-restless-union-ai4sgr7d-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', 
  ssl: { rejectUnauthorized: false } 
});

pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name', ['public'])
  .then(r => { 
    console.log('Tables:', r.rows.map(t => t.table_name).join(', ')); 
    pool.end(); 
  })
  .catch(e => { 
    console.error(e); 
    pool.end(); 
  });
