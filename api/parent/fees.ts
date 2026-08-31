import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../_lib/auth-middleware.js'
import { verifyParentChildRelationship } from '../../src/lib/parentAuth'
import { getStudentFeeSummary, getStudentPayments, getFeeAssignments } from '../../api/tenant/finance/_lib/fee-assignments.js'
import { getFeeStructureWithItems } from '../../api/tenant/finance/_lib/fee-structures.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const decoded = await requireRole(req, res, ['parent'])
    if (!decoded) return

    const parentInfo = { parentId: decoded.parentId, childrenIds: decoded.childrenIds || [], role: decoded.role }

    const childId = req.query.childId as string
    if (!childId) {
      return res.status(400).json({ error: 'Bad request: childId is required' })
    }

    if (!verifyParentChildRelationship(parentInfo.parentId, childId, parentInfo.childrenIds)) {
      return res.status(403).json({ error: 'Forbidden: Child not linked to your account' })
    }

    // Fetch fee summary from database
    const feeSummary = await getStudentFeeSummary(childId)

    // Fetch fee assignments to get due date and fee structure details
    const assignments = await getFeeAssignments(childId)
    const dueDate = assignments.length > 0 ? assignments[0].dueDate : '2025-02-28'

    // Build fee structure breakdown
    let feeStructure: Array<{ id: string; name: string; amount: number; dueDate: string; status: 'paid' | 'pending' | 'overdue' }> = []
    if (assignments.length > 0) {
      for (const assignment of assignments) {
        const structure = await getFeeStructureWithItems(assignment.feeStructureId)
        if (structure && structure.feeItems) {
          const totalPaid = assignment.totalPaid
          const totalAmount = assignment.totalAmount
          const isPaid = totalPaid >= totalAmount
          
          feeStructure = structure.feeItems.map(item => ({
            id: item.id,
            name: item.category,
            amount: item.amount,
            dueDate: dueDate,
            status: isPaid ? 'paid' : 'pending' as 'paid' | 'pending' | 'overdue',
          }))
        }
      }
    }

    // Fetch payments from database
    const studentPayments = await getStudentPayments(childId)
    const paymentHistory = studentPayments.map(p => ({
      id: p.id,
      date: p.paidAt.split('T')[0],
      amount: p.amount,
      method: p.paymentMethod,
      reference: p.reference || '',
      receiptUrl: p.receiptUrl || '',
      status: 'completed' as const,
    }))

    const response = {
      summary: {
        totalFees: feeSummary.totalFees,
        paidAmount: feeSummary.totalPaid,
        outstandingBalance: feeSummary.totalBalance,
        dueDate,
        status: feeSummary.status as 'paid' | 'partial' | 'overdue',
      },
      feeStructure,
      paymentHistory,
      paymentPlans: [],
      exemptions: [],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching fees:', error)
    return res.status(500).json({ error: 'Failed to fetch fees data' })
  }
}
