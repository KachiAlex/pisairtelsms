import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

/**
 * /api/tenant/lesson-notes — teacher lesson notes with admin vetting.
 *
 *   GET    ?id | ?subject&class&session&term&status — staff see their own,
 *          tenant_admin sees all. ?status=submitted is the review queue.
 *   POST   {subject,class,session,term,week,title,content,link?,topic?,
 *           schemeTopicId?}                          — staff create a draft
 *   PUT    ?id                                      — owner edits draft/returned
 *   PUT    ?id&action=submit                        — owner: draft|returned → submitted
 *   PUT    ?id&action=approve                       — admin: submitted → approved
 *   PUT    ?id&action=return   {comment}            — admin: submitted → returned
 *   PUT    ?id&action=mark-taught                   — owner: approved → taught
 *   DELETE ?id                                      — owner/admin, drafts only
 *
 * Staff may only write notes for a class+subject they are allocated to in
 * teacher_allocation_slots — unless the school has configured no allocations
 * for that teacher at all (then the feature stays usable).
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return
  const tenantId = decoded.tenantId || 'default-tenant'
  const isAdmin = decoded.role === 'tenant_admin'
  const staffId = decoded.staffId || decoded.userId

  async function myName(): Promise<string | null> {
    const r = await sql`SELECT name FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1`
    return r.rows[0]?.name || null
  }

  async function staffTeaches(subject: string, className: string): Promise<boolean> {
    if (isAdmin) return true
    const name = await myName()
    if (!name) return false
    const mine = await sql`
      SELECT COUNT(*)::int AS n FROM teacher_allocation_slots
      WHERE tenant_id = ${tenantId} AND LOWER(teacher) = LOWER(${name}) AND coverage = 'Assigned'`
      .catch(() => ({ rows: [{ n: 0 }] }))
    if (mine.rows[0].n === 0) return true // allocations not configured — don't hard-block
    const base = className.replace(/\s+[A-Z]$/, '')
    const ok = await sql`
      SELECT 1 FROM teacher_allocation_slots tas
      WHERE tas.tenant_id = ${tenantId} AND LOWER(tas.teacher) = LOWER(${name})
        AND tas.coverage = 'Assigned'
        AND (tas.class = ${className} OR tas.class = ${base})
        AND LOWER(tas.subject) = LOWER(${subject})
      LIMIT 1`.catch(() => ({ rows: [] as any[] }))
    return ok.rows.length > 0
  }

  async function loadNote(id: string) {
    const r = await sql`
      SELECT n.*, s.name AS reviewer_name
      FROM lesson_notes n LEFT JOIN staff s ON s.id = n.reviewed_by AND s.tenant_id = n.tenant_id
      WHERE n.id = ${id} AND n.tenant_id = ${tenantId} LIMIT 1`
    return r.rows[0] || null
  }

  try {
    if (req.method === 'GET') {
      const q = req.query as Record<string, string | undefined>
      if (q.id) {
        const note = await loadNote(q.id)
        if (!note) return res.status(404).json({ error: 'Note not found' })
        if (!isAdmin && note.staff_id !== staffId) {
          return res.status(403).json({ error: 'You can only view your own notes' })
        }
        return res.status(200).json({ data: note })
      }
      const conditions = ['tenant_id = $1']
      const params: any[] = [tenantId]
      if (!isAdmin) {
        params.push(staffId)
        conditions.push(`staff_id = $${params.length}`)
      }
      for (const [col, val] of [['subject', q.subject], ['class', q.class], ['session', q.session], ['term', q.term], ['status', q.status]] as const) {
        if (val) {
          params.push(val)
          conditions.push(`${col} = $${params.length}`)
        }
      }
      const rows = await sql.query(
        `SELECT id::text, staff_id, staff_name, subject, class, session, term, week, topic,
                scheme_topic_id::text, title, link, status, submitted_at, reviewed_at,
                review_comment, taught_at, updated_at,
                LEFT(content, 300) AS excerpt
         FROM lesson_notes WHERE ${conditions.join(' AND ')}
         ORDER BY week ASC, updated_at DESC LIMIT 200`, params)
      return res.status(200).json({ data: rows.rows })
    }

    if (req.method === 'POST') {
      const { subject, class: className, session, term, week, title, content, link, topic, schemeTopicId } = req.body || {}
      const wk = Number(week)
      if (!subject || !className || !session || !term || !title || !content || !Number.isInteger(wk) || wk < 1 || wk > 20) {
        return res.status(400).json({ error: 'subject, class, session, term, week (1-20), title, and content are required' })
      }
      if (!(await staffTeaches(subject, className))) {
        return res.status(403).json({ error: 'You are not allocated to teach this subject in this class' })
      }
      const name = await myName()
      const r = await sql`
        INSERT INTO lesson_notes
          (tenant_id, staff_id, staff_name, subject, class, session, term, week, topic,
           scheme_topic_id, title, content, link)
        VALUES (${tenantId}, ${staffId}, ${name}, ${subject}, ${className}, ${session}, ${term},
                ${wk}, ${topic || null}, ${schemeTopicId || null}, ${title}, ${content}, ${link || null})
        RETURNING id::text, status`
      return res.status(201).json({ data: r.rows[0] })
    }

    if (req.method === 'PUT') {
      const { id, action } = req.query as { id?: string; action?: string }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const note = await loadNote(id)
      if (!note) return res.status(404).json({ error: 'Note not found' })

      if (action === 'submit') {
        if (note.staff_id !== staffId) return res.status(403).json({ error: 'Only the author can submit this note' })
        if (note.status !== 'draft' && note.status !== 'returned') {
          return res.status(409).json({ error: `Cannot submit a ${note.status} note` })
        }
        await sql`
          UPDATE lesson_notes SET status = 'submitted', submitted_at = now(),
            review_comment = NULL, updated_at = now()
          WHERE id = ${id}`
        return res.status(200).json({ success: true, status: 'submitted' })
      }

      if (action === 'approve' || action === 'return') {
        if (!isAdmin) return res.status(403).json({ error: 'Only admins can review notes' })
        if (note.status !== 'submitted') {
          return res.status(409).json({ error: `Cannot review a ${note.status} note` })
        }
        const comment = (req.body as any)?.comment || null
        if (action === 'return' && !comment) {
          return res.status(400).json({ error: 'A comment is required when returning a note' })
        }
        await sql`
          UPDATE lesson_notes
          SET status = ${action === 'approve' ? 'approved' : 'returned'},
              reviewed_by = ${staffId}, review_comment = ${comment},
              reviewed_at = now(), updated_at = now()
          WHERE id = ${id}`
        return res.status(200).json({ success: true, status: action === 'approve' ? 'approved' : 'returned' })
      }

      if (action === 'mark-taught') {
        if (note.staff_id !== staffId) return res.status(403).json({ error: 'Only the author can mark this note' })
        if (note.status !== 'approved') {
          return res.status(409).json({ error: 'Only approved notes can be marked as taught' })
        }
        await sql`UPDATE lesson_notes SET taught_at = now(), updated_at = now() WHERE id = ${id}`
        return res.status(200).json({ success: true, taught: true })
      }

      // Plain edit — owner only, draft/returned only
      if (note.staff_id !== staffId) return res.status(403).json({ error: 'Only the author can edit this note' })
      if (note.status !== 'draft' && note.status !== 'returned') {
        return res.status(409).json({ error: `A ${note.status} note cannot be edited` })
      }
      const { title, content, link, topic } = req.body || {}
      await sql`
        UPDATE lesson_notes
        SET title = COALESCE(${title ?? null}, title),
            content = COALESCE(${content ?? null}, content),
            link = ${link === undefined ? note.link : link},
            topic = ${topic === undefined ? note.topic : topic},
            updated_at = now()
        WHERE id = ${id}`
      return res.status(200).json({ success: true })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query as { id?: string }
      if (!id) return res.status(400).json({ error: 'id is required' })
      const note = await loadNote(id)
      if (!note) return res.status(404).json({ error: 'Note not found' })
      if (!isAdmin && note.staff_id !== staffId) return res.status(403).json({ error: 'Only the author can delete this note' })
      if (note.status !== 'draft') {
        return res.status(409).json({ error: 'Only drafts can be deleted' })
      }
      await sql`DELETE FROM lesson_notes WHERE id = ${id}`
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Lesson notes error:', error)
    return res.status(500).json({ error: 'Failed to process lesson note request' })
  }
}
