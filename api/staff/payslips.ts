import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

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

    await sql``
      CREATE TABLE IF NOT EXISTS staff_payroll (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        staff_name TEXT NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        basic_salary NUMERIC NOT NULL DEFAULT 0,
        allowances NUMERIC NOT NULL DEFAULT 0,
        deductions NUMERIC NOT NULL DEFAULT 0,
        net_salary NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(staff_id, month, year)
      )
    ``;
    await sql``CREATE INDEX IF NOT EXISTS idx_payroll_staff_id ON staff_payroll(staff_id)``;

    const result = await sql``
      SELECT id::text, month, year, basic_salary, allowances, deductions, net_salary, status, payment_date::text
      FROM staff_payroll WHERE staff_id = ${staffId}
    ``;
    let payslips = result.rows.map((r) => ({
      id: r.id,
      month: r.month,
      year: Number(r.year),
      basicSalary: Number(r.basic_salary),
      allowances: Number(r.allowances),
      deductions: Number(r.deductions),
      netSalary: Number(r.net_salary),
      paymentStatus: r.status === 'paid' ? 'paid' as const : 'pending' as const,
      paymentDate: r.payment_date ?? undefined,
    }));

    if (month) {
      payslips = payslips.filter(p => p.month.toLowerCase() === (month as string).toLowerCase());
    }
    if (year) {
      payslips = payslips.filter(p => p.year === Number(year));
    }

    payslips.sort((a, b) => {
      const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const monthDiff = monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
      if (monthDiff !== 0 || b.year !== a.year) return b.year - a.year;
      return monthDiff;
    });

    const response: PayslipsResponse = { payslips };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    return res.status(500).json({ error: 'Failed to fetch payslips' });
  }
}
