import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { createPayrollRun, submitRunForApproval, disburseRun } from '../tenant/_lib/payroll.js'

const CRON_SECRET = process.env.CRON_SECRET
const ACTOR = 'scheduler'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface ScheduleRow {
  id: string
  tenant_id: string
  name: string
  frequency: string
  day_of_month: number | null
  day_of_week: number | null
  auto_generate: boolean
  auto_disburse: boolean
  staff_ids: unknown
}

function isDueToday(schedule: ScheduleRow, today: Date, lastRunAt: Date | null): boolean {
  const frequency = schedule.frequency || 'monthly'

  if (frequency === 'weekly' || frequency === 'bi_weekly') {
    if (today.getDay() !== (schedule.day_of_week ?? 5)) return false
    if (frequency === 'weekly') return true
    // Bi-weekly: fire only if no run for this schedule in the last 13 days
    if (!lastRunAt) return true
    return today.getTime() - lastRunAt.getTime() >= 13 * 24 * 60 * 60 * 1000
  }

  // monthly / custom: fire on the configured day, clamped to the last day
  // of shorter months (e.g. day 31 fires on the 30th in September)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return today.getDate() === Math.min(schedule.day_of_month || 25, lastDay)
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Unlike cleanup endpoints, payroll moves money — CRON_SECRET must be set
  const authHeader = req.headers.authorization
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const today = new Date()
  const month = MONTHS[today.getMonth()]
  const year = today.getFullYear()

  const generated: Array<{ scheduleId: string; tenantId: string; runId: string; staff: number }> = []
  const skipped: Array<{ scheduleId: string; tenantId: string; reason: string }> = []
  const disbursed: Array<{ runId: string; tenantId: string; success: boolean; detail?: string }> = []
  const errors: Array<{ scheduleId?: string; tenantId?: string; error: string }> = []

  try {
    const schedules = await sql`
      SELECT id, tenant_id, name, frequency, day_of_month, day_of_week, auto_generate, auto_disburse, staff_ids
      FROM payroll_schedules
      WHERE is_active = true
    `

    for (const schedule of schedules.rows as ScheduleRow[]) {
      try {
        // Last run generated under this schedule — for bi-weekly spacing + reporting
        const lastRun = await sql`
          SELECT MAX(run_date) AS last_run_at FROM payroll_runs
          WHERE schedule_id = ${schedule.id} AND tenant_id = ${schedule.tenant_id}
        `
        const lastRunAt = lastRun.rows[0]?.last_run_at ? new Date(lastRun.rows[0].last_run_at) : null

        if (!isDueToday(schedule, today, lastRunAt)) {
          skipped.push({ scheduleId: schedule.id, tenantId: schedule.tenant_id, reason: 'not due today' })
          continue
        }

        if (!schedule.auto_generate) {
          skipped.push({ scheduleId: schedule.id, tenantId: schedule.tenant_id, reason: 'auto_generate off — due today but not generating' })
          continue
        }

        // Staff already covered by another regular run for this period (under a
        // different schedule or a manual run) must not be paid twice
        const covered = await sql`
          SELECT DISTINCT i.staff_id
          FROM payroll_runs r
          JOIN payroll_run_items i ON i.run_id = r.id
          WHERE r.tenant_id = ${schedule.tenant_id} AND r.month = ${month} AND r.year = ${year}
            AND r.status != 'failed' AND COALESCE(r.run_type, 'regular') = 'regular'
            AND COALESCE(r.schedule_id, '') <> ${schedule.id}
        `
        const coveredIds = new Set((covered.rows as Array<{ staff_id: string }>).map(r => r.staff_id))

        const payGroup = Array.isArray(schedule.staff_ids) ? (schedule.staff_ids as string[]) : []
        let targetIds = payGroup
        if (targetIds.length === 0) {
          const all = await sql`
            SELECT id FROM staff WHERE tenant_id = ${schedule.tenant_id} AND status = 'active' AND salary IS NOT NULL AND salary > 0
          `
          targetIds = (all.rows as Array<{ id: string }>).map(r => r.id)
        }
        const overlap = targetIds.filter(id => coveredIds.has(id))
        if (overlap.length > 0) {
          skipped.push({
            scheduleId: schedule.id, tenantId: schedule.tenant_id,
            reason: `${overlap.length} staff already covered by another run for ${month} ${year}`,
          })
          continue
        }

        const run = await createPayrollRun(month, year, schedule.id, schedule.tenant_id, {
          actor: ACTOR,
          staffIds: payGroup.length > 0 ? payGroup : undefined,
          runName: `${schedule.name} — ${month} ${year}`,
        })
        await submitRunForApproval(run.id, schedule.tenant_id, ACTOR)
        generated.push({ scheduleId: schedule.id, tenantId: schedule.tenant_id, runId: run.id, staff: run.totalStaff })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        // A pre-existing run for the period is a skip, not a failure
        if (message.includes('already exists')) {
          skipped.push({ scheduleId: schedule.id, tenantId: schedule.tenant_id, reason: message })
        } else {
          errors.push({ scheduleId: schedule.id, tenantId: schedule.tenant_id, error: message })
        }
      }
    }

    // Auto-disburse: approved runs under schedules that opted in. Only in
    // gateway mode — silently marking items paid with no money movement is
    // never automated; manual confirmation stays a human decision.
    const gatewayConfigured = !!(process.env.PAYSTACK_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY)
    if (gatewayConfigured) {
      const approvedRuns = await sql`
        SELECT r.id, r.tenant_id FROM payroll_runs r
        JOIN payroll_schedules s ON s.id = r.schedule_id AND s.tenant_id = r.tenant_id
        WHERE r.status = 'approved' AND s.auto_disburse = true AND s.is_active = true
      `
      for (const row of approvedRuns.rows as Array<{ id: string; tenant_id: string }>) {
        const result = await disburseRun(row.id, row.tenant_id, { actor: ACTOR })
        disbursed.push({ runId: row.id, tenantId: row.tenant_id, success: result.success, detail: result.error })
      }
    }

    console.log(
      `[run-payroll-schedules] generated=${generated.length} skipped=${skipped.length} ` +
      `disbursed=${disbursed.length} errors=${errors.length}`
    )

    return res.status(200).json({
      success: errors.length === 0,
      period: { month, year },
      gatewayConfigured,
      generated,
      skipped,
      disbursed,
      errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[run-payroll-schedules] Failed:', message)
    return res.status(500).json({ success: false, error: message })
  }
}
