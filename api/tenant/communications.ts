import { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../_lib/auth-middleware.js'
import {
  Communication,
  createCommunication,
  getCommunications,
  getCommunicationById,
  getDeliveryStats,
  getCommunicationLogs,
  markRecipientRead,
  getTemplates,
  createTemplate,
} from './_lib/communications/schema.js'
import { enqueueCommunication, processQueue } from './_lib/communications/queue.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  const path = req.url?.replace(/^.*communications/, '').replace(/^\//, '') || ''
  const segments = path.split('/').filter(Boolean)

  try {
    if (req.method === 'GET' && segments.length === 0) {
      const { type, status } = req.query
      const data = await getCommunications(tenantId, {
        type: type as string,
        status: status as string,
      })
      res.status(200).json({ data })
      return
    }

    if (req.method === 'GET' && segments[0] === 'logs') {
      const { communicationId, status } = req.query
      const data = await getCommunicationLogs(tenantId, {
        communicationId: communicationId as string,
        status: status as string,
      })
      res.status(200).json({ data })
      return
    }

    if (req.method === 'GET' && segments[0] === 'templates') {
      const data = await getTemplates(tenantId)
      res.status(200).json({ data })
      return
    }

    if (req.method === 'POST' && segments[0] === 'templates') {
      const { name, type, title, body, channels, variables } = req.body
      if (!name || !title || !body) {
        res.status(400).json({ error: 'Missing required fields' })
        return
      }
      const data = await createTemplate(tenantId, {
        name,
        type: type || 'announcement',
        title,
        body,
        channels: channels || ['in-app'],
        variables: variables || [],
      } as any)
      res.status(201).json({ data })
      return
    }

    if (req.method === 'POST' && segments.length === 0) {
      const { type, title, body, audience, channels, scheduledFor } = req.body

      if (!title || !body || !audience || !channels) {
        res.status(400).json({ error: 'Missing required fields' })
        return
      }

      const now = new Date().toISOString()
      const status = scheduledFor && new Date(scheduledFor) > new Date() ? 'scheduled' : 'draft'

      const communication = await createCommunication(tenantId, {
        type: type || 'announcement',
        title,
        body,
        audience,
        channels,
        scheduledFor: scheduledFor || null,
        sentAt: null,
        status,
        sentBy: decoded.email || 'Staff',
        metadata: {},
      } as Communication)

      await enqueueCommunication(tenantId, communication)

      if (status !== 'scheduled') {
        const result = await processQueue(tenantId, communication.id)
        console.log(`Processed ${result.processed} recipients for communication ${communication.id}`)
      }

      res.status(201).json({ data: communication })
      return
    }

    if (segments.length === 1) {
      const id = segments[0]

      if (req.method === 'GET') {
        const data = await getCommunicationById(tenantId, id)
        if (!data) {
          res.status(404).json({ error: 'Communication not found' })
          return
        }
        const stats = await getDeliveryStats(tenantId, id)
        res.status(200).json({ data: { ...data, stats } })
        return
      }

      if (req.method === 'POST' && req.query.action === 'send') {
        const communication = await getCommunicationById(tenantId, id)
        if (!communication) {
          res.status(404).json({ error: 'Communication not found' })
          return
        }
        const result = await processQueue(tenantId, communication.id)
        res.status(200).json({ data: result })
        return
      }
    }

    if (req.method === 'POST' && segments[0] === 'read' && segments[1]) {
      const communicationId = segments[1]
      const { recipientId, recipientType } = req.body
      if (!recipientId || !recipientType) {
        res.status(400).json({ error: 'Missing recipient information' })
        return
      }
      await markRecipientRead(tenantId, communicationId, recipientId, recipientType)
      res.status(200).json({ success: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('communications handler error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
