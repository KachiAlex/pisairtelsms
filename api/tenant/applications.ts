import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createApplication, fetchApplications, updateApplicationStatus, type Application, type ApplicationPayload } from './_lib/applications'

interface ApiResponse<T> {
  data?: T
  error?: string
}

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (error) {
      console.error('Failed to parse request body', error)
      return null
    }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req

  if (method === 'GET') {
    try {
      const applications = await fetchApplications()
      return res.status(200).json({ data: applications })
    } catch (error) {
      console.error('Error fetching applications:', error)
      return res.status(500).json({ error: 'Failed to fetch applications' })
    }
  }

  if (method === 'POST') {
    try {
      const body = parseBody(req)
      if (!body) {
        return res.status(400).json({ error: 'Request body is required' })
      }

      const applicationData: ApplicationPayload = body.application || body
      const createdApplication = await createApplication(applicationData)
      return res.status(201).json({ data: createdApplication })
    } catch (error) {
      console.error('Error creating application:', error)
      return res.status(500).json({ error: 'Failed to create application' })
    }
  }

  if (method === 'PUT') {
    try {
      const body = parseBody(req)
      if (!body || !body.id || !body.status) {
        return res.status(400).json({ error: 'Application ID and status are required' })
      }

      const { id, status } = body
      const updatedApplication = await updateApplicationStatus(id, status)

      if (!updatedApplication) {
        return res.status(404).json({ error: 'Application not found' })
      }

      return res.status(200).json({ data: updatedApplication })
    } catch (error) {
      console.error('Error updating application status:', error)
      return res.status(500).json({ error: 'Failed to update application status' })
    }
  }

  return methodNotAllowed(res)
}
