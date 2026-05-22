import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getTerms, createTerm, updateTerm, deleteTerm, termsOverlap,
  getHolidays, createHoliday, updateHoliday, deleteHoliday,
  getExamPeriods, createExamPeriod, updateExamPeriod, deleteExamPeriod,
} from './_lib/calendar.js'
import { initializeDatabase, runMigrations } from '../cbt/_lib/db.js'

const TENANT_ID = 'demo-tenant-001'
let migrationsInitialized = false

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return null } }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure migrations are run on first request
  if (!migrationsInitialized) {
    migrationsInitialized = true
    try {
      initializeDatabase()
      await runMigrations()
    } catch (err) {
      console.error('Migration initialization error:', err)
    }
  }

  const { method, query } = req
  // Route: /api/tenant/timetable/calendar?resource=terms|holidays|exam-periods
  const resource = (query.resource as string) || 'all'
  const id = query.id as string | undefined

  // GET — return all or filtered
  if (method === 'GET') {
    const academicYear = query.academicYear as string | undefined
    const termId = query.termId as string | undefined
    if (resource === 'terms') {
      return res.status(200).json({ data: await getTerms(TENANT_ID, academicYear) })
    }
    if (resource === 'holidays') {
      return res.status(200).json({ data: await getHolidays(TENANT_ID, termId) })
    }
    if (resource === 'exam-periods') {
      return res.status(200).json({ data: await getExamPeriods(TENANT_ID, termId) })
    }
    // Default: return all
    return res.status(200).json({
      data: {
        terms: await getTerms(TENANT_ID, academicYear),
        holidays: await getHolidays(TENANT_ID, termId),
        examPeriods: await getExamPeriods(TENANT_ID, termId),
      },
    })
  }

  // POST — create
  if (method === 'POST') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })

    if (resource === 'terms') {
      const { name, startDate, endDate, academicYear } = body
      if (!name || !startDate || !endDate || !academicYear) {
        return res.status(400).json({ error: 'name, startDate, endDate, academicYear are required' })
      }
      if (startDate >= endDate) {
        return res.status(400).json({ error: 'startDate must be before endDate' })
      }
      if (await termsOverlap(TENANT_ID, startDate, endDate)) {
        return res.status(400).json({ error: 'Term dates overlap with an existing term' })
      }
      return res.status(201).json({ data: await createTerm(TENANT_ID, { name, startDate, endDate, academicYear }) })
    }

    if (resource === 'holidays') {
      const { termId, name, startDate, endDate } = body
      if (!termId || !name || !startDate || !endDate) {
        return res.status(400).json({ error: 'termId, name, startDate, endDate are required' })
      }
      if (startDate >= endDate) {
        return res.status(400).json({ error: 'startDate must be before endDate' })
      }
      return res.status(201).json({ data: await createHoliday(TENANT_ID, { termId, name, startDate, endDate }) })
    }

    if (resource === 'exam-periods') {
      const { termId, name, startDate, endDate } = body
      if (!termId || !name || !startDate || !endDate) {
        return res.status(400).json({ error: 'termId, name, startDate, endDate are required' })
      }
      if (startDate >= endDate) {
        return res.status(400).json({ error: 'startDate must be before endDate' })
      }
      return res.status(201).json({ data: await createExamPeriod(TENANT_ID, { termId, name, startDate, endDate }) })
    }

    return res.status(400).json({ error: 'resource query param must be terms, holidays, or exam-periods' })
  }

  // PUT — update
  if (method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id query param is required' })
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })

    if (resource === 'terms') {
      const updated = await updateTerm(id, body)
      if (!updated) return res.status(404).json({ error: 'Term not found' })
      return res.status(200).json({ data: updated })
    }
    if (resource === 'holidays') {
      const updated = await updateHoliday(id, body)
      if (!updated) return res.status(404).json({ error: 'Holiday not found' })
      return res.status(200).json({ data: updated })
    }
    if (resource === 'exam-periods') {
      const updated = await updateExamPeriod(id, body)
      if (!updated) return res.status(404).json({ error: 'Exam period not found' })
      return res.status(200).json({ data: updated })
    }
    return res.status(400).json({ error: 'resource query param must be terms, holidays, or exam-periods' })
  }

  // DELETE
  if (method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id query param is required' })
    if (resource === 'terms') {
      const ok = await deleteTerm(id)
      if (!ok) return res.status(404).json({ error: 'Term not found' })
      return res.status(204).end()
    }
    if (resource === 'holidays') {
      const ok = await deleteHoliday(id)
      if (!ok) return res.status(404).json({ error: 'Holiday not found' })
      return res.status(204).end()
    }
    if (resource === 'exam-periods') {
      const ok = await deleteExamPeriod(id)
      if (!ok) return res.status(404).json({ error: 'Exam period not found' })
      return res.status(204).end()
    }
    return res.status(400).json({ error: 'resource query param must be terms, holidays, or exam-periods' })
  }

  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
