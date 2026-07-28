import pg from 'pg'
const { Client } = pg

const retentionDays = Number(process.env.VIOLATION_RETENTION_DAYS ?? 30)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is required')
  process.exit(1)
}

async function runCleanup() {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    const result = await client.query(`
      DELETE FROM parent_child_violations
      WHERE last_attempt < NOW() - INTERVAL '${retentionDays} days'
      RETURNING parent_id, child_id, context, attempts
    `)
    console.log(`cleaned ${result.rowCount} violation records older than ${retentionDays} days`)
  } catch (error) {
    console.error('Failed to clean violation records:', error.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

await runCleanup()
