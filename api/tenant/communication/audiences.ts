import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase, queryOne } from '../cbt/_lib/db.js'
import { fetchStudentCount } from '../_lib/students.js'
import { fetchParentCount } from '../_lib/parents.js'
import { fetchStaffCount } from '../_lib/staff.js'

function getTenantId(req: VercelRequest): string {
  return (req.headers['x-tenant-id'] as string) || process.env.DEFAULT_TENANT_ID || 'default-tenant'
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenantId = getTenantId(req)

  try {
    initializeDatabase()

    // Debug: verify table exists and has data
    const tableCheck = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') as exists`,
      []
    )
    console.log('[audiences] students table exists:', tableCheck?.exists)

    const sample = await queryOne<{ id: string; tenant_id: string; name: string }>(
      `SELECT id, tenant_id, name FROM students LIMIT 1`,
      []
    )
    console.log('[audiences] sample student:', sample)

    const [studentCount, parentCount, staffCount] = await Promise.all([
      fetchStudentCount(tenantId),
      fetchParentCount(tenantId),
      fetchStaffCount(),
    ])

    console.log(`[audiences] tenant=${tenantId} students=${studentCount} parents=${parentCount} staff=${staffCount}`)

    const allCount = studentCount + parentCount + staffCount

    const segments = [
      {
        id: 'all',
        label: 'All guardians, students & staff',
        reach: `${allCount.toLocaleString()} recipients`,
        count: allCount,
      },
      {
        id: 'students',
        label: 'All students',
        reach: `${studentCount.toLocaleString()} recipients`,
        count: studentCount,
      },
      {
        id: 'parents',
        label: 'All parents / guardians',
        reach: `${parentCount.toLocaleString()} recipients`,
        count: parentCount,
      },
      {
        id: 'staff',
        label: 'All staff',
        reach: `${staffCount.toLocaleString()} recipients`,
        count: staffCount,
      },
    ]

    return res.status(200).json({
      success: true,
      data: segments,
      counts: { all: allCount, students: studentCount, parents: parentCount, staff: staffCount },
    })
  } catch (error) {
    console.error('Error fetching audience counts:', error)
    return res.status(500).json({ error: 'Failed to fetch audience counts' })
  }
}
