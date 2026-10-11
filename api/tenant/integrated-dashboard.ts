import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { fetchTenantSettings } from './_lib/tenant-settings.js'

interface RecentActivityItem {
  type: string
  message: string
  timestamp: string
}

interface ClassSummary {
  className: string
  studentCount: number
  avgScore: number
}

interface RevenueMonth {
  month: string
  amount: number
}

interface DashboardStats {
  totalStudents: number
  totalTeachers: number
  totalExams: number
  activeExams: number
  classesCount: number
  recentActivity: RecentActivityItem[]
  classSummaries: ClassSummary[]
  systemHealth: {
    studentsApi: boolean
    teachersApi: boolean
    examsApi: boolean
    database: boolean
  }
  revenueByMonth: RevenueMonth[]
  setup: SetupSignals
}

interface SetupSignals {
  sessionTermSet: boolean
  classesDefined: number
  totalStaff: number
  subjectsCount: number
  feeStructuresCount: number
  gradingConfigured: boolean
  leadsCount: number
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require authentication - only staff or tenant_admin can access tenant dashboard
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  // Total students
  const totalStudents = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM students WHERE tenant_id = ${tenantId}`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Total teachers (staff with role containing 'teacher')
  const totalTeachers = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM staff WHERE tenant_id = ${tenantId} AND role ILIKE '%teacher%'`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Total exams scheduled for this tenant
  const totalExams = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM exams WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Active exams — Scheduled or Ongoing
  const activeExams = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM exams WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND status IN ('Scheduled','Ongoing')`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Classes count (distinct class values in students)
  const classesCount = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(DISTINCT class)::int AS count FROM students WHERE tenant_id = ${tenantId}`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Class summaries — group students by class, join avg scores
  const classSummaries: ClassSummary[] = await safeQuery(async () => {
    const r = await sql`
      SELECT
        s.class AS class_name,
        COUNT(s.id)::int AS student_count,
        COALESCE(AVG(sc.total_score), 0)::numeric(5,2) AS avg_score
      FROM students s
      LEFT JOIN student_scores sc ON sc.class = s.class AND sc.tenant_id = s.tenant_id
      WHERE s.tenant_id = ${tenantId}
      GROUP BY s.class
      ORDER BY s.class
    `
    return r.rows.map((row: any) => ({
      className: row.class_name,
      studentCount: row.student_count,
      avgScore: parseFloat(row.avg_score),
    }))
  }, [])

  // Recent activity — last 10 rows across students, attendance_records, announcements
  const recentActivity: RecentActivityItem[] = await safeQuery(async () => {
    const items: RecentActivityItem[] = []

    const students = await safeQuery(async () => {
      const r = await sql`
        SELECT name, created_at FROM students WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 5
      `
      return r.rows
    }, [] as { name: string; created_at: Date }[])

    for (const s of students) {
      items.push({
        type: 'student_enrolled',
        message: `Student ${s.name} was enrolled`,
        timestamp: s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at),
      })
    }

    const attendance = await safeQuery(async () => {
      const r = await sql`
        SELECT student_id, status, created_at FROM attendance_records WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 5
      `
      return r.rows
    }, [] as { student_id: string; status: string; created_at: Date }[])

    for (const a of attendance) {
      items.push({
        type: 'attendance_recorded',
        message: `Attendance recorded: ${a.student_id} — ${a.status}`,
        timestamp: a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at),
      })
    }

    const announcements = await safeQuery(async () => {
      const r = await sql`
        SELECT title, created_at FROM announcements WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 5
      `
      return r.rows
    }, [] as { title: string; created_at: Date }[])

    for (const ann of announcements) {
      items.push({
        type: 'announcement',
        message: `Announcement: ${ann.title}`,
        timestamp: ann.created_at instanceof Date ? ann.created_at.toISOString() : String(ann.created_at),
      })
    }

    // Sort by timestamp desc, take top 10
    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  }, [])

  // Revenue by month — SUM(paid) from fee_records last 6 months
  const revenueByMonth: RevenueMonth[] = await safeQuery(async () => {
    const r = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        SUM(paid)::numeric(12,2) AS amount
      FROM fee_records
      WHERE tenant_id = ${tenantId} AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `
    return r.rows.map((row: any) => ({
      month: row.month,
      amount: parseFloat(row.amount),
    }))
  }, [])

  // Onboarding signals — each powers one step of the "Get your school set up"
  // checklist. All are measured against real rows so steps tick themselves off.
  const tenantSettings = await safeQuery(async () => fetchTenantSettings(tenantId), null)
  const sessionTermSet = Boolean(tenantSettings?.currentSession && tenantSettings?.currentTerm)

  const classesDefined = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM classes WHERE tenant_id = ${tenantId} AND deleted_at IS NULL`
    return r.rows[0]?.count ?? 0
  }, 0)

  const totalStaff = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM staff WHERE tenant_id = ${tenantId}`
    return r.rows[0]?.count ?? 0
  }, 0)

  const subjectsCount = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM subjects WHERE tenant_id = ${tenantId}`
    return r.rows[0]?.count ?? 0
  }, 0)

  const feeStructuresCount = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM fee_structures WHERE tenant_id = ${tenantId}`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Results can't compute until a grading scale or CA weighting exists.
  const gradingConfigured = await safeQuery(async () => {
    const r = await sql`
      SELECT (
        (SELECT COUNT(*) FROM grading_scales WHERE tenant_id = ${tenantId}) +
        (SELECT COUNT(*) FROM ca_config WHERE tenant_id = ${tenantId})
      )::int AS count
    `
    return (r.rows[0]?.count ?? 0) > 0
  }, false)

  // First lead means a public application/inquiry link was shared and used.
  const leadsCount = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM leads WHERE tenant_id = ${tenantId}`
    return r.rows[0]?.count ?? 0
  }, 0)

  const stats: DashboardStats = {
    totalStudents,
    totalTeachers,
    totalExams,
    activeExams,
    classesCount,
    recentActivity,
    classSummaries,
    systemHealth: {
      studentsApi: true,
      teachersApi: true,
      examsApi: true,
      database: true,
    },
    revenueByMonth,
    setup: {
      sessionTermSet,
      classesDefined,
      totalStaff,
      subjectsCount,
      feeStructuresCount,
      gradingConfigured,
      leadsCount,
    },
  }

  return res.status(200).json({ data: stats })
}
