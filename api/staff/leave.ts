import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchLeaveRequests, createLeaveRequest, fetchStaffById } from '../tenant/_lib/staff';

interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface NewLeaveRequestBody {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const LEAVE_ALLOWANCES: Record<string, number> = {
  Annual: 21,
  Sick: 10,
  Casual: 7,
  Maternity: 84,
  Paternity: 5,
};

function extractStaffIdFromToken(req: VercelRequest): string | null {
  // Prefer x-user-id header (set by tenantApi and auth storage)
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return xUserId.trim();
  }

  // Fall back to JWT Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) return null;

  // Try to decode as JWT
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  // Accept any non-empty opaque token as the staff identifier
  return token || null;
}

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const requests = await fetchLeaveRequests(staffId);

      const usedDays: Record<string, number> = {};
      for (const r of requests) {
        if (r.status === 'approved') {
          usedDays[r.leaveType] = (usedDays[r.leaveType] ?? 0) + r.days;
        }
      }

      const balance: LeaveBalance[] = Object.entries(LEAVE_ALLOWANCES).map(([leaveType, totalDays]) => {
        const used = usedDays[leaveType] ?? 0;
        return { leaveType, totalDays, usedDays: used, remainingDays: Math.max(0, totalDays - used) };
      });

      return res.status(200).json({ requests, balance });
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { leaveType, startDate, endDate, reason } = body as NewLeaveRequestBody;

      if (!leaveType || !startDate || !endDate || !reason) {
        return res.status(400).json({ error: 'leaveType, startDate, endDate, and reason are required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return res.status(400).json({ error: 'Invalid date range: startDate must be before or equal to endDate' });
      }

      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const staffMember = await fetchStaffById(staffId);
      const staffName = staffMember?.name ?? staffId;

      const created = await createLeaveRequest({ staffId, staffName, leaveType, startDate, endDate, days, reason, status: 'pending' });
      return res.status(201).json(created);
    } catch (error) {
      console.error('Error creating leave request:', error);
      return res.status(500).json({ error: 'Failed to create leave request' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
