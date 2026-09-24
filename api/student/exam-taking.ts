import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * /api/student/exams/:examId/<action>
 *
 * Student-facing CBT exam player API:
 *   GET  ?examId&action=paper    — sanitized exam paper (no correct answers,
 *                                  no isCorrect flags) + security settings +
 *                                  existing progress/result state
 *   POST ?examId&action=start    — open a sitting: validates eligibility and
 *                                  creates/resumes student_exam_progress
 *   PUT  ?examId&action=progress — autosave { answers, currentQuestion }
 *   POST ?examId&action=submit   — grade answers and persist exam_results +
 *                                  student_answers; idempotent
 *
 * Eligibility: exam status must be 'Ongoing' and the student's class must
 * match the exam's class (base-class match so 'JSS 1 A' sits a 'JSS 1' exam).
 * If a security_settings.exam_password is configured it must be supplied on
 * start. allowed_ips (if non-empty) is enforced against the client IP.
 */

interface SecuritySettings {
  enable_proctoring: boolean
  disable_copy_paste: boolean
  disable_right_click: boolean
  require_camera: boolean
  randomize_questions: boolean
  randomize_options: boolean
  exam_password: string | null
  allowed_ips: string[] | null
}

interface PaperQuestion {
  id: string
  order: number
  text: string
  type: 'objective' | 'truefalse' | 'essay'
  options: { key: string; text: string }[] | null
  marks: number
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Deterministic shuffle seeded by a stable key — same order on every load
// for a given student+exam, so refreshes don't reshuffle.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995)
    const j = Math.abs(h) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Normalize both persisted option shapes (string[] and {id,text,isCorrect}[])
// into {key,text} with the original positional key, WITHOUT leaking isCorrect.
function normalizeOptions(raw: unknown): { key: string; text: string }[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  return raw.map((opt: any, i: number) => ({
    key: LETTERS[i] || String(i + 1),
    text: typeof opt === 'string' ? opt : String(opt?.text ?? ''),
  }))
}

function classMatches(studentClass: string, examClass: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const sc = norm(studentClass)
  const ec = norm(examClass)
  // 'JSS1A' student may sit a 'JSS1' exam, not the reverse
  return sc === ec || sc.startsWith(ec)
}

function timeRemainingSec(examDurationMin: number, startedAt: Date | null): number {
  if (!startedAt) return examDurationMin * 60
  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
  return Math.max(0, examDurationMin * 60 - elapsed)
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['student'])
  if (!decoded) return
  const studentId = decoded.studentId || decoded.userId
  const tenantId = decoded.tenantId || 'default-tenant'
  if (!studentId) return res.status(401).json({ error: 'Invalid token payload' })

