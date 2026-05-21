import type { VercelRequest, VercelResponse } from '@vercel/node';

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvalDate?: string;
}

interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface LeaveListResponse {
  requests: LeaveRequest[];
  balance: LeaveBalance[];
}

interface NewLeaveRequestBody {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface NewLeaveRequestResponse {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending';
  createdAt: string;
}

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
      // TODO: Fetch leave requests from database filtered by staffId
      // For now, return mock data

      const response: LeaveListResponse = {
        requests: [
          {
            id: 'leave-1',
            leaveType: 'Annual Leave',
            startDate: '2025-02-10',
            endDate: '2025-02-14',
            reason: 'Family vacation',
            status: 'pending',
            createdAt: '2025-01-15',
          },
          {
            id: 'leave-2',
            leaveType: 'Sick Leave',
            startDate: '2025-01-10',
            endDate: '2025-01-11',
            reason: 'Medical appointment',
            status: 'approved',
            createdAt: '2025-01-08',
            approvedBy: 'Principal',
            approvalDate: '2025-01-09',
          },
        ],
        balance: [
          {
            leaveType: 'Annual Leave',
            totalDays: 21,
            usedDays: 5,
            remainingDays: 16,
          },
          {
            leaveType: 'Sick Leave',
            totalDays: 10,
            usedDays: 2,
            remainingDays: 8,
          },
        ],
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { leaveType, startDate, endDate, reason } = body as NewLeaveRequestBody;

      // TODO: Validate required fields
      // TODO: Validate date range (start <= end)
      // TODO: Create leave request in database

      const response: NewLeaveRequestResponse = {
        id: `leave-${Date.now()}`,
        leaveType,
        startDate,
        endDate,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error('Error creating leave request:', error);
      return res.status(500).json({ error: 'Failed to create leave request' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
