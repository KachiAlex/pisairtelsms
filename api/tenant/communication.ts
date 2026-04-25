import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchAnnouncements, createAnnouncement, type AnnouncementPayload } from './_lib/communication.js'

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
    const { audience, status } = req.query
    try {
      const announcements = await fetchAnnouncements(audience as string | undefined, status as string | undefined)
      return res.status(200).json({ data: announcements })
    } catch (error) {
      console.error('Error fetching announcements:', error)
      return res.status(500).json({ error: 'Failed to fetch announcements' })
    }
  }

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })

    const { title, body: announcementBody, audience, status } = body
    const missing: string[] = []
    if (!title) missing.push('title')
    if (!announcementBody) missing.push('body')
    if (!audience) missing.push('audience')
    if (!status) missing.push('status')

    if (missing.length > 0) return res.status(400).json({ error: 'Missing required fields', details: missing })

    if (!['all', 'students', 'staff', 'parents'].includes(audience)) {
      return res.status(400).json({ error: 'audience must be one of: all, students, staff, parents' })
    }
    if (!['draft', 'sent'].includes(status)) {
      return res.status(400).json({ error: 'status must be draft or sent' })
    }

    try {
      const payload: AnnouncementPayload = { title, body: announcementBody, audience, status, sentBy: body.sentBy }
      const announcement = await createAnnouncement(payload)
      return res.status(201).json({ data: announcement })
    } catch (error) {
      console.error('Error creating announcement:', error)
      return res.status(500).json({ error: 'Failed to create announcement' })
    }
  }

  return methodNotAllowed(res)
}
