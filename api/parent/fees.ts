import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' })

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) return res.status(401).json({ error: 'Unauthorized: Invalid token' })

    const childId = req.query.childId as string
    if (!childId) return res.status(400).json({ error: 'Bad request: childId is required' })

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    return res.status(200).json({
      summary: {
        totalFees: 150000,
        paidAmount: 150000,
        outstandingBalance: 0,
        dueDate: '2025-02-28',
        status: 'paid',
      },
      feeStructure: [
        { id: '1', name: 'Tuition Fee', amount: 100000, dueDate: '2025-01-31', status: 'paid' },
        { id: '2', name: 'Development Levy', amount: 30000, dueDate: '2025-01-31', status: 'paid' },
        { id: '3', name: 'Sports Fee', amount: 20000, dueDate: '2025-01-31', status: 'paid' },
      ],
      paymentHistory: [
        {
          id: 'pay-1',
          date: '2025-01-10',
          amount: 150000,
          method: 'Bank Transfer',
          reference: 'TXN-2025-001',
          receiptUrl: '/receipts/TXN-2025-001.pdf',
          status: 'completed',
        },
      ],
      paymentPlans: [],
      exemptions: [],
    })
  } catch (error) {
    console.error('Error fetching fees:', error)
    return res.status(500).json({ error: 'Failed to fetch fee data' })
  }
}
