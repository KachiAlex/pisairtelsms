import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  createOrUpdateSuperAdmin,
  fetchSuperAdmin,
} from '../_lib/super-admin.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: message })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (error) {
      console.error('Failed to parse JSON body', error)
      return null
    }
  }
  return req.body
}

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const account = await fetchSuperAdmin()
      return res.status(200).json({ account })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)
      if (!body) {
        return badRequest(res, 'A JSON body is required.')
      }

      const payload = {
        fullName: sanitizeString(body.fullName),
        organization: sanitizeString(body.organization),
        email: sanitizeString(body.email).toLowerCase(),
        password: sanitizeString(body.password),
      }

      if (Object.values(payload).some((value) => value.length < 3)) {
        return badRequest(res, 'All fields must contain at least 3 characters.')
      }

      const account = await createOrUpdateSuperAdmin(payload)
      return res.status(200).json({ account })
    }

    return methodNotAllowed(res)
  } catch (error) {
    console.error('Super admin handler error', error)
    return res.status(500).json({ error: 'Unexpected error creating super admin account.' })
  }
}
