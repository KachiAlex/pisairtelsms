import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../_lib/auth-middleware.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  try {
    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM virtual_learning_settings WHERE tenant_id = ${tenantId}
      `
      if (!result.rows[0]) {
        // Return defaults
        return res.status(200).json({
          data: {
            tenant_id: tenantId,
            school_hours_start: '08:00',
            school_hours_end: '15:00',
            allow_live_outside_school_hours: false,
            max_private_lessons_per_week: 3,
            require_parent_consent_standard: false,
            require_parent_consent_private: true,
            allow_recording: true,
            recording_retention_days: 90,
            auto_notify_parents: true,
          }
        })
      }
      return res.status(200).json({ data: result.rows[0] })
    }

    if (req.method === 'PUT') {
      const {
        schoolHoursStart, schoolHoursEnd, allowLiveOutsideSchoolHours,
        maxPrivateLessonsPerWeek, requireParentConsentStandard, requireParentConsentPrivate,
        allowRecording, recordingRetentionDays, autoNotifyParents
      } = req.body || {}

      const result = await sql`
        INSERT INTO virtual_learning_settings (
          tenant_id, school_hours_start, school_hours_end, allow_live_outside_school_hours,
          max_private_lessons_per_week, require_parent_consent_standard, require_parent_consent_private,
          allow_recording, recording_retention_days, auto_notify_parents
        )
        VALUES (
          ${tenantId}, ${schoolHoursStart || '08:00'}, ${schoolHoursEnd || '15:00'},
          ${allowLiveOutsideSchoolHours ?? false}, ${maxPrivateLessonsPerWeek || 3},
          ${requireParentConsentStandard ?? false}, ${requireParentConsentPrivate ?? true},
          ${allowRecording ?? true}, ${recordingRetentionDays || 90}, ${autoNotifyParents ?? true}
        )
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          school_hours_start = COALESCE(${schoolHoursStart || null}, virtual_learning_settings.school_hours_start),
          school_hours_end = COALESCE(${schoolHoursEnd || null}, virtual_learning_settings.school_hours_end),
          allow_live_outside_school_hours = COALESCE(${allowLiveOutsideSchoolHours === undefined ? null : allowLiveOutsideSchoolHours}, virtual_learning_settings.allow_live_outside_school_hours),
          max_private_lessons_per_week = COALESCE(${maxPrivateLessonsPerWeek || null}, virtual_learning_settings.max_private_lessons_per_week),
          require_parent_consent_standard = COALESCE(${requireParentConsentStandard === undefined ? null : requireParentConsentStandard}, virtual_learning_settings.require_parent_consent_standard),
          require_parent_consent_private = COALESCE(${requireParentConsentPrivate === undefined ? null : requireParentConsentPrivate}, virtual_learning_settings.require_parent_consent_private),
          allow_recording = COALESCE(${allowRecording === undefined ? null : allowRecording}, virtual_learning_settings.allow_recording),
          recording_retention_days = COALESCE(${recordingRetentionDays || null}, virtual_learning_settings.recording_retention_days),
          auto_notify_parents = COALESCE(${autoNotifyParents === undefined ? null : autoNotifyParents}, virtual_learning_settings.auto_notify_parents),
          updated_at = NOW()
        RETURNING *
      `
      return res.status(200).json({ data: result.rows[0] })
    }

    res.setHeader('Allow', 'GET,PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[virtual-learning-settings]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
