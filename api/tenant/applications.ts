import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchApplications, createApplication, updateApplicationStatus, type ApplicationPayload } from './_lib/applications.js'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT')
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

  if (method === 'GET') {
    try {
      const { status, academicSession } = req.query
      const applications = await fetchApplications(
        typeof status === 'string' ? status : undefined,
        typeof academicSession === 'string' ? academicSession : undefined
      )
      return res.status(200).json({ data: applications })
    } catch (error) {
      console.error('Error fetching applications:', error)
      return res.status(500).json({ error: 'Failed to fetch applications' })
    }
  }

  if (method === 'POST') {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ error: 'Request body is required' })
    }

    const required = ['studentName', 'parentName', 'contactPhone', 'contactEmail', 'classApplying']
    const missing = required.filter(f => !body[f])
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
    }

    try {
      const payload: ApplicationPayload = {
        studentName: body.studentName,
        parentName: body.parentName,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        classApplying: body.classApplying,
        academicSession: body.academicSession,
        source: body.source,
      }
      const created = await createApplication(payload)
      return res.status(201).json({ data: created })
    } catch (error) {
      console.error('Error creating application:', error)
      return res.status(500).json({ error: 'Failed to create application' })
    }
  }

  if (method === 'PUT') {
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Application ID is required as query param' })
    }

    const body = parseBody(req)
    if (!body || !body.status) {
      return res.status(400).json({ error: 'status field is required' })
    }

    try {
      const updated = await updateApplicationStatus(id, body.status)
      if (!updated) {
        return res.status(404).json({ error: 'Application not found' })
      }
      return res.status(200).json({ data: updated })
    } catch (error) {
      console.error('Error updating application status:', error)
      return res.status(500).json({ error: 'Failed to update application status' })
    }
  }

  return methodNotAllowed(res)
}
