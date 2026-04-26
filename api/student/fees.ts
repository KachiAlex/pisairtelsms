import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // TODO: Fetch actual fee data from database filtered by studentId
    // For now, return mock data
    const summary: FeeSummary = {
      totalFees: 150000,
      paidAmount: 150000,
      balance: 0,
      status: 'paid',
      dueDate: '2025-03-31',
    };

    const payments: Payment[] = [
      {
        date: '2025-01-15',
        amount: 75000,
        method: 'Bank Transfer',
        reference: 'TRF-2025-001',
        receipt: 'RCP-2025-001',
      },
      {
        date: '2025-01-20',
        amount: 75000,
        method: 'Bank Transfer',
        reference: 'TRF-2025-002',
        receipt: 'RCP-2025-002',
      },
    ];

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
