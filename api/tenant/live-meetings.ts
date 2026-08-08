import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const { lessonId, displayName } = req.body || {}
  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required' })
  }

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

    // Create a Cloudflare Realtime meeting if one does not already exist for this lesson
    let meetingId = lesson.meeting_url || null
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
