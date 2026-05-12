/**
 * Question Tags API Endpoints
 * REST API for managing question tags catalog
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase } from './_lib/db.js'
import {
  getTags,
  getTag,
  getTagWithQuestionCount,
  getQuestionTags,
  getQuestionsByTag,
  deleteTag,
  getTagStats,
  cleanupUnusedTags,
  syncQuestionTags,
} from './_lib/tags.js'

// ============================================================================
// Helper Functions
// ============================================================================

function validateUserId(userId: string | undefined, res: VercelResponse): boolean {
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return false
  }
  return true
}

function parseBody(req: VercelRequest): any {
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }
  return body
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }

  try {
    initializeDatabase()
  } catch (error: any) {
    return res.status(503).json({ success: false, error: 'Database initialization failed: ' + error.message })
  }

  const action = typeof req.query.action === 'string' ? req.query.action : ''
  const tagId = typeof req.query.id === 'string' ? req.query.id : ''

  // ============================================================================
  // GET /tags - List tags with optional filtering
  // ============================================================================
  if (req.method === 'GET' && !action && !tagId) {
    try {
      const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined
      const search = typeof req.query.search === 'string' ? req.query.search : undefined
      const minUsage = typeof req.query.minUsage === 'string' ? parseInt(req.query.minUsage) : undefined
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : undefined

      const tags = await getTags(tenantId, {
        subject,
        search,
        minUsage,
        limit,
      })

      return res.status(200).json({
        success: true,
        data: tags,
      })
    } catch (error: any) {
      console.error('Error fetching tags:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch tags' })
    }
  }

  // ============================================================================
  // GET /tags?action=stats - Get tag statistics
  // ============================================================================
  if (req.method === 'GET' && action === 'stats') {
    try {
      const stats = await getTagStats(tenantId)
      return res.status(200).json({
        success: true,
        data: stats,
      })
    } catch (error: any) {
      console.error('Error fetching tag stats:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch tag statistics' })
    }
  }

  // ============================================================================
  // GET /tags?id={tagId} - Get single tag by ID
  // ============================================================================
  if (req.method === 'GET' && tagId && !action) {
    try {
      const includeQuestions = req.query.includeQuestions === 'true'
      const tag = includeQuestions
        ? await getTagWithQuestionCount(tenantId, tagId)
        : await getTag(tenantId, tagId)

      if (!tag) {
        return res.status(404).json({ success: false, error: 'Tag not found' })
      }

      return res.status(200).json({
        success: true,
        data: tag,
      })
    } catch (error: any) {
      console.error('Error fetching tag:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch tag' })
    }
  }

  // ============================================================================
  // GET /tags?action=questions&id={tagId} - Get questions for a tag
  // ============================================================================
  if (req.method === 'GET' && action === 'questions' && tagId) {
    try {
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 50
      const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset) : 0

      const questions = await getQuestionsByTag(tenantId, tagId, limit, offset)

      return res.status(200).json({
        success: true,
        data: questions,
      })
    } catch (error: any) {
      console.error('Error fetching questions for tag:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch questions for tag' })
    }
  }

  // ============================================================================
  // GET /tags?action=question-tags&questionId={questionId} - Get tags for a question
  // ============================================================================
  if (req.method === 'GET' && action === 'question-tags') {
    const questionId = typeof req.query.questionId === 'string' ? req.query.questionId : ''
    if (!questionId) {
      return res.status(400).json({ success: false, error: 'questionId is required' })
    }

    try {
      const tags = await getQuestionTags(tenantId, questionId)
      return res.status(200).json({
        success: true,
        data: tags,
      })
    } catch (error: any) {
      console.error('Error fetching question tags:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch question tags' })
    }
  }

  // ============================================================================
  // POST /tags - Create a new tag (or sync tags for a question)
  // ============================================================================
  if (req.method === 'POST' && !action) {
    if (!validateUserId(userId, res)) return

    const body = parseBody(req)

    // Mode 1: Create a single tag
    if (body.name && !body.questionId) {
      try {
        const { getTags } = await import('./_lib/tags.js')
        const { upsertTag } = await import('./_lib/tags.js')
        const tag = await upsertTag(tenantId, body.name, {
          subject: body.subject,
          description: body.description,
          createdBy: userId,
        })

        return res.status(201).json({
          success: true,
          data: tag,
        })
      } catch (error: any) {
        console.error('Error creating tag:', error)
        return res.status(500).json({ success: false, error: 'Failed to create tag' })
      }
    }

    // Mode 2: Sync tags for a question
    if (body.questionId && Array.isArray(body.tags)) {
      try {
        const tags = await syncQuestionTags(tenantId, body.questionId, body.tags, {
          subject: body.subject,
          createdBy: userId,
        })

        return res.status(200).json({
          success: true,
          data: { synced: tags.length, tags },
        })
      } catch (error: any) {
        console.error('Error syncing question tags:', error)
        return res.status(500).json({ success: false, error: 'Failed to sync question tags' })
      }
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid request body. Provide name for tag creation or questionId + tags for sync.',
    })
  }

  // ============================================================================
  // DELETE /tags?id={tagId} - Delete a tag
  // ============================================================================
  if (req.method === 'DELETE' && tagId) {
    if (!validateUserId(userId, res)) return

    try {
      await deleteTag(tenantId, tagId)
      return res.status(200).json({
        success: true,
        data: { deleted: true },
      })
    } catch (error: any) {
      console.error('Error deleting tag:', error)
      return res.status(500).json({ success: false, error: 'Failed to delete tag' })
    }
  }

  // ============================================================================
  // POST /tags?action=cleanup - Clean up unused tags
  // ============================================================================
  if (req.method === 'POST' && action === 'cleanup') {
    if (!validateUserId(userId, res)) return

    try {
      const deletedCount = await cleanupUnusedTags(tenantId)
      return res.status(200).json({
        success: true,
        data: { deleted: deletedCount },
      })
    } catch (error: any) {
      console.error('Error cleaning up tags:', error)
      return res.status(500).json({ success: false, error: 'Failed to clean up tags' })
    }
  }

  // ============================================================================
  // 404 - No matching route
  // ============================================================================
  return res.status(404).json({ success: false, error: 'Not found' })
}
