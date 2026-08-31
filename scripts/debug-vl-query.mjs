import { db } from '@vercel/postgres'

async function check() {
  // Check staff table columns
  const r1 = await db.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'staff' ORDER BY ordinal_position
  `)
  console.log('--- staff columns ---')
  console.table(r1.rows)

  // Try the exact query the API runs
  try {
    const r2 = await db.query(`
      SELECT vc.*, s.name as subject_name, c.name as class_arm_name,
             st.name as teacher_name
      FROM virtual_classrooms vc
      LEFT JOIN subjects s ON s.id::text = vc.subject_id
      LEFT JOIN classes c ON c.id::text = vc.class_arm_id
      LEFT JOIN staff st ON st.id = vc.teacher_id
      WHERE vc.tenant_id = 'default-tenant'
      ORDER BY vc.created_at DESC
      LIMIT 1
    `)
    console.log('--- query result ---')
    console.log('rows:', r2.rows.length)
    if (r2.rows[0]) console.log('first row keys:', Object.keys(r2.rows[0]).join(', '))
  } catch (e) {
    console.error('--- query error ---')
    console.error(e.message)
  }

  // Check what tenant_ids exist in virtual_classrooms
  const r3 = await db.query(`SELECT DISTINCT tenant_id FROM virtual_classrooms`)
  console.log('--- tenant_ids in virtual_classrooms ---')
  console.table(r3.rows)

  // Check what tenant_ids exist in staff
  const r4 = await db.query(`SELECT DISTINCT tenant_id FROM staff LIMIT 5`)
  console.log('--- tenant_ids in staff ---')
  console.table(r4.rows)
}

check().catch(e => console.error(e.message))
