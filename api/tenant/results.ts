import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { fetchScores, createScore, fetchScoresByClassAndSubject, fetchTeacherSubmissions, recomputeAllScores, compileResults, fetchCompiledResults, approveCompiledResults, computeAttendanceBatch, fetchBroadsheet, type ScorePayload } from './_lib/results.js'
import { requireRole } from '../_lib/auth-middleware.js'
import { getAcademicSessionNames } from './_lib/academic-calendar.js'

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

/**
 * True when the staff member is allocated to this class (and subject, when
 * given) via teacher_allocation_slots — matched by teacher name, the same
 * resolution /api/staff/classes uses. Tenant admins always pass.
 *
 * Class names are normalized both sides (canonical 'JSS 1' spacing) and
 * compared symmetrically so an allocation stored as the base 'JSS 1' still
 * authorizes work on the arm-level 'JSS 1 A' and vice versa — without a
 * false match on 'JSS 11'.
 */
async function isAllocated(
  tenantId: string,
  staffId: string,
  className: string,
  subject?: string
): Promise<boolean> {
  try {
    const staffRes = await sql`SELECT name FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1`
    const staffName = staffRes.rows[0]?.name
    if (!staffName || !className) return false

    const norm = `regexp_replace(lower(regexp_replace(trim(CLASS), '\\s+', ' ', 'g')), '^([a-z]+)\\s*([0-9]+)', '\\1 \\2')`
    const normStored = norm.replaceAll('CLASS', 'tas.class')
    const normParam = norm.replaceAll('CLASS', `'${String(className).replace(/'/g, "''")}'`)

    const result = subject
      ? await sql.query(
          `SELECT 1 FROM teacher_allocation_slots tas
          WHERE tas.tenant_id = $1
            AND LOWER(tas.teacher) = LOWER($2)
            AND tas.coverage = 'Assigned'
            AND (
              ${normStored} = ${normParam}
              OR ${normParam} LIKE ${normStored} || ' %'
              OR ${normStored} LIKE ${normParam} || ' %'
            )
            AND LOWER(TRIM(tas.subject)) = LOWER(TRIM($3))
          LIMIT 1`,
          [tenantId, staffName, subject]
        ).catch(() => null)
      : await sql.query(
          `SELECT 1 FROM teacher_allocation_slots tas
          WHERE tas.tenant_id = $1
            AND LOWER(tas.teacher) = LOWER($2)
            AND tas.coverage = 'Assigned'
            AND (
              ${normStored} = ${normParam}
              OR ${normParam} LIKE ${normStored} || ' %'
              OR ${normStored} LIKE ${normParam} || ' %'
            )
          LIMIT 1`,
          [tenantId, staffName]
        )
    return !!result?.rows?.length
  } catch {
    return false
  }
}

/**
 * Compilation is the form teacher's job: when the class has a
 * form_teacher_id assigned, only that staff member may compile it.
 * Classes without a form teacher fall back to any allocated teacher.
 */
