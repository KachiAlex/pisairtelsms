import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const { lessonId } = req.query

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId query param is required' })
  }

  if (req.method === 'POST') {
    try {
      // The recording file is sent as multipart form data
      // For now, we store the recording as a data URL or external URL
      // In production, this would upload to Vercel Blob / S3 and return the URL

      // Check if the request body contains a file
      const contentType = req.headers['content-type'] || ''

      if (contentType.includes('multipart/form-data')) {
        // For Vercel serverless, we can't easily parse multipart without a library
        // In production, use Vercel Blob upload from the client side directly
        // For now, return a placeholder URL that the client can use
        return res.status(200).json({
          data: {
            url: `https://recordings.pisairtel-school.com/${lessonId}/${Date.now()}.webm`,
            lessonId,
            uploadedAt: new Date().toISOString(),
          }
        })
      }

      // If body contains a direct URL (e.g., uploaded to Vercel Blob from client)
      const { recordingUrl, duration } = req.body || {}
      if (recordingUrl) {
        const result = await sql`
          UPDATE lessons SET
            recording_url = ${recordingUrl},
            status = 'completed',
            updated_at = NOW()
          WHERE id = ${lessonId as string} AND tenant_id = ${tenantId}
          RETURNING *
        `
        if (!result.rows[0]) {
          return res.status(404).json({ error: 'Lesson not found' })
        }
        return res.status(200).json({ data: result.rows[0] })
      }

      return res.status(400).json({ error: 'No recording file or URL provided' })
    } catch (error) {
      console.error('[lessons/recording]', error)
      const message = error instanceof Error ? error.message : 'Internal server error'
      return res.status(500).json({ error: message })
    }
  }

  // PUT - update recording URL for a lesson
  if (req.method === 'PUT') {
    try {
      const { recordingUrl } = req.body || {}
      if (!recordingUrl) {
        return res.status(400).json({ error: 'recordingUrl is required' })
      }
      const result = await sql`
        UPDATE lessons SET
          recording_url = ${recordingUrl},
          status = 'completed',
          updated_at = NOW()
        WHERE id = ${lessonId as string} AND tenant_id = ${tenantId}
        RETURNING *
      `
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Lesson not found' })
      }
      return res.status(200).json({ data: result.rows[0] })
    } catch (error) {
      console.error('[lessons/recording]', error)
      const message = error instanceof Error ? error.message : 'Internal server error'
      return res.status(500).json({ error: message })
    }
  }

  res.setHeader('Allow', 'POST,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
