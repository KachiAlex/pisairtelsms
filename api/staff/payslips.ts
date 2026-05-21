import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Payslip {
  id: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: 'pending' | 'paid';
  paymentDate?: string;
}

interface PayslipsResponse {
  payslips: Payslip[];
}

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return xUserId.trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  return token || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const staffId = extractStaffIdFromToken(req);
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    const { month, year } = req.query;

    // TODO: Fetch payslips from database filtered by staffId and optional month/year
    // For now, return mock data

    const response: PayslipsResponse = {
      payslips: [
        {
          id: 'payslip-1',
          month: 'January',
          year: 2025,
          basicSalary: 150000,
          allowances: 25000,
          deductions: 15000,
          netSalary: 160000,
          paymentStatus: 'paid',
          paymentDate: '2025-01-31',
        },
        {
          id: 'payslip-2',
          month: 'December',
          year: 2024,
          basicSalary: 150000,
          allowances: 25000,
          deductions: 15000,
          netSalary: 160000,
          paymentStatus: 'paid',
          paymentDate: '2024-12-31',
        },
        {
          id: 'payslip-3',
          month: 'November',
          year: 2024,
          basicSalary: 150000,
          allowances: 25000,
          deductions: 15000,
          netSalary: 160000,
          paymentStatus: 'pending',
        },
      ],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    return res.status(500).json({ error: 'Failed to fetch payslips' });
  }
}
