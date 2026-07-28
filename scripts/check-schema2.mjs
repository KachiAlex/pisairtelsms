import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false, require: true },
});

async function run() {
  const client = await pool.connect();
  try {
    // Check students table structure
    const students = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position"
    );
    if (students.rows.length > 0) {
      console.log('students columns:', students.rows.map(x => x.column_name + ':' + x.data_type).join(', '));
    } else {
      console.log('students table: not found or empty');
    }

    // Check migrations table
    try {
      const migrations = await client.query('SELECT * FROM migrations ORDER BY id LIMIT 10');
      console.log('Migrations:', JSON.stringify(migrations.rows));
    } catch(e) {
      console.log('migrations table error:', e.message);
    }

    // Check exams table for tenant_id pattern
    const exams = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exams' ORDER BY ordinal_position"
    );
    console.log('exams columns:', exams.rows.map(x => x.column_name + ':' + x.data_type).join(', '));

    // Check foreign key constraints on exams
    const fks = await client.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'exams'
    `);
    console.log('exams FKs:', JSON.stringify(fks.rows));

    // Check fee structures with no fee items
    const feeStructures = await client.query(`
      SELECT fs.id, fs.name, fs.academic_session, fs.term, 
             COUNT(fi.id) as fee_items_count
      FROM fee_structures fs
      LEFT JOIN fee_items fi ON fs.id = fi.fee_structure_id
      GROUP BY fs.id, fs.name, fs.academic_session, fs.term
      ORDER BY fs.created_at DESC
    `);
    console.log('\nFee Structures:');
    console.table(feeStructures.rows);
    
    const emptyStructures = feeStructures.rows.filter(row => parseInt(row.fee_items_count) === 0);
    if (emptyStructures.length > 0) {
      console.log('\n⚠️  Structures with no fee items (should be deleted):');
      console.table(emptyStructures);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
