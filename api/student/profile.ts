import type { VercelRequest, VercelResponse } from '@vercel/node';

interface StudentProfile {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  arm: string;
  gender: string;
  email: string;
  phone: string;
  guardian: {
    name: string;
    phone: string;
  };
}

interface LoginHistory {
  date: string;
  time: string;
  device: string;
  ipAddress: string;
}

interface StudentProfileResponse {
  profile: StudentProfile;
  loginHistory: LoginHistory[];
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

function parseBody(req: VercelRequest) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      // TODO: Fetch actual profile from database filtered by studentId
      // For now, return mock data
      const profile: StudentProfile = {
        id: studentId,
        name: 'John Adewale',
        admissionNumber: 'ADM-2024-001',
        class: 'SS3',
        arm: 'A',
        gender: 'Male',
        email: 'john.adewale@school.edu',
        phone: '+234 801 234 5678',
        guardian: {
          name: 'Mr. Adewale Okafor',
          phone: '+234 803 456 7890',
        },
      };

      const loginHistory: LoginHistory[] = [
        {
          date: '2025-01-20',
          time: '08:30 AM',
          device: 'Chrome on Windows',
          ipAddress: '192.168.1.100',
        },
        {
          date: '2025-01-19',
          time: '04:15 PM',
          device: 'Safari on iPhone',
          ipAddress: '192.168.1.101',
        },
        {
          date: '2025-01-18',
          time: '09:45 AM',
          device: 'Chrome on Windows',
          ipAddress: '192.168.1.100',
        },
      ];

      const response: StudentProfileResponse = {
        profile,
        loginHistory,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = parseBody(req);
      if (!body) {
        return res.status(400).json({ error: 'Request body is required' });
      }

      // Validate email and phone if provided
      if (body.email && !body.email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // TODO: Update profile in database
      return res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action } = req.query;

      if (action === 'change-password') {
        const body = parseBody(req);
        if (!body || !body.currentPassword || !body.newPassword) {
          return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // TODO: Verify current password and update to new password in database
        return res.status(200).json({ success: true, message: 'Password changed successfully' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Error processing profile action:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  }

  res.setHeader('Allow', 'GET,PUT,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
