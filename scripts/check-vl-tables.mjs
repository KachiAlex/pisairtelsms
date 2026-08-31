import { db } from '@vercel/postgres'

async function check() {
  const r = await db.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN (
      'virtual_classrooms','lessons','assignments','course_materials',
      'private_lesson_requests','private_lesson_rates','private_lesson_payments',
      'virtual_learning_settings','virtual_learning_notifications',
      'virtual_learning_consents','virtual_attendance'
    ) 
    ORDER BY table_name
  `)
  console.log('Tables found:', r.rows.map(r => r.table_name).join(', '))
  
  const missing = [
    'virtual_classrooms','lessons','assignments','course_materials',
    'private_lesson_requests','private_lesson_rates','private_lesson_payments',
    'virtual_learning_settings','virtual_learning_notifications',
    'virtual_learning_consents','virtual_attendance'
  ].filter(t => !r.rows.some(r => r.table_name === t))
  
  if (missing.length) {
    console.log('Missing:', missing.join(', '))
  } else {
    console.log('All tables present!')
  }
}

check().catch(e => console.error(e.message))
