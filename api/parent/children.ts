import type { VercelRequest, VercelResponse } from '@vercel/node'
import { extractTokenFromHeader, extractParentInfoFromJWT } from '../../src/lib/parentAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.setHeader('Allow', 'GET, POST')
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
      children: [
        { id: 'child1', name: 'Jane Doe', admissionNumber: 'ADM001', class: 'JSS1', arm: 'A' },
        { id: 'child2', name: 'Jack Doe', admissionNumber: 'ADM002', class: 'JSS2', arm: 'B' },
      ],
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching children:', error)
    return res.status(500).json({ error: 'Failed to fetch children' })
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

    const { childAdmissionNumber, relationship } = req.body

    if (!childAdmissionNumber || !relationship) {
      return res.status(400).json({ error: 'Bad request: Missing required fields' })
    }

    // TODO: Verify child exists and add to parent's account
    const response = {
      id: 'child-' + Date.now(),
      name: 'New Child',
      admissionNumber: childAdmissionNumber,
      class: 'JSS1',
      arm: 'A',
    }

    return res.status(201).json(response)
  } catch (error) {
    console.error('Error adding child:', error)
    return res.status(500).json({ error: 'Failed to add child' })
  }
}
