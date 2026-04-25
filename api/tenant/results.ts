import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchScores, createScore, type ScorePayload } from './_lib/results'

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
    const { studentId, academicSession, term, class: className } = req.query
    try {
      const scores = await fetchScores(
        studentId as string | undefined,
        academicSession as string | undefined,
        term as string | undefined,
        className as string | undefined
      )
      return res.status(200).json({ data: scores })
    } catch (error) {
      console.error('Error fetching scores:', error)
      return res.status(500).json({ error: 'Failed to fetch scores' })
    }
  }

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (!body) return res.status(400).json({ error: 'Request body is required' })

    const { studentId, subject, academicSession, term, caScore, examScore, attendancePercentage, class: className } = body

    // Validate required fields
    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!subject) missing.push('subject')
    if (!academicSession) missing.push('academicSession')
    if (!term) missing.push('term')
    if (caScore === undefined || caScore === null) missing.push('caScore')
    if (examScore === undefined || examScore === null) missing.push('examScore')
    if (attendancePercentage === undefined || attendancePercentage === null) missing.push('attendancePercentage')
    if (!className) missing.push('class')

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    // Validate score ranges
    if (Number(caScore) < 0 || Number(caScore) > 100) {
      return res.status(400).json({ error: 'caScore must be between 0 and 100' })
    }
    if (Number(examScore) < 0 || Number(examScore) > 100) {
      return res.status(400).json({ error: 'examScore must be between 0 and 100' })
    }
    if (Number(attendancePercentage) < 0 || Number(attendancePercentage) > 100) {
      return res.status(400).json({ error: 'attendancePercentage must be between 0 and 100' })
    }

    try {
      const payload: ScorePayload = {
        studentId,
        subject,
        academicSession,
        term,
        caScore: Number(caScore),
        examScore: Number(examScore),
        attendancePercentage: Number(attendancePercentage),
        class: className,
      }
      const score = await createScore(payload)
      return res.status(201).json({ data: score })
    } catch (error) {
      console.error('Error creating score:', error)
      return res.status(500).json({ error: 'Failed to create score' })
    }
  }

  return methodNotAllowed(res)
}
