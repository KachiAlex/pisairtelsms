import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'

const retentionDays = Number(process.env.VIOLATION_RETENTION_DAYS ?? 30)
const CRON_SECRET = process.env.CRON_SECRET

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await sql`
      DELETE FROM parent_child_violations
      WHERE last_attempt < NOW() - INTERVAL ${retentionDays} DAY
      RETURNING parent_id, child_id, context, attempts
    `

    console.log(`[cleanup-violations] Cleaned ${result.rowCount} records older than ${retentionDays} days`)

    return res.status(200).json({
      success: true,
      cleaned: result.rowCount,
      retentionDays
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cleanup-violations] Failed:', message)
    return res.status(500).json({
      success: false,
      error: message
    })
  }
}
