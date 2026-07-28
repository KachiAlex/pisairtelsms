import type { VercelRequest, VercelResponse } from '@vercel/node'

import { verifySuperAdminCredentials } from '../_lib/super-admin.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (error) {
      console.error('Failed to parse verify request body', error)
      return null
    }
  }
  return req.body
}

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res)
  }

  try {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'A JSON body is required.' })
    }

    const email = sanitizeString(body.email).toLowerCase()
    const password = sanitizeString(body.password)

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const account = await verifySuperAdminCredentials(email, password)
    if (!account) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    return res.status(200).json({ account })
  } catch (error) {
    console.error('Super admin verification error', error)
    return res.status(500).json({ error: 'Unexpected error verifying super admin account.' })
  }
}
