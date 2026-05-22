import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStudentFeeSummary, getStudentPayments, getFeeAssignments } from '../../api/tenant/finance/_lib/fee-assignments.js';
import { getFeeStructureWithItems } from '../../api/tenant/finance/_lib/fee-structures.js';

interface FeeSummary {
  totalFees: number;
  paidAmount: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: string;
}

interface Payment {
  date: string;
  amount: number;
  method: string;
  reference: string;
  receipt: string;
}

interface PaymentPlan {
  id: string;
  installments: number;
  dueDate: string;
  amount: number;
}

interface StudentFeesResponse {
  summary: FeeSummary;
  payments: Payment[];
  paymentPlan: PaymentPlan | null;
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentId = extractStudentIdFromToken(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    // Fetch fee summary from database
    const feeSummary = await getStudentFeeSummary(studentId);

    // Fetch fee assignments to get due date
    const assignments = await getFeeAssignments(studentId);
    const dueDate = assignments.length > 0 ? assignments[0].dueDate : '2025-03-31';

    const summary: FeeSummary = {
      totalFees: feeSummary.totalFees,
      paidAmount: feeSummary.totalPaid,
      balance: feeSummary.totalBalance,
      status: feeSummary.status === 'paid' ? 'paid' : feeSummary.status === 'partial' ? 'partial' : 'unpaid',
      dueDate,
    };

    // Fetch payments from database
    const studentPayments = await getStudentPayments(studentId);
    const payments: Payment[] = studentPayments.map(p => ({
      date: p.paidAt.split('T')[0],
      amount: p.amount,
      method: p.paymentMethod,
      reference: p.reference || '',
      receipt: p.receiptUrl || '',
    }));

    const response: StudentFeesResponse = {
      summary,
      payments,
      paymentPlan: null,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return res.status(500).json({ error: 'Failed to fetch fees information' });
  }
}