  const { examId, action } = req.query as { examId?: string; action?: string }
  if (!examId || !action) return res.status(400).json({ error: 'examId and action are required' })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId)) {
    return res.status(400).json({ error: 'Invalid exam id' })
  }

  try {
    // Exam must exist in this tenant and not be deleted
    const examRes = await sql`
      SELECT id::text, title, subject, class, description, duration, pass_mark,
             total_marks, status, scheduled_date::text AS scheduled_date,
             scheduled_time::text AS scheduled_time
      FROM exams
      WHERE id = ${examId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
      LIMIT 1`
    const exam = examRes.rows[0]
    if (!exam) return res.status(404).json({ error: 'Exam not found' })

    const stuRes = await sql`
      SELECT class FROM students
      WHERE id::text = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
      LIMIT 1`
    const studentClass = stuRes.rows[0]?.class || ''
    // Blank exam class = open to all students in the tenant (matches the
    // listing rule in api/student/exams.ts)
    if (exam.class && !classMatches(studentClass, exam.class)) {
      return res.status(403).json({ error: 'This exam is not assigned to your class' })
    }

    const secRes = await sql`
      SELECT enable_proctoring, disable_copy_paste, disable_right_click,
             require_camera, randomize_questions, randomize_options,
             exam_password, allowed_ips
      FROM security_settings WHERE exam_id = ${examId} LIMIT 1`
    const sec: SecuritySettings = secRes.rows[0] || {
      enable_proctoring: false, disable_copy_paste: false, disable_right_click: false,
      require_camera: false, randomize_questions: false, randomize_options: false,
      exam_password: null, allowed_ips: null,
    }

    const progRes = await sql`
      SELECT status, answers, current_question, started_at, questions_answered
      FROM student_exam_progress
      WHERE exam_id = ${examId} AND student_id = ${studentId}
      LIMIT 1`
    const progress = progRes.rows[0] || null

    const resultRes = await sql`
      SELECT id::text, score, total_marks, percentage, status, time_spent, submitted_at
      FROM exam_results
      WHERE exam_id = ${examId} AND student_id = ${studentId}
      LIMIT 1`
    const existingResult = resultRes.rows[0] || null

    // ---- GET paper -----------------------------------------------------------
    if (req.method === 'GET' && action === 'paper') {
      if (existingResult) {
        return res.status(200).json({
          exam: publicExam(exam), state: 'submitted', result: existingResult,
        })
      }

      // Question content is only served once the sitting is open or the
      // student already has a sitting — prevents scraping papers early.
      const sittingOpen = exam.status === 'Ongoing' || progress != null
      const qRes = sittingOpen
        ? await sql`
            SELECT qb.id::text, eq.question_order, qb.text, qb.type, qb.options, eq.marks
            FROM exam_questions eq
            JOIN questions_bank qb ON qb.id = eq.question_id AND qb.deleted_at IS NULL
            WHERE eq.exam_id = ${examId}
            ORDER BY eq.question_order ASC`
        : await sql`
            SELECT COUNT(*)::int AS count FROM exam_questions WHERE exam_id = ${examId}`

      let questions: PaperQuestion[] = sittingOpen
        ? qRes.rows.map((r: any) => ({
            id: r.id,
            order: r.question_order,
            text: r.text,
            type: r.type,
            options: normalizeOptions(r.options),
            marks: Number(r.marks),
          }))
        : []

      const seed = `${studentId}:${examId}`
      if (sec.randomize_options) {
        questions = questions.map((q) =>
          q.options ? { ...q, options: seededShuffle(q.options, seed + q.id) } : q
        )
      }
      if (sec.randomize_questions) {
        questions = seededShuffle(questions, seed)
      }

      const startedAt = progress?.started_at ? new Date(progress.started_at) : null
      return res.status(200).json({
        exam: publicExam(exam),
        state: progress ? 'in-progress' : sittingOpen ? 'ready' : 'not-open',
        questionCount: sittingOpen ? questions.length : Number(qRes.rows[0]?.count || 0),
        questions,
        security: {
          enableProctoring: sec.enable_proctoring,
          disableCopyPaste: sec.disable_copy_paste,
          disableRightClick: sec.disable_right_click,
          requireCamera: sec.require_camera,
          requiresPassword: Boolean(sec.exam_password),
        },
        progress: progress
          ? {
              answers: progress.answers || {},
              currentQuestion: progress.current_question || 0,
              timeRemainingSec: timeRemainingSec(exam.duration, startedAt),
            }
          : null,
      })
    }

    // ---- POST start ----------------------------------------------------------
    if (req.method === 'POST' && action === 'start') {
      if (existingResult) {
        return res.status(409).json({ error: 'You have already submitted this exam' })
      }
      if (exam.status !== 'Ongoing') {
        return res.status(409).json({
          error:
            exam.status === 'Scheduled'
              ? 'This exam has not been opened by staff yet'
              : 'This exam is no longer open',
        })
      }
      if (sec.exam_password) {
        const supplied = (req.body as any)?.password
        if (supplied !== sec.exam_password) {
          return res.status(403).json({ error: 'Incorrect exam password' })
        }
      }
      if (Array.isArray(sec.allowed_ips) && sec.allowed_ips.length > 0) {
        const ip =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          (req.socket as any)?.remoteAddress ||
          ''
        if (!sec.allowed_ips.includes(ip)) {
          return res.status(403).json({ error: 'This exam cannot be taken from your current network' })
        }
      }

      // Resume if a sitting already exists; otherwise create one (started_at
      // is set only on first start so the clock can't be reset by re-entry).
      if (!progress) {
        await sql`
          INSERT INTO student_exam_progress
            (exam_id, student_id, status, started_at, time_remaining, last_activity_time)
          VALUES (${examId}, ${studentId}, 'Active', NOW(), ${exam.duration * 60}, NOW())
          ON CONFLICT (exam_id, student_id) DO NOTHING`
      } else if (progress.status === 'Completed' || progress.status === 'Flagged') {
        return res.status(409).json({
          error:
            progress.status === 'Flagged'
              ? 'This exam sitting was flagged. Contact your teacher.'
              : 'You have already completed this exam',
        })
      } else {
        await sql`
          UPDATE student_exam_progress
          SET status = 'Active', last_activity_time = NOW()
          WHERE exam_id = ${examId} AND student_id = ${studentId}`
      }

      const fresh = await sql`
        SELECT started_at FROM student_exam_progress
        WHERE exam_id = ${examId} AND student_id = ${studentId} LIMIT 1`
      return res.status(200).json({
        success: true,
        timeRemainingSec: timeRemainingSec(exam.duration, fresh.rows[0]?.started_at ? new Date(fresh.rows[0].started_at) : null),
      })
    }

    // ---- PUT progress (autosave) ----------------------------------------------
    if (req.method === 'PUT' && action === 'progress') {
      if (!progress || progress.status !== 'Active') {
        return res.status(409).json({ error: 'No active exam sitting to save' })
      }
      if (existingResult) {
        return res.status(409).json({ error: 'Exam already submitted' })
      }
      const body = (req.body ?? {}) as { answers?: Record<string, string>; currentQuestion?: number }
      const answers = body.answers && typeof body.answers === 'object' ? body.answers : {}
      const currentQuestion = Number.isInteger(body.currentQuestion) ? body.currentQuestion : 0
      const answered = Object.values(answers).filter((v) => v != null && v !== '').length
      const remaining = timeRemainingSec(exam.duration, new Date(progress.started_at))

      await sql`
        UPDATE student_exam_progress
        SET answers = ${JSON.stringify(answers)},
            current_question = ${currentQuestion},
            questions_answered = ${answered},
            time_remaining = ${remaining},
            last_activity_time = NOW(),
            updated_at = NOW()
        WHERE exam_id = ${examId} AND student_id = ${studentId}`
      return res.status(200).json({ success: true, timeRemainingSec: remaining })
    }

    // ---- POST submit -----------------------------------------------------------
    if (req.method === 'POST' && action === 'submit') {
      // Idempotent: a second submit returns the existing result
      if (existingResult) {
        return res.status(200).json({ success: true, result: existingResult, alreadySubmitted: true })
      }
      if (!progress) {
        return res.status(409).json({ error: 'No exam sitting found — start the exam first' })
      }

      const body = (req.body ?? {}) as { answers?: Record<string, string> }
      // Prefer submitted answers; fall back to the last autosaved draft
      const answers: Record<string, string> =
        body.answers && typeof body.answers === 'object' && Object.keys(body.answers).length > 0
          ? body.answers
          : (progress.answers as Record<string, string>) || {}

      const qRes = await sql`
        SELECT qb.id::text, qb.type, qb.options, qb.correct_answer, eq.marks
        FROM exam_questions eq
        JOIN questions_bank qb ON qb.id = eq.question_id AND qb.deleted_at IS NULL
        WHERE eq.exam_id = ${examId}`

      let score = 0
      let totalMarks = 0
      let hasEssay = false
      const answerRows: {
        questionId: string; studentAnswer: string | null; correctAnswer: string | null
        isCorrect: boolean; marksObtained: number; totalMarks: number
      }[] = []

      for (const q of qRes.rows as any[]) {
        const marks = Number(q.marks)
        totalMarks += marks
        const given = answers[q.id] ?? null

        if (q.type === 'essay') {
          hasEssay = true
          answerRows.push({
            questionId: q.id, studentAnswer: given, correctAnswer: null,
            isCorrect: false, marksObtained: 0, totalMarks: marks,
          })
          continue
        }

        const { correct, correctKey } = resolveCorrect(q.correct_answer, q.options)
        let isCorrect = false
        if (given != null && q.type === 'truefalse') {
          isCorrect = String(given).trim().toLowerCase() === String(correct).trim().toLowerCase()
        } else if (given != null) {
          // Student submits the option key ('A'..'Z') as displayed originally;
          // also accept exact option-text match for robustness.
          if (correctKey && String(given).trim().toUpperCase() === correctKey) {
            isCorrect = true
          } else {
            const opts = normalizeOptions(q.options) || []
            const selected = opts.find((o) => o.key === String(given).trim().toUpperCase())
            const givenText = selected ? selected.text : String(given)
            isCorrect = givenText.trim().toLowerCase() === String(correct).trim().toLowerCase()
          }
        }
        const marksObtained = isCorrect ? marks : 0
        score += marksObtained
        answerRows.push({
          questionId: q.id, studentAnswer: given, correctAnswer: correct,
          isCorrect, marksObtained, totalMarks: marks,
        })
      }

      const effectiveTotal = totalMarks > 0 ? totalMarks : Number(exam.total_marks)
      const percentage = effectiveTotal > 0 ? (score / effectiveTotal) * 100 : 0
      const startedAt = progress.started_at ? new Date(progress.started_at) : new Date()
      const timeSpent = Math.min(
        Math.floor((Date.now() - startedAt.getTime()) / 1000),
        exam.duration * 60
      )
      const resultStatus = hasEssay
        ? 'Pending'
        : percentage >= Number(exam.pass_mark)
          ? 'Passed'
          : 'Failed'

      const ins = await sql`
        INSERT INTO exam_results (exam_id, student_id, score, total_marks, percentage, status, time_spent)
        VALUES (${examId}, ${studentId}, ${score}, ${effectiveTotal}, ${percentage}, ${resultStatus}, ${timeSpent})
        ON CONFLICT (exam_id, student_id) DO NOTHING
        RETURNING id::text, score, total_marks, percentage, status, time_spent, submitted_at`
      const result = ins.rows[0] || existingResult
      if (!result) {
        // Lost the ON CONFLICT race — fetch the winner
        const again = await sql`
          SELECT id::text, score, total_marks, percentage, status, time_spent, submitted_at
          FROM exam_results WHERE exam_id = ${examId} AND student_id = ${studentId} LIMIT 1`
        return res.status(200).json({ success: true, result: again.rows[0], alreadySubmitted: true })
      }

      for (const a of answerRows) {
        await sql`
          INSERT INTO student_answers
            (result_id, question_id, student_answer, correct_answer, is_correct, marks_obtained, total_marks)
          VALUES (${result.id}, ${a.questionId}, ${a.studentAnswer}, ${a.correctAnswer},
                  ${a.isCorrect}, ${a.marksObtained}, ${a.totalMarks})`
      }

      await sql`
        UPDATE student_exam_progress
        SET status = 'Completed', questions_answered = ${answerRows.filter((a) => a.studentAnswer != null && a.studentAnswer !== '').length},
            time_remaining = ${timeRemainingSec(exam.duration, startedAt)},
            last_activity_time = NOW(), updated_at = NOW()
        WHERE exam_id = ${examId} AND student_id = ${studentId}`

      return res.status(200).json({ success: true, result })
    }

    res.setHeader('Allow', 'GET, POST, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Exam-taking error:', error)
    return res.status(500).json({ error: 'Failed to process exam request' })
  }
}

