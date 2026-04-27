import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'PUT') {
    return handlePut(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.setHeader('Allow', 'GET, PUT, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const response = {
      id: parentInfo.parentId,
      name: 'John Doe',
      email: parentInfo.email,
      phone: '+234-801-234-5678',
      address: '123 Main Street, Lagos',
      linkedChildren: [
        { id: 'child1', name: 'Jane Doe', admissionNumber: 'ADM001', class: 'JSS1' },
        { id: 'child2', name: 'Jack Doe', admissionNumber: 'ADM002', class: 'JSS2' },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { email, phone, address } = req.body

    // Validate email format
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // TODO: Update profile in database
    const response = {
      id: parentInfo.parentId,
      name: 'John Doe',
      email: email || parentInfo.email,
      phone: phone || '+234-801-234-5678',
      address: address || '123 Main Street, Lagos',
      linkedChildren: [
        { id: 'child1', name: 'Jane Doe', admissionNumber: 'ADM001', class: 'JSS1' },
        { id: 'child2', name: 'Jack Doe', admissionNumber: 'ADM002', class: 'JSS2' },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error updating profile:', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const parentInfo = extractParentInfoFromJWT(token)
    if (!parentInfo) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    // TODO: Verify current password and update in database
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return res.status(500).json({ error: 'Failed to change password' })
  }
}
