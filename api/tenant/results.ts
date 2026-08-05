import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchScores, createScore, fetchScoresByClassAndSubject, fetchTeacherSubmissions, recomputeAllScores, compileResults, fetchCompiledResults, approveCompiledResults, publishCompiledResults, computeAttendanceBatch, fetchBroadsheet, type ScorePayload } from './_lib/results.js'
import { requireRole } from '../_lib/auth-middleware.js'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  if (req.method === 'GET') {
    const { studentId, academicSession, term, class: className, action, subject } = req.query

    try {
      if (action === 'teacher-submissions') {
        const submissions = await fetchTeacherSubmissions(
          tenantId,
          academicSession as string,
          term as string,
          className as string | undefined
        )
        return res.status(200).json({ data: submissions })
      }

      if (action === 'class-scores' && className && subject && academicSession && term) {
        const scores = await fetchScoresByClassAndSubject(
          tenantId,
          className as string,
          subject as string,
          academicSession as string,
          term as string
        )
        return res.status(200).json({ data: scores })
      }

      if (action === 'compiled' && academicSession && term) {
        const compiled = await fetchCompiledResults(
          tenantId,
          academicSession as string,
          term as string,
          className as string | undefined
        )
        return res.status(200).json({ data: compiled })
      }

      if (action === 'attendance-batch' && className && academicSession && term) {
        const attendanceMap = await computeAttendanceBatch(
          tenantId,
          className as string,
          academicSession as string,
          term as string
        )
        return res.status(200).json({ data: attendanceMap })
      }

      if (action === 'broadsheet' && className && academicSession && term) {
        const broadsheet = await fetchBroadsheet(
          tenantId,
          academicSession as string,
          term as string,
          className as string
        )
        if (!broadsheet) {
          return res.status(404).json({ error: 'No compiled results found for this class/term. Run Result Computation first.' })
        }
        return res.status(200).json({ data: broadsheet })
      }

      const scores = await fetchScores(
        tenantId,
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

    const {
      studentId, subject, academicSession, term, class: className,
      caScore, examScore, attendancePercentage,
      testsScore, assignmentsScore, projectsScore, examsScore,
      submittedBy, submittedByName, submissionStatus,
    } = body

    const missing: string[] = []
    if (!studentId) missing.push('studentId')
    if (!subject) missing.push('subject')
    if (!academicSession) missing.push('academicSession')
    if (!term) missing.push('term')
    if (!className) missing.push('class')

    // Either legacy (caScore+examScore) or new (testsScore+assignmentsScore+projectsScore+examsScore) must be provided
    const hasLegacy = caScore !== undefined && caScore !== null && examScore !== undefined && examScore !== null
    const hasBreakdown = testsScore !== undefined || assignmentsScore !== undefined || projectsScore !== undefined || examsScore !== undefined

    if (!hasLegacy && !hasBreakdown) {
      missing.push('scores (provide caScore+examScore or testsScore+assignmentsScore+projectsScore+examsScore)')
    }

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', details: missing })
    }

    // Validate score ranges
    const validateScore = (val: any, name: string) => {
      if (val !== undefined && val !== null && (Number(val) < 0 || Number(val) > 100)) {
        return `${name} must be between 0 and 100`
      }
      return null
    }

    const scoreErrors: string[] = []
    for (const [val, name] of [[caScore, 'caScore'], [examScore, 'examScore'], [testsScore, 'testsScore'], [assignmentsScore, 'assignmentsScore'], [projectsScore, 'projectsScore'], [examsScore, 'examsScore'], [attendancePercentage, 'attendancePercentage']] as [any, string][]) {
      const err = validateScore(val, name)
      if (err) scoreErrors.push(err)
    }

    if (scoreErrors.length > 0) {
      return res.status(400).json({ error: 'Score validation failed', details: scoreErrors })
    }

    try {
      const payload: ScorePayload = {
        studentId,
        subject,
        academicSession,
        term,
        class: className,
        caScore: caScore !== undefined && caScore !== null ? Number(caScore) : 0,
        examScore: examScore !== undefined && examScore !== null ? Number(examScore) : 0,
        attendancePercentage: attendancePercentage !== undefined && attendancePercentage !== null ? Number(attendancePercentage) : 0,
        testsScore: testsScore !== undefined ? Number(testsScore) : undefined,
        assignmentsScore: assignmentsScore !== undefined ? Number(assignmentsScore) : undefined,
        projectsScore: projectsScore !== undefined ? Number(projectsScore) : undefined,
        examsScore: examsScore !== undefined ? Number(examsScore) : undefined,
        submittedBy: submittedBy ?? decoded.userId,
        submittedByName: submittedByName ?? decoded.email,
        submissionStatus: submissionStatus ?? 'submitted',
      }
      const score = await createScore(tenantId, payload)
      return res.status(201).json({ data: score })
    } catch (error) {
      console.error('Error creating score:', error)
      return res.status(500).json({ error: 'Failed to create score' })
    }
  }

  if (req.method === 'PUT') {
    const { action, academicSession, term, class: className } = req.query

    if (action === 'recompute') {
      try {
        const result = await recomputeAllScores(
          tenantId,
          academicSession as string | undefined,
          term as string | undefined,
          className as string | undefined
        )
        return res.status(200).json({
          success: true,
          recomputed: result.recomputed,
          details: result.details,
        })
      } catch (error) {
        console.error('Error recomputing scores:', error)
        return res.status(500).json({ error: 'Failed to recompute scores' })
      }
    }

    if (action === 'compile') {
      const { academicSession, term, class: className } = req.query
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required for compile action' })
      }
      try {
        const result = await compileResults(
          tenantId,
          academicSession as string,
          term as string,
          className as string | undefined
        )
        return res.status(200).json({
          success: true,
          compiled: result.compiled,
          results: result.results,
        })
      } catch (error) {
        console.error('Error compiling results:', error)
        return res.status(500).json({ error: 'Failed to compile results' })
      }
    }

    if (action === 'approve') {
      const { academicSession, term, class: className } = req.query
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required for approve action' })
      }
      try {
        const approved = await approveCompiledResults(
          tenantId,
          academicSession as string,
          term as string,
          className as string | undefined
        )
        return res.status(200).json({ success: true, approved })
      } catch (error) {
        console.error('Error approving results:', error)
        return res.status(500).json({ error: 'Failed to approve results' })
      }
    }

    if (action === 'publish') {
      const { academicSession, term, class: className } = req.query
      if (!academicSession || !term) {
        return res.status(400).json({ error: 'academicSession and term are required for publish action' })
      }
      try {
        const published = await publishCompiledResults(
          tenantId,
          academicSession as string,
          term as string,
          className as string | undefined
        )
        return res.status(200).json({ success: true, published })
      } catch (error) {
        console.error('Error publishing results:', error)
        return res.status(500).json({ error: 'Failed to publish results' })
      }
    }

    return res.status(400).json({ error: 'Unknown PUT action. Use ?action=recompute, ?action=compile, ?action=approve, or ?action=publish' })
  }

  return methodNotAllowed(res)
}
