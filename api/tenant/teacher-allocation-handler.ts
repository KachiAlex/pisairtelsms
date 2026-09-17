import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireRole } from '../_lib/auth-middleware.js'

// staff.subjects is a TEXT column holding a JSON array — parse it safely.
function parseSubjectList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Require authentication - only staff or tenant_admin can access tenant teacher allocation
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  const action = req.query['action'] as string

  try {
    if (action === 'coverage-stats' && req.method === 'GET') {
      try {
        const total = await sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}`
        const assigned = await sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId} AND coverage = 'Assigned'`
        const open = await sql`SELECT COUNT(*)::int AS n FROM teacher_allocation_slots WHERE tenant_id = ${tenantId} AND coverage = 'Open'`
        const overload = await sql`SELECT COUNT(*)::int AS n FROM staff WHERE tenant_id = ${tenantId} AND risk_flag = 'Overload'`
        return res.json({
          success: true,
          data: [
            { label: 'Total slots', value: String(total.rows[0]?.n ?? 0), detail: 'Timetable entries', color: 'bg-blue-500' },
            { label: 'Assigned', value: String(assigned.rows[0]?.n ?? 0), detail: 'Covered slots', color: 'bg-emerald-500' },
            { label: 'Open slots', value: String(open.rows[0]?.n ?? 0), detail: 'Needing cover', color: 'bg-amber-500' },
            { label: 'Overloaded', value: String(overload.rows[0]?.n ?? 0), detail: 'Teachers at risk', color: 'bg-rose-500' },
          ],
        })
      } catch (e) {
        console.error('coverage-stats error:', e)
        return res.json({ success: true, data: [
          { label: 'Total slots', value: '0', detail: 'Timetable entries', color: 'bg-blue-500' },
          { label: 'Assigned', value: '0', detail: 'Covered slots', color: 'bg-emerald-500' },
          { label: 'Open slots', value: '0', detail: 'Needing cover', color: 'bg-amber-500' },
          { label: 'Overloaded', value: '0', detail: 'Teachers at risk', color: 'bg-rose-500' },
        ] })
      }
    }

    if (action === 'teachers' && req.method === 'GET') {
      try {
        const r = await sql`
          SELECT name, level, risk_flag AS risk,
                 subjects, allocation_periods AS allocation, contract_hours AS "contractHours"
          FROM staff
          WHERE tenant_id = ${tenantId} AND role ILIKE '%teacher%'
          ORDER BY name ASC LIMIT 50`
        // subjects column is TEXT holding a JSON array — parse it safely
        const data = r.rows.map((row: any) => ({
          ...row,
          subjects: parseSubjectList(row.subjects),
        }))
        return res.json({ success: true, data })
      } catch (e) {
        console.error('teachers query error:', e)
        return res.json({ success: true, data: [] })
      }
    }

    if (action === 'matrix' && req.method === 'GET') {
      try {
        const r = await sql`
          SELECT class, subject, teacher, coverage, warnings
          FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}
          ORDER BY class ASC, subject ASC`
        return res.json({ success: true, data: r.rows })
      } catch (e) {
        console.error('matrix query error:', e)
        return res.json({ success: true, data: [] })
      }
    }

    if (action === 'open-periods' && req.method === 'GET') {
      try {
        const r = await sql`
          SELECT day_of_week AS day, COUNT(*)::int AS periods
          FROM teacher_allocation_slots
          WHERE tenant_id = ${tenantId} AND coverage = 'Open'
          GROUP BY day_of_week ORDER BY day_of_week ASC`
        return res.json({ success: true, data: r.rows })
      } catch (e) {
        console.error('open-periods query error:', e)
        return res.json({ success: true, data: [] })
      }
    }

    if (action === 'substitution-log' && req.method === 'GET') {
      try {
        const r = await sql`
          SELECT slot, priority, action, relief, eta, impacted
          FROM teacher_substitution_log WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT 20`
        // impacted is TEXT in the DB; split into an array for the client.
        const data = r.rows.map((row: any) => ({
          ...row,
          impacted: row.impacted
            ? String(row.impacted).split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        }))
        return res.json({ success: true, data })
      } catch (e) {
        console.error('substitution-log query error:', e)
        return res.json({ success: true, data: [] })
      }
    }

    if (action === 'assign' && req.method === 'POST') {
      try {
        const { assignments } = req.body as { assignments: { class: string; subject: string; teacher: string }[] }
        if (!Array.isArray(assignments) || assignments.length === 0) {
          return res.status(400).json({ success: false, error: 'No assignments provided' })
        }
        // Validate that each teacher exists in this tenant before assigning.
        const teacherNames = Array.from(new Set(assignments.map(a => a.teacher).filter(Boolean)))
        if (teacherNames.length > 0) {
          const validTeachers = await sql`
            SELECT name FROM staff
            WHERE tenant_id = ${tenantId} AND role ILIKE '%teacher%'
              AND name = ANY(${teacherNames}::text[])`
          const validSet = new Set(validTeachers.rows.map((r: any) => r.name))
          const invalid = teacherNames.filter(n => !validSet.has(n))
          if (invalid.length > 0) {
            return res.status(400).json({ success: false, error: `Teacher(s) not found in this tenant: ${invalid.join(', ')}` })
          }
        }
        for (const a of assignments) {
          const teacherName = a.teacher || ''
          await sql`
            UPDATE teacher_allocation_slots
            SET teacher = NULLIF(${teacherName}, ''),
                coverage = CASE WHEN ${teacherName} = '' THEN 'Open' ELSE 'Assigned' END,
                warnings = GREATEST(warnings - 1, 0)
            WHERE tenant_id = ${tenantId} AND class = ${a.class} AND subject = ${a.subject}`
        }
        // Recompute allocation_periods / risk_flag for affected teachers.
        await sql`
          UPDATE staff s SET
            allocation_periods = COALESCE((
              SELECT COUNT(*) FROM teacher_allocation_slots tas
              WHERE tas.teacher = s.name AND tas.coverage = 'Assigned' AND tas.tenant_id = ${tenantId}
            ), 0),
            risk_flag = CASE
              WHEN COALESCE((
                SELECT COUNT(*) FROM teacher_allocation_slots tas
                WHERE tas.teacher = s.name AND tas.coverage = 'Assigned' AND tas.tenant_id = ${tenantId}
              ), 0) > contract_hours AND contract_hours > 0 THEN 'Overload'
              ELSE 'Normal'
            END
          WHERE s.tenant_id = ${tenantId} AND s.role ILIKE '%teacher%'`
        const updated = await sql`
          SELECT class, subject, teacher, coverage, warnings
          FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}
          ORDER BY class ASC, subject ASC`
        return res.json({ success: true, data: updated.rows })
      } catch (e) {
        console.error('assign error:', e)
        return res.status(500).json({ success: false, error: 'Failed to assign' })
      }
    }

    if (action === 'substitute' && req.method === 'POST') {
      try {
        // Cover an absent teacher: reassign their slots to substitutes and
        // record each cover in teacher_substitution_log.
        const { absentTeacher, covers } = req.body as {
          absentTeacher: string
          covers: { class: string; subject: string; substitute: string }[]
        }
        if (!absentTeacher || !Array.isArray(covers) || covers.length === 0) {
          return res.status(400).json({ success: false, error: 'absentTeacher and covers are required' })
        }

        const names = Array.from(new Set([absentTeacher, ...covers.map(c => c.substitute).filter(Boolean)]))
        const validTeachers = await sql`
          SELECT name FROM staff
          WHERE tenant_id = ${tenantId} AND role ILIKE '%teacher%'
            AND name = ANY(${names}::text[])`
        const validSet = new Set(validTeachers.rows.map((r: any) => r.name))
        const invalid = names.filter(n => !validSet.has(n))
        if (invalid.length > 0) {
          return res.status(400).json({ success: false, error: `Teacher(s) not found in this tenant: ${invalid.join(', ')}` })
        }

        let covered = 0
        let skipped = 0
        for (const c of covers) {
          // Guard: only cover slots the absent teacher still holds.
          const upd = await sql`
            UPDATE teacher_allocation_slots
            SET teacher = ${c.substitute}, coverage = 'Assigned'
            WHERE tenant_id = ${tenantId} AND class = ${c.class} AND subject = ${c.subject}
              AND teacher = ${absentTeacher}`
          if ((upd.rowCount ?? 0) === 0) { skipped += 1; continue }

          // Flag the log entry High when the substitute is already at/over contract.
          const load = await sql`
            SELECT s.contract_hours,
              (SELECT COUNT(*) FROM teacher_allocation_slots tas
               WHERE tas.tenant_id = ${tenantId} AND tas.teacher = s.name AND tas.coverage = 'Assigned') AS periods
            FROM staff s
            WHERE s.tenant_id = ${tenantId} AND s.name = ${c.substitute} LIMIT 1`
          const overloaded = load.rows[0] && load.rows[0].contract_hours > 0 && Number(load.rows[0].periods) > Number(load.rows[0].contract_hours)

          await sql`
            INSERT INTO teacher_substitution_log (id, tenant_id, slot, priority, action, relief, eta, impacted)
            VALUES (gen_random_uuid()::text, ${tenantId}, ${`${c.class} · ${c.subject}`},
                    ${overloaded ? 'High' : 'Normal'}, ${`Cover for ${absentTeacher}`},
                    ${c.substitute}, 'Immediate', ${c.class})`
          covered += 1
        }

        // Recompute allocation_periods / risk_flag for all teachers.
        await sql`
          UPDATE staff s SET
            allocation_periods = COALESCE((
              SELECT COUNT(*) FROM teacher_allocation_slots tas
              WHERE tas.teacher = s.name AND tas.coverage = 'Assigned' AND tas.tenant_id = ${tenantId}
            ), 0),
            risk_flag = CASE
              WHEN COALESCE((
                SELECT COUNT(*) FROM teacher_allocation_slots tas
                WHERE tas.teacher = s.name AND tas.coverage = 'Assigned' AND tas.tenant_id = ${tenantId}
              ), 0) > contract_hours AND contract_hours > 0 THEN 'Overload'
              ELSE 'Normal'
            END
          WHERE s.tenant_id = ${tenantId} AND s.role ILIKE '%teacher%'`

        const updated = await sql`
          SELECT class, subject, teacher, coverage, warnings
          FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}
          ORDER BY class ASC, subject ASC`
        return res.json({
          success: true,
          data: updated.rows,
          message: `${covered} slot(s) covered${skipped ? `, ${skipped} skipped (no longer held by ${absentTeacher})` : ''}.`,
        })
      } catch (e) {
        console.error('substitute error:', e)
        return res.status(500).json({ success: false, error: 'Failed to assign substitutes' })
      }
    }

    if (action === 'auto-balance' && req.method === 'POST') {
      try {
        // Real auto-balance: distribute Open slots among teachers who teach the
        // slot's subject and still have spare capacity (allocation < contract).
        const openSlots = await sql`
          SELECT class, subject FROM teacher_allocation_slots
          WHERE tenant_id = ${tenantId} AND coverage = 'Open'`
        const teachers = await sql`
          SELECT name, subjects, allocation_periods, contract_hours
          FROM staff
          WHERE tenant_id = ${tenantId} AND role ILIKE '%teacher%'`

        let filled = 0
        for (const slot of openSlots.rows) {
          const candidates = teachers.rows.filter((t: any) => {
            const subjects = parseSubjectList(t.subjects)
            return subjects.includes(slot.subject) && t.allocation_periods < t.contract_hours
          })
          if (candidates.length === 0) continue
          // Pick the teacher with the most spare capacity.
          candidates.sort((a: any, b: any) =>
            (b.contract_hours - b.allocation_periods) - (a.contract_hours - a.allocation_periods)
          )
          const chosen = candidates[0]
          await sql`
            UPDATE teacher_allocation_slots
            SET teacher = ${chosen.name}, coverage = 'Assigned', warnings = GREATEST(warnings - 1, 0)
            WHERE tenant_id = ${tenantId} AND class = ${slot.class} AND subject = ${slot.subject}`
          chosen.allocation_periods += 1
          filled += 1
        }

        // Recompute risk flags for all teachers.
        await sql`
          UPDATE staff s SET
            allocation_periods = COALESCE((
              SELECT COUNT(*) FROM teacher_allocation_slots tas
              WHERE tas.teacher = s.name AND tas.coverage = 'Assigned' AND tas.tenant_id = ${tenantId}
            ), 0),
            risk_flag = CASE
              WHEN COALESCE((
                SELECT COUNT(*) FROM teacher_allocation_slots tas
                WHERE tas.teacher = s.name AND tas.coverage = 'Assigned' AND tas.tenant_id = ${tenantId}
              ), 0) > contract_hours AND contract_hours > 0 THEN 'Overload'
              ELSE 'Normal'
            END
          WHERE s.tenant_id = ${tenantId} AND s.role ILIKE '%teacher%'`

        const updated = await sql`
          SELECT class, subject, teacher, coverage, warnings
          FROM teacher_allocation_slots WHERE tenant_id = ${tenantId}
          ORDER BY class ASC, subject ASC`
        return res.json({
          success: true,
          data: updated.rows,
          message: `Auto-balance complete. ${filled} slot(s) filled.`,
        })
      } catch (e) {
        console.error('auto-balance error:', e)
        return res.json({ success: true, data: [], message: 'Auto-balance failed.' })
      }
    }

    if (action === 'generate-slots' && req.method === 'POST') {
      try {
        // Generate allocation slots from the cartesian product of classes and
        // subjects, so the matrix has rows to assign against. Idempotent: skips
        // (tenant, class, subject) combos that already exist.
        const { body } = req
        const classes = body?.classes
        const subjects = body?.subjects
        if (!Array.isArray(classes) || !Array.isArray(subjects) || classes.length === 0 || subjects.length === 0) {
          return res.status(400).json({ success: false, error: 'classes and subjects arrays are required' })
        }

        // Validate that classes exist for this tenant (by name)
        const validClasses = await sql`
          SELECT DISTINCT name FROM classes
          WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
            AND name = ANY(${classes}::text[])`
        const validClassSet = new Set(validClasses.rows.map((r: any) => r.name))
        const invalidClasses = classes.filter((c: string) => !validClassSet.has(c))
        if (invalidClasses.length > 0) {
          return res.status(400).json({ success: false, error: `Class(es) not found in this tenant: ${invalidClasses.join(', ')}` })
        }

        // Validate that subjects exist for this tenant (by name)
        const validSubjects = await sql`
          SELECT DISTINCT name FROM subjects
          WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
            AND name = ANY(${subjects}::text[])`
        const validSubjectSet = new Set(validSubjects.rows.map((r: any) => r.name))
        const invalidSubjects = subjects.filter((s: string) => !validSubjectSet.has(s))
        if (invalidSubjects.length > 0) {
          return res.status(400).json({ success: false, error: `Subject(s) not found in this tenant: ${invalidSubjects.join(', ')}` })
        }

        let created = 0
        for (const cls of classes) {
          for (const subj of subjects) {
            const existing = await sql`
              SELECT 1 FROM teacher_allocation_slots
              WHERE tenant_id = ${tenantId} AND class = ${cls} AND subject = ${subj}`
            if (existing.rows.length === 0) {
              await sql`
                INSERT INTO teacher_allocation_slots (id, tenant_id, class, subject, coverage, warnings)
                VALUES (gen_random_uuid()::text, ${tenantId}, ${cls}, ${subj}, 'Open', 0)`
              created += 1
            }
          }
        }
        return res.json({ success: true, message: `Generated ${created} slot(s).` })
      } catch (e) {
        console.error('generate-slots error:', e)
        return res.status(500).json({ success: false, error: 'Failed to generate slots' })
      }
    }

    if (action === 'auto-generate' && req.method === 'POST') {
      try {
        // One-click generation: match each class to the subjects whose
        // levels cover it — e.g. class "JSS1" gets every subject whose
        // levels array contains "JSS 1". No manual name typing needed.
        const classRows = await sql`
          SELECT name FROM classes
          WHERE tenant_id = ${tenantId} AND deleted_at IS NULL ORDER BY name`
        const subjectRows = await sql`
          SELECT name, levels FROM subjects
          WHERE tenant_id = ${tenantId} AND deleted_at IS NULL ORDER BY name`

        // Normalize "JSS1"/"SS 2"/"jss 3" -> "JSS 1"/"SS 2"/"JSS 3"
        const levelToken = (cls: string): string | null => {
          const m = String(cls).trim().match(/^(JSS|SS|JS)\s*(\d)/i)
          if (!m) return null
          const band = /^S/i.test(m[1]) ? 'SS' : 'JSS'
          return `${band} ${m[2]}`
        }

        let created = 0
        for (const c of classRows.rows) {
          const token = levelToken(c.name)
          if (!token) continue // class name doesn't map to a JSS/SS level — skip
          for (const s of subjectRows.rows) {
            const levels = parseSubjectList(s.levels)
            if (!levels.includes(token)) continue
            const existing = await sql`
              SELECT 1 FROM teacher_allocation_slots
              WHERE tenant_id = ${tenantId} AND class = ${c.name} AND subject = ${s.name}`
            if (existing.rows.length === 0) {
              await sql`
                INSERT INTO teacher_allocation_slots (id, tenant_id, class, subject, coverage, warnings)
                VALUES (gen_random_uuid()::text, ${tenantId}, ${c.name}, ${s.name}, 'Open', 0)`
              created += 1
            }
          }
        }
        return res.json({ success: true, message: `Generated ${created} slot(s) from your classes and subject levels.` })
      } catch (e) {
        console.error('auto-generate error:', e)
        return res.status(500).json({ success: false, error: 'Failed to auto-generate slots' })
      }
    }

    return res.status(404).json({ success: false, error: 'Not found' })
  } catch (error) {
    console.error('teacher-allocation-handler error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
