import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase } from './cbt/_lib/db.js'
import {
  fetchAnnouncements,
  createAnnouncement,
  getAnnouncementReadCount,
  getAnnouncementReaders,
  recordAnnouncementRead,
  type AnnouncementPayload,
} from './_lib/communication.js'
import { requireRole } from '../_lib/auth-middleware'

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

function getTenantId(req: VercelRequest): string {
  return (req.headers['x-tenant-id'] as string) || process.env.DEFAULT_TENANT_ID || 'default-tenant'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require authentication - only staff or tenant_admin can access tenant communication
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  initializeDatabase()

  if (req.method === 'GET') {
    const { audience, status, id } = req.query

    // Return readers for a specific announcement
    if (id && typeof id === 'string') {
      try {
        const [readCount, readers] = await Promise.all([
          getAnnouncementReadCount(id),
          getAnnouncementReaders(id),
        ])
        return res.status(200).json({ data: { readCount, readers } })
      } catch (error) {
        console.error('Error fetching announcement readers:', error)
        return res.status(500).json({ error: 'Failed to fetch readers' })
      }
    }

    try {
      const announcements = await fetchAnnouncements(audience as string | undefined, status as string | undefined)
      // Attach read counts to each announcement
      const announcementsWithReads = await Promise.all(
        announcements.map(async (ann) => {
          const readCount = await getAnnouncementReadCount(ann.id)
          return { ...ann, readCount }
        })
      )
      return res.status(200).json({ data: announcementsWithReads })
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
      return res.status(201).json({ data: { ...announcement, readCount: 0 } })
    } catch (error) {
      console.error('Error creating announcement:', error)
      return res.status(500).json({ error: 'Failed to create announcement' })
    }
  }

  if (req.method === 'PUT') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })

    const { announcementId, readerId, readerType, readerName } = body
    if (!announcementId || !readerId || !readerType) {
      return res.status(400).json({ error: 'Missing required fields: announcementId, readerId, readerType' })
    }
    if (!['student', 'parent', 'staff'].includes(readerType)) {
      return res.status(400).json({ error: 'readerType must be one of: student, parent, staff' })
    }

    const tenantId = getTenantId(req)
    try {
      await recordAnnouncementRead(announcementId, readerId, readerType, readerName || 'Unknown', tenantId)
      const readCount = await getAnnouncementReadCount(announcementId)
      return res.status(200).json({ success: true, readCount })
    } catch (error) {
      console.error('Error recording read:', error)
      return res.status(500).json({ error: 'Failed to record read' })
    }
  }

  return methodNotAllowed(res)
}
