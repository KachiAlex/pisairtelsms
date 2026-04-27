import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const childId = req.query.childId as string
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    const response = {
      summary: {
        totalFees: 500000,
        paidAmount: 450000,
        outstandingBalance: 50000,
        dueDate: '2025-02-28',
        status: 'partial' as const,
      },
      feeStructure: [
        { id: '1', name: 'Tuition', amount: 300000, dueDate: '2025-01-31', status: 'paid' as const },
        { id: '2', name: 'Accommodation', amount: 100000, dueDate: '2025-01-31', status: 'paid' as const },
        { id: '3', name: 'Utilities', amount: 50000, dueDate: '2025-02-28', status: 'pending' as const },
        { id: '4', name: 'Activities', amount: 50000, dueDate: '2025-02-28', status: 'pending' as const },
      ],
      paymentHistory: [
        {
          id: '1',
          date: '2025-01-15',
          amount: 300000,
          method: 'Bank Transfer',
          reference: 'TRF-001',
          receiptUrl: '/receipts/receipt-001.pdf',
          status: 'completed' as const,
        },
        {
          id: '2',
          date: '2025-01-10',
          amount: 150000,
          method: 'Card',
          reference: 'CARD-001',
          receiptUrl: '/receipts/receipt-002.pdf',
          status: 'completed' as const,
        },
      ],
      paymentPlans: [
        {
          id: '1',
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          installments: [
            { id: '1', dueDate: '2025-01-31', amount: 166667, status: 'paid' as const, paidDate: '2025-01-15' },
            { id: '2', dueDate: '2025-02-28', amount: 166667, status: 'pending' as const },
            { id: '3', dueDate: '2025-03-31', amount: 166666, status: 'pending' as const },
          ],
        },
      ],
      exemptions: [
        {
          id: '1',
          type: 'Scholarship',
          amount: 50000,
          reason: 'Academic Excellence',
          approvedDate: '2025-01-01',
        },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching fees:', error)
    return res.status(500).json({ error: 'Failed to fetch fees data' })
  }
}
