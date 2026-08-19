import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createLead, fetchLeads } from './_lib/lead.js'
import { requireRole } from '../_lib/auth-middleware.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req

  // POST method is public (for public inquiry form)
  // GET requires staff or tenant_admin role
  let decoded: any = null
  if (method !== 'POST') {
    decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
    if (!decoded) return
  }

  if (method === 'GET') {
    try {
      const leads = await fetchLeads()
      return res.status(200).json({ data: leads })
    } catch (error) {
      console.error('Error fetching leads:', error)
      return res.status(500).json({ error: 'Failed to fetch leads' })
    }
  }

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const { studentName, parentName, contactPhone, contactEmail, classInterested, source, status } = body

    // Only studentName is truly mandatory
    if (!studentName || !String(studentName).trim()) {
      return res.status(400).json({
        error: 'Missing required field',
        details: { studentName: 'studentName is required' },
      })
    }

    try {
      const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const result = await createLead({
        id,
        studentName: String(studentName).trim(),
        parentName: parentName ? String(parentName).trim() : '',
        contactPhone: contactPhone ? String(contactPhone).trim() : '',
        contactEmail: contactEmail ? String(contactEmail).trim() : '',
        classInterested: classInterested || '',
        source: source || 'website',
        status: status || 'new',
      })
      return res.status(201).json({ data: result })
    } catch (error) {
      console.error('Error creating lead:', error)
      return res.status(500).json({ error: 'Failed to create lead' })
    }
  }

  return methodNotAllowed(res)
}
