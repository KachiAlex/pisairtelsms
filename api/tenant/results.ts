import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { fetchScores, createScore, fetchScoresByClassAndSubject, fetchTeacherSubmissions, recomputeAllScores, compileResults, fetchCompiledResults, approveCompiledResults, computeAttendanceBatch, fetchBroadsheet, type ScorePayload } from './_lib/results.js'
import { requireRole } from '../_lib/auth-middleware.js'

function methodNotAllowed(res: ApiResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: ApiRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return req.body
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
      testsMax, assignmentsMax, projectsMax, examsMax,
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

    // Validate score ranges. When a "marked out of" max is supplied the value
    // is a raw mark and is validated against that max; otherwise the legacy
    // 0-100 normalized range applies.
    const scoreErrors: string[] = []
    const validateScore = (val: any, name: string, max?: any) => {
      if (val === undefined || val === null) return
      const hasMax = max !== undefined && max !== null
      if (hasMax && !(Number(max) > 0)) {
        scoreErrors.push(`${name}Max must be a positive number`)
        return
      }
      const limit = hasMax ? Number(max) : 100
      if (Number(val) < 0 || Number(val) > limit) {
        scoreErrors.push(`${name} must be between 0 and ${limit}`)
      }
    }

    validateScore(caScore, 'caScore')
    validateScore(examScore, 'examScore')
    validateScore(testsScore, 'testsScore', testsMax)
    validateScore(assignmentsScore, 'assignmentsScore', assignmentsMax)
    validateScore(projectsScore, 'projectsScore', projectsMax)
    validateScore(examsScore, 'examsScore', examsMax)
    validateScore(attendancePercentage, 'attendancePercentage')

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
        testsMax: testsMax !== undefined && testsMax !== null ? Number(testsMax) : undefined,
        assignmentsMax: assignmentsMax !== undefined && assignmentsMax !== null ? Number(assignmentsMax) : undefined,
        projectsMax: projectsMax !== undefined && projectsMax !== null ? Number(projectsMax) : undefined,
        examsMax: examsMax !== undefined && examsMax !== null ? Number(examsMax) : undefined,
        // Always derive submitter identity from JWT (authoritative), not from body
        submittedBy: decoded.staffId || decoded.userId || decoded.sub,
        submittedByName: decoded.email || undefined,
        // Always set to 'submitted' — workflow transitions (approve, publish)
        // are handled by dedicated endpoints, not by the score entry endpoint.
        submissionStatus: 'submitted',
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

    // Note: Publishing is handled by the dedicated result-publishing-handler endpoint.
    // Use POST /api/tenant/result-publishing-handler?action=publish instead.

    return res.status(400).json({ error: 'Unknown PUT action. Use ?action=recompute, ?action=compile, or ?action=approve. For publishing, use /api/tenant/result-publishing-handler?action=publish' })
  }

  if (req.method === 'DELETE') {
    const { studentId, subject, academicSession, term } = req.query

    if (!studentId || !subject || !academicSession || !term) {
      return res.status(400).json({ error: 'studentId, subject, academicSession, and term are required for score deletion' })
    }

    try {
      // Only allow deleting scores that haven't been compiled yet
      const compiledCheck = await sql`
        SELECT COUNT(*)::int AS n FROM compiled_results
        WHERE tenant_id = ${tenantId}
          AND student_id = ${studentId as string}
          AND subject = ${subject as string}
          AND academic_session = ${academicSession as string}
          AND term = ${term as string}
          AND status IN ('approved', 'published')
      `
      if ((compiledCheck.rows[0]?.n ?? 0) > 0) {
        return res.status(409).json({ error: 'Cannot delete a score that has been approved or published. Unpublish first.' })
      }

      const result = await sql`
        DELETE FROM student_scores
        WHERE tenant_id = ${tenantId}
          AND student_id = ${studentId as string}
          AND subject = ${subject as string}
          AND academic_session = ${academicSession as string}
          AND term = ${term as string}
        RETURNING id
      `
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Score not found' })
      }

      // Audit trail — log the deletion (best-effort)
      try {
        await sql`
          INSERT INTO student_scores_audit
            (tenant_id, student_id, subject, academic_session, term, action, actor_id, actor_name)
          VALUES (${tenantId}, ${studentId as string}, ${subject as string},
                  ${academicSession as string}, ${term as string}, 'delete',
                  ${decoded.userId || ''}, ${decoded.email || ''})
        `
      } catch { /* audit table may not exist yet — non-critical */ }

      return res.status(200).json({ success: true, deleted: result.rows.length })
    } catch (error) {
      console.error('Error deleting score:', error)
      return res.status(500).json({ error: 'Failed to delete score' })
    }
  }

  return methodNotAllowed(res)
}
