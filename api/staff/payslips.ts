import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { ensureStaffTables } from '../tenant/_lib/staff.js';
import { requireRole } from '../_lib/auth-middleware.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireRole(req, res, ['staff']);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId || decoded.sub;
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  await ensureStaffTables();

  try {
    const { month, year } = req.query;

    const result = await sql`
      SELECT id::text, month, year, basic_salary, allowances, deductions, net_salary, status, payment_date::text
      FROM staff_payroll WHERE staff_id = ${staffId}
    `;
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
