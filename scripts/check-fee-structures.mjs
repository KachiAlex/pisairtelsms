import { sql } from '@vercel/postgres'

const result = await sql`
  SELECT id, name, academic_session, term, created_at 
  FROM fee_structures 
  ORDER BY created_at DESC 
  LIMIT 5
`

console.log('Fee Structures:')
console.table(result.rows)