function publicExam(exam: any) {
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    class: exam.class,
    description: exam.description || '',
    duration: exam.duration,
    totalMarks: Number(exam.total_marks),
    passMark: Number(exam.pass_mark),
    status: exam.status,
    scheduledDate: exam.scheduled_date,
    scheduledTime: exam.scheduled_time,
  }
}

// Resolve the correct answer across both persisted shapes:
//   options = ['6','7','8','9'], correct_answer = '8'      → value match
//   options = [{id,text,isCorrect}], correct_answer = 'B'  → letter, or isCorrect flag
function resolveCorrect(
  correctAnswer: string | null,
  rawOptions: unknown
): { correct: string | null; correctKey: string | null } {
  if (Array.isArray(rawOptions) && rawOptions.length && typeof rawOptions[0] === 'object') {
    const idx = (rawOptions as any[]).findIndex((o) => o?.isCorrect === true)
    if (idx >= 0) {
      return { correct: String(rawOptions[idx].text ?? ''), correctKey: LETTERS[idx] }
    }
  }
  const opts = normalizeOptions(rawOptions) || []
  const ca = (correctAnswer ?? '').trim()
  if (/^[A-Z]$/i.test(ca)) {
    const idx = LETTERS.indexOf(ca.toUpperCase())
    if (idx >= 0 && idx < opts.length) {
      return { correct: opts[idx].text, correctKey: ca.toUpperCase() }
    }
    return { correct: ca, correctKey: ca.toUpperCase() }
  }
  // Value-style correct answer ('8', 'True', ...)
  const idx = opts.findIndex((o) => o.text.trim().toLowerCase() === ca.toLowerCase())
  return { correct: ca || null, correctKey: idx >= 0 ? opts[idx].key : null }
}
