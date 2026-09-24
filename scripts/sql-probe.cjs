const pg = require('pg')
async function main() {
  const p = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const r = await p.query(
      `SELECT ps.id::text, ps.student_id, ps.captured_at::text, s.name AS student_name, s.admission_no
       FROM proctoring_snapshots ps
       LEFT JOIN students s ON s.id::text = ps.student_id AND s.tenant_id = $1
       WHERE ps.exam_id = $2 ORDER BY ps.captured_at DESC LIMIT 300`,
      ['f038d6a2-8957-45e6-a716-393dfd69173b', '3174f589-ce8a-4442-b12a-9ac382cfd796']
    )
    console.log('snapshots query OK, rows:', r.rows.length)
    const img = await p.query(
      'SELECT image_data FROM proctoring_snapshots WHERE id = $1 AND exam_id = $2 LIMIT 1',
      ['00000000-0000-0000-0000-000000000000', '3174f589-ce8a-4442-b12a-9ac382cfd796']
    )
    console.log('image query OK, rows:', img.rows.length)
  } catch (e) {
    console.log('SQL ERR:', e.message)
  }
  await p.end()
}
main()
