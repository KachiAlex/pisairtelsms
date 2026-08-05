import { db } from '@vercel/postgres'

async function check() {
  const r = await db.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('subjects','classes','staff','virtual_classrooms','lessons','course_materials','assignments','private_lesson_requests','private_lesson_rates') 
    AND column_name IN ('id','tenant_id','subject_id','class_arm_id','teacher_id','classroom_id','student_ids','parent_id','student_id','request_id')
    ORDER BY table_name, column_name
  `)
  console.table(r.rows)
}

check().catch(e => console.error(e.message))
