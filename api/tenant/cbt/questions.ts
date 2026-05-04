/**
 * Question Bank API Endpoints
 * Handles CRUD operations for questions, CSV import/export, and filtering
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  checkDuplicate,
  getQuestionStats,
} from './_lib/questions.js'
import type { QuestionFilter, CreateQuestionInput, UpdateQuestionInput } from './_lib/types.js'

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
 * Method not allowed response
 */
function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
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

/**
 * Convert CSV to questions array
 */
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must contain header and at least one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const questions: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has incorrect number of columns`)
    }

    const question: any = {}
    headers.forEach((header, index) => {
      const value = values[index]
      if (header === 'options') {
        question[header] = value ? JSON.parse(value) : []
      } else if (header === 'tags') {
        question[header] = value ? JSON.parse(value) : []
      } else {
        question[header] = value
      }
    })

    questions.push(question)
  }

  return questions
}

/**
 * Convert questions to CSV
 */
function generateCSV(questions: any[]): string {
  if (questions.length === 0) {
    return 'text,type,options,correctAnswer,difficulty,subject,tags\n'
  }

  const headers = ['text', 'type', 'options', 'correctAnswer', 'difficulty', 'subject', 'tags']
  const rows: string[] = [headers.join(',')]

  for (const question of questions) {
    const row = headers.map(header => {
      const value = question[header]
      if (header === 'options' || header === 'tags') {
        return JSON.stringify(value || [])
      }
      return String(value || '')
    })
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string
  const { id, action } = req.query

  // Validate tenant ID
  if (!validateTenantId(tenantId, res)) {
    return
  }

  // GET /api/tenant/cbt/questions
  if (req.method === 'GET' && !id && action !== 'export' && action !== 'stats') {
    try {
      const { subject, difficulty, type, searchText, page, limit } = req.query

      const filter: QuestionFilter = {
        subject: subject as string | undefined,
        difficulty: difficulty as any,
        type: type as any,
        searchText: searchText as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      }

      const result = await getQuestions(tenantId, filter)
      return res.status(200).json(result)
    } catch (error) {
      console.error('Error fetching questions:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch questions' })
    }
  }

  // GET /api/tenant/cbt/questions/stats
  if (req.method === 'GET' && action === 'stats') {
    try {
      const stats = await getQuestionStats(tenantId)
      return res.status(200).json({ success: true, data: stats })
    } catch (error) {
      console.error('Error fetching question stats:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch question stats' })
    }
  }

  // GET /api/tenant/cbt/questions/:id
  if (req.method === 'GET' && id && !action) {
    try {
      const question = await getQuestion(tenantId, id as string)
      if (!question) {
        return res.status(404).json({ success: false, error: 'Question not found' })
      }
      return res.status(200).json({ success: true, data: question })
    } catch (error) {
      console.error('Error fetching question:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch question' })
    }
  }

  // POST /api/tenant/cbt/questions
  if (req.method === 'POST' && !id && action !== 'import') {
    if (!validateUserId(userId, res)) {
      return
    }

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { text, type, options, correctAnswer, difficulty, subject, tags } = body

    // Validate required fields
    const missing: string[] = []
    if (!text) missing.push('text')
    if (!type) missing.push('type')
    if (!difficulty) missing.push('difficulty')
    if (!subject) missing.push('subject')

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        validationErrors: missing.reduce((acc, field) => {
          acc[field] = `${field} is required`
          return acc
        }, {} as Record<string, string>),
      })
    }

    try {
      // Check for duplicates
      const duplicate = await checkDuplicate(tenantId, text)
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: 'A question with this text already exists',
        })
      }

      const input: CreateQuestionInput = {
        text,
        type,
        options,
        correctAnswer,
        difficulty,
        subject,
        tags,
      }

      const question = await createQuestion(tenantId, userId, input)
      return res.status(201).json({ success: true, data: question })
    } catch (error: any) {
      console.error('Error creating question:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create question',
      })
    }
  }

  // POST /api/tenant/cbt/questions/import
  if (req.method === 'POST' && action === 'import') {
    if (!validateUserId(userId, res)) {
      return
    }

    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { csvContent } = body
    if (!csvContent) {
      return res.status(400).json({ success: false, error: 'csvContent is required' })
    }

    try {
      const questionsData = parseCSV(csvContent)
      const results = {
        imported: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string }>,
      }

      for (let i = 0; i < questionsData.length; i++) {
        try {
          const questionData = questionsData[i]

          // Check for duplicates
          const duplicate = await checkDuplicate(tenantId, questionData.text)
          if (duplicate) {
            results.failed++
            results.errors.push({
              row: i + 2,
              error: 'Question with this text already exists',
            })
            continue
          }

          const input: CreateQuestionInput = {
            text: questionData.text,
            type: questionData.type,
            options: questionData.options,
            correctAnswer: questionData.correctAnswer,
            difficulty: questionData.difficulty,
            subject: questionData.subject,
            tags: questionData.tags,
          }

          await createQuestion(tenantId, userId, input)
          results.imported++
        } catch (error: any) {
          results.failed++
          results.errors.push({
            row: i + 2,
            error: error.message || 'Failed to import question',
          })
        }
      }

      return res.status(200).json({
        success: true,
        data: results,
      })
    } catch (error: any) {
      console.error('Error importing questions:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to import questions',
      })
    }
  }

  // GET /api/tenant/cbt/questions/export
  if (req.method === 'GET' && action === 'export') {
    try {
      const { questionIds, subject } = req.query

      let filter: QuestionFilter = {
        page: 1,
        limit: 10000,
      }

      if (subject) {
        filter.subject = subject as string
      }

      const result = await getQuestions(tenantId, filter)
      let questions = result.data

      // Filter by specific question IDs if provided
      if (questionIds) {
        const ids = Array.isArray(questionIds) ? questionIds : [questionIds]
        questions = questions.filter(q => ids.includes(q.id))
      }

      const csv = generateCSV(questions)

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="questions.csv"')
      return res.status(200).send(csv)
    } catch (error) {
      console.error('Error exporting questions:', error)
      return res.status(500).json({ success: false, error: 'Failed to export questions' })
    }
  }

  // PUT /api/tenant/cbt/questions/:id
  if (req.method === 'PUT' && id && !action) {
    const body = parseBody(req)
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is required' })
    }

    const { text, type, options, correctAnswer, difficulty, subject, tags } = body

    try {
      // If text is being updated, check for duplicates
      if (text) {
        const duplicate = await checkDuplicate(tenantId, text, id as string)
        if (duplicate) {
          return res.status(409).json({
            success: false,
            error: 'A question with this text already exists',
          })
        }
      }

      const input: UpdateQuestionInput = {
        text,
        type,
        options,
        correctAnswer,
        difficulty,
        subject,
        tags,
      }

      const updated = await updateQuestion(tenantId, id as string, input)
      return res.status(200).json({ success: true, data: updated })
    } catch (error: any) {
      if (error.message === 'Question not found') {
        return res.status(404).json({ success: false, error: 'Question not found' })
      }
      console.error('Error updating question:', error)
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update question',
      })
    }
  }

  // DELETE /api/tenant/cbt/questions/:id
  if (req.method === 'DELETE' && id && !action) {
    try {
      await deleteQuestion(tenantId, id as string)
      return res.status(200).json({ success: true, message: 'Question deleted successfully' })
    } catch (error: any) {
      if (error.message === 'Question not found') {
        return res.status(404).json({ success: false, error: 'Question not found' })
      }
      console.error('Error deleting question:', error)
      return res.status(500).json({ success: false, error: 'Failed to delete question' })
    }
  }

  return methodNotAllowed(res)
}