async function canCompileClass(
  tenantId: string,
  staffId: string,
  className: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const cls = await sql`
      SELECT form_teacher_id FROM classes
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
        AND lower(regexp_replace(trim(name || ' ' || coalesce(arm, '')), '\s+', ' ', 'g'))
          = lower(regexp_replace(trim(${className}), '\s+', ' ', 'g'))
      LIMIT 1
    `
    const formTeacherId = cls.rows[0]?.form_teacher_id
    if (formTeacherId) {
      return formTeacherId === staffId
        ? { allowed: true }
        : { allowed: false, reason: 'Only the assigned form teacher can compile this class' }
    }
    return (await isAllocated(tenantId, staffId, className))
      ? { allowed: true }
      : { allowed: false, reason: 'You are not allocated to this class' }
  } catch {
    return { allowed: false, reason: 'Could not verify class assignment' }
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const isAdmin = decoded.role === 'tenant_admin'
  const staffId = decoded.staffId || decoded.userId || decoded.sub || ''

  if (req.method === 'GET') {
    const { studentId, academicSession, term, class: className, action, subject } = req.query

    try {
      if (action === 'teacher-submissions') {
        if (!isAdmin) {
          if (!className) return res.status(400).json({ error: 'class is required' })
          if (!(await isAllocated(tenantId, staffId, className as string))) {
            return res.status(403).json({ error: 'You are not allocated to this class' })
          }
        }
        const submissions = await fetchTeacherSubmissions(
          tenantId,
          academicSession as string,
          term as string,
          className as string | undefined
        )
        return res.status(200).json({ data: submissions })
      }

      if (action === 'class-scores' && className && subject && academicSession && term) {
        if (!isAdmin && !(await isAllocated(tenantId, staffId, className as string, subject as string))) {
          return res.status(403).json({ error: 'You are not allocated to this class/subject' })
        }
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
        if (!isAdmin) {
          if (!className) return res.status(400).json({ error: 'class is required' })
          if (!(await isAllocated(tenantId, staffId, className as string))) {
            return res.status(403).json({ error: 'You are not allocated to this class' })
          }
        }
        const compiled = await fetchCompiledResults(
          tenantId,
          academicSession as string,
          term as string,
          className as string | undefined
        )
        return res.status(200).json({ data: compiled })
      }

      if (action === 'attendance-batch' && className && academicSession && term) {
        if (!isAdmin && !(await isAllocated(tenantId, staffId, className as string))) {
          return res.status(403).json({ error: 'You are not allocated to this class' })
        }
        const attendanceMap = await computeAttendanceBatch(
          tenantId,
          className as string,
          academicSession as string,
          term as string
        )
        return res.status(200).json({ data: attendanceMap })
      }

      if (action === 'broadsheet' && className && academicSession && term) {
        if (!isAdmin && !(await isAllocated(tenantId, staffId, className as string))) {
          return res.status(403).json({ error: 'You are not allocated to this class' })
        }
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

      // Fallback score listing — staff must scope to an allocated class.
      if (!isAdmin) {
        if (!className) return res.status(400).json({ error: 'class is required' })
        if (!(await isAllocated(tenantId, staffId, className as string))) {
          return res.status(403).json({ error: 'You are not allocated to this class' })
        }
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

    const { action } = req.query

    // ── Batch score entry: one HTTP call for a whole class sheet ──
    if (action === 'scores-batch') {
      const { class: batchClass, subject: batchSubject, academicSession: batchSession, term: batchTerm, rows } = body
      if (!batchClass || !batchSubject || !batchSession || !batchTerm || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'class, subject, academicSession, term, and a non-empty rows array are required' })
      }
      if (rows.length > 500) {
        return res.status(400).json({ error: 'Batch limited to 500 rows' })
      }
      if (!isAdmin && !(await isAllocated(tenantId, staffId, batchClass, batchSubject))) {
        return res.status(403).json({ error: 'You are not allocated to this class/subject' })
      }
      try {
        // Validate every studentId up front — a bogus id must fail its row,
        // not silently create an orphaned score.
        const candidateIds = rows.map((r: any) => r?.studentId).filter(Boolean)
        const validRes = await sql`
          SELECT id::text AS id FROM students
          WHERE tenant_id = ${tenantId} AND id::text = ANY(${candidateIds})
        `
        const validIds = new Set(validRes.rows.map((r: any) => r.id))

        let saved = 0
        const errors: Array<{ studentId: string; error: string }> = []
        for (const row of rows) {
          if (!row?.studentId) {
            errors.push({ studentId: String(row?.studentId ?? ''), error: 'missing studentId' })
            continue
          }
          if (!validIds.has(row.studentId)) {
            errors.push({ studentId: row.studentId, error: 'student not found' })
            continue
          }
          try {
            await createScore(tenantId, {
              studentId: row.studentId,
              subject: batchSubject,
              academicSession: batchSession,
              term: batchTerm,
              class: batchClass,
              caScore: 0,
              examScore: 0,
              attendancePercentage: row.attendancePercentage !== undefined ? Number(row.attendancePercentage) : 0,
              testsScore: row.testsScore !== undefined ? Number(row.testsScore) : undefined,
              assignmentsScore: row.assignmentsScore !== undefined ? Number(row.assignmentsScore) : undefined,
              projectsScore: row.projectsScore !== undefined ? Number(row.projectsScore) : undefined,
              examsScore: row.examsScore !== undefined ? Number(row.examsScore) : undefined,
              testsMax: row.testsMax !== undefined && row.testsMax !== null ? Number(row.testsMax) : undefined,
              assignmentsMax: row.assignmentsMax !== undefined && row.assignmentsMax !== null ? Number(row.assignmentsMax) : undefined,
              projectsMax: row.projectsMax !== undefined && row.projectsMax !== null ? Number(row.projectsMax) : undefined,
              examsMax: row.examsMax !== undefined && row.examsMax !== null ? Number(row.examsMax) : undefined,
              submittedBy: staffId,
              submittedByName: decoded.email || undefined,
              submissionStatus: 'submitted',
            })
            saved++
          } catch (err: any) {
            errors.push({ studentId: row.studentId, error: err?.message || 'save failed' })
          }
        }
        return res.status(errors.length && !saved ? 500 : 200).json({
          success: errors.length === 0,
          saved,
          failed: errors.length,
          errors,
        })
      } catch (error) {
        console.error('Error in scores-batch:', error)
        return res.status(500).json({ error: 'Batch save failed' })
      }
    }

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

    // Term must exist in Timetable & Scheduling (timetable_terms) — the
    // single source of truth for term names.
    try {
      const termCheck = await sql`SELECT name FROM timetable_terms WHERE tenant_id = ${tenantId}`
      const validTerms = termCheck.rows.map(r => r.name)
      if (!validTerms.includes(term)) {
        return res.status(400).json({
          error: validTerms.length === 0
            ? 'No terms configured — create terms in Timetable & Scheduling first'
            : `Invalid term — must be one of: ${validTerms.join(', ')}`,
        })
      }
    } catch (err) {
      // timetable_terms missing — skip enforcement rather than block scoring
      if ((err as any)?.code !== '42P01') throw err
    }

    // Academic session must exist in Timetable & Scheduling (academic_years).
    const validSessions = await getAcademicSessionNames(tenantId)
    if (validSessions !== null && !validSessions.includes(academicSession)) {
      return res.status(400).json({
        error: validSessions.length === 0
          ? 'No academic sessions configured — create academic years in Timetable & Scheduling first'
          : `Invalid academic session — must be one of: ${validSessions.join(', ')}`,
      })
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

    // Staff may only enter scores for classes/subjects they're allocated to.
    if (!isAdmin && !(await isAllocated(tenantId, staffId, className, subject))) {
      return res.status(403).json({ error: 'You are not allocated to this class/subject' })
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
      if (!isAdmin) {
        if (!className) return res.status(400).json({ error: 'class is required' })
        if (!(await isAllocated(tenantId, staffId, className as string))) {
          return res.status(403).json({ error: 'You are not allocated to this class' })
        }
      }
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
      if (!isAdmin) {
        if (!className) return res.status(400).json({ error: 'class is required — staff compile is per-class' })
        const check = await canCompileClass(tenantId, staffId, className as string)
        if (!check.allowed) {
          return res.status(403).json({ error: check.reason || 'You are not allowed to compile this class' })
        }
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
      // Approval is the school's sign-off gate — admins only.
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only tenant admins can approve compiled results' })
      }
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
      // Staff may only delete scores for classes/subjects they're allocated to.
      if (!isAdmin) {
        const row = await sql`
          SELECT class FROM student_scores
          WHERE tenant_id = ${tenantId} AND student_id = ${studentId as string}
            AND subject = ${subject as string} AND academic_session = ${academicSession as string}
            AND term = ${term as string}
          LIMIT 1
        `
        const scoreClass = row.rows[0]?.class
        if (!scoreClass || !(await isAllocated(tenantId, staffId, scoreClass, subject as string))) {
          return res.status(403).json({ error: 'You are not allocated to this class/subject' })
        }
      }

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
