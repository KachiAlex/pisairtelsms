import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getOpenConflictCount } from './_lib/conflicts.js'
import { getClassSchedules } from './_lib/class-schedules.js'
import { getExamSchedules } from './_lib/exam-schedules.js'

const TENANT_ID = 'demo-tenant-001'

interface PublishedRecord {
  id: string
  scheduleType: 'class' | 'teacher' | 'exam' | 'all'
  scheduleIds: string[]
  publishedAt: string
  publishedBy: string
}

const publishedStore: PublishedRecord[] = []

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method, query } = req

    // GET /publish/status
    if (method === 'GET') {
      const openConflicts = getOpenConflictCount(TENANT_ID)
      const classSchedules = getClassSchedules(TENANT_ID)
      const examSchedules = getExamSchedules(TENANT_ID)
      const readinessPct = openConflicts === 0 ? 95 : Math.max(10, 80 - openConflicts * 10)
      return res.status(200).json({
        data: {
          publishedSchedules: publishedStore,
          lastPublishedAt: publishedStore.length > 0 ? publishedStore[publishedStore.length - 1].publishedAt : null,
          openConflicts,
          classScheduleCount: classSchedules.length,
          examScheduleCount: examSchedules.length,
          readinessPct,
          canPublish: openConflicts === 0,
        },
      })
    }

    // POST /publish — publish schedules
    if (method === 'POST') {
      const body = parseBody(req)
      if (!body) return res.status(400).json({ error: 'Request body is required' })

      const openConflicts = getOpenConflictCount(TENANT_ID)
      if (openConflicts > 0) {
        return res.status(400).json({
          error: `Cannot publish: ${openConflicts} unresolved conflict(s) must be resolved first`,
          openConflicts,
        })
      }

      const { scheduleType = 'all', scheduleIds = [], publishedBy = 'admin' } = body
      const record: PublishedRecord = {
        id: `pub-${Date.now()}`,
        scheduleType,
        scheduleIds,
        publishedAt: new Date().toISOString(),
        publishedBy,
      }
      publishedStore.push(record)
      return res.status(201).json({ data: { success: true, publishedAt: record.publishedAt, record } })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Publish API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
