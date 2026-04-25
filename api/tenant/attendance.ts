import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchAttendance, upsertAttendanceBatch, type AttendancePayload } from './_lib/attendance'

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

function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date > today
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { class: className, date, term, startDate, endDate } = req.query
    try {
      const records = await fetchAttendance(
        className as string | undefined,
        date as string | undefined,
        term as string | undefined,
        startDate as string | undefined,
        endDate as string | undefined
      )
      return res.status(200).json({ data: records })
    } catch (error) {
      console.error('Error fetching attendance:', error)
      return res.status(500).json({ error: 'Failed to fetch attendance records' })
    }
  }

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })

    const { records } = body
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required and must not be empty' })
    }

    // Validate no future dates
    for (const record of records) {
      if (!record.studentId || !record.class || !record.date || !record.status || !record.academicSession || !record.term) {
        return res.status(400).json({ error: 'Each record must have studentId, class, date, status, academicSession, and term' })
      }
      if (isFutureDate(record.date)) {
        return res.status(400).json({ error: `Date ${record.date} is in the future. Attendance cannot be recorded for future dates.` })
      }
      if (!['present', 'absent', 'late'].includes(record.status)) {
        return res.status(400).json({ error: `Invalid status "${record.status}". Must be present, absent, or late.` })
      }
    }

    try {
      const count = await upsertAttendanceBatch(records as AttendancePayload[])
      return res.status(200).json({ data: { count, message: `${count} attendance records saved` } })
    } catch (error) {
      console.error('Error saving attendance:', error)
      return res.status(500).json({ error: 'Failed to save attendance records' })
    }
  }

  return methodNotAllowed(res)
}
