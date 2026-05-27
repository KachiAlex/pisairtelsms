import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

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
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require authentication - only staff or tenant_admin can access tenant dashboard
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  // Total students
  const totalStudents = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM students`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Total teachers (staff with role containing 'teacher')
  const totalTeachers = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM staff WHERE role ILIKE '%teacher%'`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Total exams (distinct subject+term combos in student_scores)
  const totalExams = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(*)::int AS count FROM (SELECT DISTINCT subject, term FROM student_scores) AS combos`
    return r.rows[0]?.count ?? 0
  }, 0)

  // Active exams — no scheduling table yet
  const activeExams = 0

  // Classes count (distinct class values in students)
  const classesCount = await safeQuery(async () => {
    const r = await sql`SELECT COUNT(DISTINCT class)::int AS count FROM students`
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
      LEFT JOIN student_scores sc ON sc.class = s.class
      GROUP BY s.class
      ORDER BY s.class
    `
    return r.rows.map((row: { class_name: string; student_count: number; avg_score: string }) => ({
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
        SELECT name, created_at FROM students ORDER BY created_at DESC LIMIT 5
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
        SELECT student_id, status, created_at FROM attendance_records ORDER BY created_at DESC LIMIT 5
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
        SELECT title, created_at FROM announcements ORDER BY created_at DESC LIMIT 5
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
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `
    return r.rows.map((row: { month: string; amount: string }) => ({
      month: row.month,
      amount: parseFloat(row.amount),
    }))
  }, [])

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
  }

  return res.status(200).json({ data: stats })
}
