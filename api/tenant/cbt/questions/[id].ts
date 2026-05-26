/**
 * Individual Question API Endpoints
 * Handles GET, PUT, DELETE for specific question by ID
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../../_lib/auth-middleware'
import {
  getQuestion,
  updateQuestion,
  deleteQuestion,
} from '../_lib/questions.js'
import type { UpdateQuestionInput } from '../_lib/types.js'

/**
 * Parse request body
 */
function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  return req.body
}

/**
 * Validate tenant ID
 */
function validateTenantId(tenantId: string | undefined, res: VercelResponse): boolean {
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header is required' })
    return false
  }
  return true
}

/**
 * Validate user ID
 */
function validateUserId(userId: string | undefined, res: VercelResponse): boolean {
  if (!userId) {
    res.status(401).json({ error: 'x-user-id header is required' })
    return false
  }
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string
  const { id } = req.query

  if (!validateTenantId(tenantId, res)) return
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Question ID is required' })
  }

  // GET /api/tenant/cbt/questions/:id
  if (req.method === 'GET') {
    try {
      const question = await getQuestion(tenantId, id)
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' })
      }
      return res.status(200).json({ success: true, data: question })
    } catch (error) {
      console.error('Error fetching question:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch question' })
    }
  }

  // PUT /api/tenant/cbt/questions/:id
  if (req.method === 'PUT') {
    if (!validateUserId(userId, res)) return

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    try {
      const input: UpdateQuestionInput = {
        text: body.text,
        type: body.type,
        options: body.options,
        correctAnswer: body.correctAnswer,
        difficulty: body.difficulty,
        subject: body.subject,
        tags: body.tags,
      }

      const updated = await updateQuestion(tenantId, id, input)
      return res.status(200).json({ success: true, data: updated })
    } catch (error: any) {
      if (error.message === 'Question not found') {
        return res.status(404).json({ success: false, error: 'Question not found' })
      }
      console.error('Error updating question:', error)
      return res.status(500).json({ success: false, error: 'Failed to update question' })
    }
  }

  // DELETE /api/tenant/cbt/questions/:id
  if (req.method === 'DELETE') {
    try {
      await deleteQuestion(tenantId, id)
      return res.status(200).json({ success: true, message: 'Question deleted successfully' })
    } catch (error: any) {
      if (error.message === 'Question not found') {
        return res.status(404).json({ success: false, error: 'Question not found' })
      }
      console.error('Error deleting question:', error)
      return res.status(500).json({ success: false, error: 'Failed to delete question' })
    }
  }

  res.setHeader('Allow', 'GET,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
