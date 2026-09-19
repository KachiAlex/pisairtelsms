import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'
import { requireAuth } from '../_lib/auth-middleware.js'

const CF_BASE = 'https://api.cloudflare.com/client/v4'

function getEnv() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const appId = process.env.CLOUDFLARE_REALTIME_APP_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const hostPreset = process.env.CLOUDFLARE_REALTIME_HOST_PRESET || 'host'
  const participantPreset = process.env.CLOUDFLARE_REALTIME_PARTICIPANT_PRESET || 'participant'

  if (!accountId || !appId || !apiToken) {
    return null
  }

  return { accountId, appId, apiToken, hostPreset, participantPreset }
}

async function cloudflareFetch<T = any>(
  url: string,
  token: string,
  init: { method?: string; body?: string }
): Promise<{ success: boolean; data: T; errors?: any[] }> {
  const res = await fetch(url, {
    method: init.method || 'GET',
    body: init.body,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const body = await res.json().catch(() => ({} as any))
  if (!res.ok || !body.success) {
    const msg = body.errors?.[0]?.message || body.error || `Cloudflare API error (${res.status})`
    throw new Error(msg)
  }
  return body
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireAuth(req, res)
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const env = getEnv()
  if (!env) {
    return res.status(500).json({
      error: 'Cloudflare Realtime is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_REALTIME_APP_ID, and CLOUDFLARE_API_TOKEN.',
    })
  }

  const tenantId = decoded.tenantId
  if (!tenantId) {
    return res.status(403).json({ error: 'Forbidden: No tenant associated with this account' })
  }

  const { lessonId, displayName, action } = req.body || {}
  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required' })
  }

  const isStaff = decoded.role === 'staff' || decoded.role === 'tenant_admin'

  try {
    const lessonResult = await sql`
      SELECT * FROM lessons WHERE id = ${lessonId as string} AND tenant_id = ${tenantId}
    `
    const lesson = lessonResult.rows[0]
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' })
    }
    if (lesson.type !== 'live') {
      return res.status(400).json({ error: 'Lesson is not a live class' })
    }

    // ---------- Policy gates ----------
    const settingsRes = await sql`
      SELECT * FROM virtual_learning_settings WHERE tenant_id = ${tenantId}
    `.catch(() => ({ rows: [] as any[] }))
    const vlSettings = settingsRes.rows[0] || null

    // ---------- Recording actions (staff only) ----------
    if (action === 'start-recording' || action === 'stop-recording' || action === 'recording-status') {
      if (!isStaff) {
        return res.status(403).json({ error: 'Only staff can control recording' })
      }
      if (action === 'start-recording' && vlSettings && vlSettings.allow_recording === false) {
        return res.status(403).json({ error: 'Recording is disabled in virtual learning settings' })
      }
      // meeting_url may hold an external link (Zoom/Meet) — that is not a
      // RealtimeKit meeting ID, so there is no recording to control.
      const meetingId = lesson.meeting_url && !/^https?:\/\//i.test(lesson.meeting_url)
        ? lesson.meeting_url
        : null
      if (!meetingId) {
        return res.status(400).json({ error: 'Meeting not started yet — join the class first' })
      }

      if (action === 'start-recording') {
        const recRes = await cloudflareFetch<{ id: string; status: string }>(
          `${CF_BASE}/accounts/${env.accountId}/realtime/kit/${env.appId}/recordings`,
          env.apiToken,
          {
            method: 'POST',
            body: JSON.stringify({
              meeting_id: meetingId,
              file_name_prefix: `lesson-${lesson.id}`,
              max_seconds: 10800,
              realtimekit_bucket_config: { enabled: true },
              video_config: { codec: 'H264', width: 1280, height: 720 },
            }),
          }
        )
        await sql`
          UPDATE lessons SET recording_id = ${recRes.data.id}
          WHERE id = ${lesson.id as string} AND tenant_id = ${tenantId}
        `
        return res.status(200).json({ recordingId: recRes.data.id, status: recRes.data.status })
      }

      // Resolve the recording id — stored value, else the meeting's active recording
      let recordingId = lesson.recording_id
      if (!recordingId) {
        const active = await cloudflareFetch<{ id: string }>(
          `${CF_BASE}/accounts/${env.accountId}/realtime/kit/${env.appId}/recordings/active-recording/${meetingId}`,
          env.apiToken,
          {}
        ).catch(() => ({ success: true, data: null as any }))
        recordingId = active.data?.id || null
        if (!recordingId) {
          return res.status(404).json({ error: 'No recording found for this meeting' })
        }
      }

      if (action === 'stop-recording') {
        const stopRes = await cloudflareFetch<{ id: string; status: string }>(
          `${CF_BASE}/accounts/${env.accountId}/realtime/kit/${env.appId}/recordings/${recordingId}`,
          env.apiToken,
          { method: 'PUT', body: JSON.stringify({ action: 'stop' }) }
        )
        return res.status(200).json({ recordingId, status: stopRes.data.status })
      }

      // recording-status — poll until the file is uploaded, then persist the URL
      const det = await cloudflareFetch<{ id: string; status: string; download_url?: string }>(
        `${CF_BASE}/accounts/${env.accountId}/realtime/kit/${env.appId}/recordings/${recordingId}`,
        env.apiToken,
        {}
      )
      const downloadUrl = det.data.download_url || null
      if (downloadUrl && downloadUrl !== lesson.recording_url) {
        await sql`
          UPDATE lessons SET recording_url = ${downloadUrl}
          WHERE id = ${lesson.id as string} AND tenant_id = ${tenantId}
        `
      }
      return res.status(200).json({ recordingId, status: det.data.status, downloadUrl })
    }

    // ---------- Join gates (applies to actual meeting entry) ----------
    // Only staff and students may join live classes — parents observe via
    // consents/attendance, not as participants.
    if (decoded.role !== 'staff' && decoded.role !== 'tenant_admin' && decoded.role !== 'student') {
      return res.status(403).json({ error: 'Your role is not permitted to join live classes' })
    }

    if (vlSettings) {
      // School-hours restriction (times are stored in school-local time, WAT)
      if (vlSettings.allow_live_outside_school_hours === false) {
        const t = await sql`
          SELECT ((NOW() AT TIME ZONE 'Africa/Lagos')::time
                  BETWEEN ${vlSettings.school_hours_start}::time
                      AND ${vlSettings.school_hours_end}::time) AS within_hours
        `
        if (!t.rows[0]?.within_hours) {
          return res.status(403).json({
            error: `Live classes are only available during school hours (${vlSettings.school_hours_start}–${vlSettings.school_hours_end})`,
          })
        }
      }
    }

    // Student-specific gates: class enrollment + parent consent
    if (decoded.role === 'student') {
      const studentId = decoded.studentId || decoded.userId
      const stuRes = await sql`
        SELECT id, class, arm, status FROM students
        WHERE id = ${studentId} AND tenant_id = ${tenantId}
      `
      const student = stuRes.rows[0]
      if (!student) {
        return res.status(403).json({ error: 'Student record not found for this account' })
      }

      // Enrollment: if the classroom is bound to a class arm, the student must
      // belong to it (matched via the classes table on name + arm).
      const clsRes = await sql`
        SELECT vc.class_arm_id
        FROM virtual_classrooms vc
        WHERE vc.id = ${lesson.classroom_id} AND vc.tenant_id = ${tenantId}
      `
      const classArmId = clsRes.rows[0]?.class_arm_id || null
      if (classArmId) {
        const enroll = await sql`
          SELECT 1 FROM classes c
          WHERE c.id::text = ${classArmId} AND c.tenant_id = ${tenantId}
            AND LOWER(c.name) = LOWER(${student.class || ''})
            AND (c.arm IS NULL OR c.arm = '' OR LOWER(c.arm) = LOWER(${student.arm || ''}))
          LIMIT 1
        `
        if (!enroll.rows[0]) {
          return res.status(403).json({ error: 'You are not enrolled in the class for this lesson' })
        }
      }

      // Parent consent for standard live lessons
      if (vlSettings?.require_parent_consent_standard) {
        const consent = await sql`
          SELECT status FROM virtual_learning_consents
          WHERE tenant_id = ${tenantId} AND student_id = ${student.id}
            AND consent_type = 'standard' AND status = 'granted'
          LIMIT 1
        `
        if (!consent.rows[0]) {
          return res.status(403).json({
            error: 'A parent/guardian must grant consent before you can join live classes',
          })
        }
      }
    }

    // Create a Cloudflare Realtime meeting if one does not already exist for this lesson.
    // meeting_url is dual-purpose — an external http(s) link is NOT a RealtimeKit
    // meeting ID, so treat it as unset and create a proper meeting.
    let meetingId = lesson.meeting_url || null
    if (meetingId && /^https?:\/\//i.test(meetingId)) {
      meetingId = null
    }
    if (!meetingId) {
      const createRes = await cloudflareFetch<{ id: string }>(
        `${CF_BASE}/accounts/${env.accountId}/realtime/kit/${env.appId}/meetings`,
        env.apiToken,
        {
          method: 'POST',
          body: JSON.stringify({
            title: lesson.title,
          }),
        }
      )
      meetingId = createRes.data.id

      // Save the meeting ID back to the lesson
      await sql`
        UPDATE lessons
        SET meeting_url = ${meetingId}
        WHERE id = ${lesson.id as string} AND tenant_id = ${tenantId}
      `
    }

    const userId = decoded.userId || decoded.staffId || decoded.studentId || decoded.sub
    const isHost = decoded.role === 'staff' || decoded.role === 'tenant_admin'
    const participantName = displayName || decoded.email || userId || 'Participant'
    const presetName = isHost ? env.hostPreset : env.participantPreset

    const addRes = await cloudflareFetch<{ id: string; token: string }>(
      `${CF_BASE}/accounts/${env.accountId}/realtime/kit/${env.appId}/meetings/${meetingId}/participants`,
      env.apiToken,
      {
        method: 'POST',
        body: JSON.stringify({
          custom_participant_id: `${tenantId}-${userId}`,
          preset_name: presetName,
          name: participantName,
        }),
      }
    )

    return res.status(200).json({
      authToken: addRes.data.token,
      meetingId,
      participantId: addRes.data.id,
    })
  } catch (error) {
    console.error('[live-meetings]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
