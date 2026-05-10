import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Tenant Classes API Endpoint
 * Returns all classes for the tenant (used in exam creation dropdowns)
 */

interface ClassInfo {
  id: string
  name: string
  arm: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId = req.headers['x-tenant-id'] as string

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // TODO: Fetch actual classes from database for this tenant
    // For now, return mock data that matches the expected format
    const classes: ClassInfo[] = [
      { id: 'class-1', name: 'SS 1', arm: 'A' },
      { id: 'class-2', name: 'SS 1', arm: 'B' },
      { id: 'class-3', name: 'SS 2', arm: 'A' },
      { id: 'class-4', name: 'SS 2', arm: 'B' },
      { id: 'class-5', name: 'SS 3', arm: 'A' },
      { id: 'class-6', name: 'SS 3', arm: 'B' },
      { id: 'class-7', name: 'JSS 1', arm: 'A' },
      { id: 'class-8', name: 'JSS 1', arm: 'B' },
      { id: 'class-9', name: 'JSS 2', arm: 'A' },
      { id: 'class-10', name: 'JSS 2', arm: 'B' },
      { id: 'class-11', name: 'JSS 3', arm: 'A' },
      { id: 'class-12', name: 'JSS 3', arm: 'B' },
    ]

    return res.status(200).json({ success: true, data: classes })
  } catch (error: any) {
    console.error('Error fetching classes:', error)
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch classes' })
  }
}
