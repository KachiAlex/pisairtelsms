const { sql } = require('@vercel/postgres')

async function checkFeeStructures() {
  const structures = await sql`
    SELECT fs.id, fs.name, fs.academic_session, fs.term, 
           COUNT(fi.id) as fee_items_count
    FROM fee_structures fs
    LEFT JOIN fee_items fi ON fs.id = fi.fee_structure_id
    GROUP BY fs.id, fs.name, fs.academic_session, fs.term
    ORDER BY fs.created_at DESC
  `
  
  console.log('Fee Structures:')
  console.table(structures.rows)
  
  const emptyStructures = structures.rows.filter(row => row.fee_items_count === '0')
  if (emptyStructures.length > 0) {
    console.log('\nStructures with no fee items (should be deleted):')
    console.table(emptyStructures)
  }
}

checkFeeStructures().catch(console.error)
