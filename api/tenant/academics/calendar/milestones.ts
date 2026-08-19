import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    try {
      // In a real app, you would have a milestones table. 
      // For now, we'll derive some from the existing timetable calendar data 
      // or use a mock fallback if that table doesn't exist yet.
      
      const result = await sql`
        SELECT id, name as title, TO_CHAR(start_date, 'DD Mon') as date, 
               'Admin' as owner, 'Live' as status
        FROM calendar_terms
        WHERE tenant_id = ${tenantId}
        UNION ALL
        SELECT id, name as title, TO_CHAR(start_date, 'DD Mon') as date, 
               'System' as owner, 'Locked' as status
        FROM calendar_holidays
        WHERE tenant_id = ${tenantId}
        ORDER BY date ASC
      `
      
      return res.status(200).json({ data: result.rows })
    } catch (error) {
      // Fallback for demo if tables don't exist
      return res.status(200).json({ 
        data: [
          { title: 'First Term Resumption', date: '01 Sep', owner: 'Principal', status: 'Live' },
          { title: 'Mid-term Assessment', date: '15 Oct', owner: 'VP Academics', status: 'Tentative' },
          { title: 'Inter-house Sports', date: '20 Nov', owner: 'Sports Director', status: 'High priority' },
        ] 
      })
    }
  }

  if (req.method === 'POST') {
    // Logic to save a custom milestone could go here
    return res.status(201).json({ success: true })
  }

  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
