import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchStaff, createStaffMember, type StaffPayload } from './_lib/staff'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { department, status } = req.query
    try {
      const staff = await fetchStaff(department as string | undefined, status as string | undefined)
      return res.status(200).json({ data: staff })
    } catch (error) {
      console.error('Error fetching staff:', error)
      return res.status(500).json({ error: 'Failed to fetch staff' })
    }
  }

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })

    const { name, role, department, email, phone, hireDate } = body
    const missing: string[] = []
    if (!name) missing.push('name')
    if (!role) missing.push('role')
    if (!department) missing.push('department')
    if (!hireDate) missing.push('hireDate')

    if (missing.length > 0) return res.status(400).json({ error: 'Missing required fields', details: missing })

    try {
      const payload: StaffPayload = { name, role, department, email: email || '', phone: phone || '', hireDate, status: body.status }
      const member = await createStaffMember(payload)
      return res.status(201).json({ data: member })
    } catch (error) {
      console.error('Error creating staff member:', error)
      return res.status(500).json({ error: 'Failed to create staff member' })
    }
  }

  return methodNotAllowed(res)
}
