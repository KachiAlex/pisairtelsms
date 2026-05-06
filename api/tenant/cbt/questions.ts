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
import { initializeDatabase, runMigrations } from './_lib/db.js'
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
  res.setHeader('Allow', 'GET,POST,DELETE')
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
 * Normalise a raw header string to a canonical key.
 * Strips whitespace, lowercases, and collapses common variants.
 */
function normaliseHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Map a normalised header to our internal field name.
 * Accepts many common spreadsheet column name variants.
 */
function mapHeader(norm: string): string | null {
  // Question text
  if (['question', 'questiontext', 'text', 'stem', 'body', 'que'].includes(norm)) return 'text'
  // Question type
  if (['type', 'questiontype', 'qtype', 'kind'].includes(norm)) return 'type'
  // Options (generic JSON array column)
  if (norm === 'options') return 'options'
  // Individual option columns: optiona / option_a / option1 / a / choice1 etc.
  if (['optiona', 'option1', 'choicea', 'choice1', 'answera', 'a'].includes(norm)) return 'optionA'
  if (['optionb', 'option2', 'choiceb', 'choice2', 'answerb', 'b'].includes(norm)) return 'optionB'
  if (['optionc', 'option3', 'choicec', 'choice3', 'answerc', 'c'].includes(norm)) return 'optionC'
  if (['optiond', 'option4', 'choiced', 'choice4', 'answerd', 'd'].includes(norm)) return 'optionD'
  if (['optione', 'option5', 'choicee', 'choice5', 'answere', 'e'].includes(norm)) return 'optionE'
  // Correct answer
  if (['correctanswer', 'answer', 'correct', 'key', 'answerkey', 'rightanswer', 'correctoption'].includes(norm)) return 'correctAnswer'
  // Difficulty
  if (['difficulty', 'level', 'difflevel', 'difficultyLevel'].includes(norm)) return 'difficulty'
  // Subject
  if (['subject', 'topic', 'course', 'category', 'section'].includes(norm)) return 'subject'
  // Tags
  if (['tags', 'tag', 'keywords', 'labels'].includes(norm)) return 'tags'
  // Points / marks (informational, not stored but accepted)
  if (['points', 'marks', 'score', 'weight'].includes(norm)) return 'points'
  // Explanation (informational)
  if (['explanation', 'rationale', 'reason', 'explanationoptions', 'explanationoption'].includes(norm)) return 'explanation'
  // Explanation Options (same as explanation)
  if (['explanationoptions'].includes(norm)) return 'explanation'
  return null
}

/**
 * Convert a row object (with mapped field names) into a question payload.
 * Handles both the "options array" format and the "Option A/B/C/D" column format.
 */
function rowToQuestion(row: Record<string, string>): any {
  // Build options array from individual columns if present
  const individualOptions: string[] = []
  for (const key of ['optionA', 'optionB', 'optionC', 'optionD', 'optionE']) {
    if (row[key] !== undefined && row[key].trim() !== '') {
      individualOptions.push(row[key].trim())
    }
  }

  let options: string[] = []
  if (individualOptions.length > 0) {
    options = individualOptions
  } else if (row.options) {
    try {
      options = JSON.parse(row.options)
    } catch {
      options = row.options.split('|').map((o: string) => o.trim()).filter(Boolean)
    }
  }

  // Normalise type: accept "MULTIPLE_CHOICE", "MCQ", "objective", "truefalse", "essay" etc.
  let type = (row.type || 'objective').trim().toLowerCase()
  if (['multiple_choice', 'mcq', 'multiplechoice', 'mc', 'objective', 'multiple choice'].includes(type)) type = 'objective'
  else if (['true_false', 'truefalse', 'tf', 'boolean', 'yes_no'].includes(type)) type = 'truefalse'
  else if (['essay', 'short_answer', 'shortanswer', 'open', 'freetext', 'free_text'].includes(type)) type = 'essay'
  else type = 'objective' // default

  // Normalise difficulty - if not provided, default to Medium
  let difficulty = (row.difficulty || 'Medium').trim()
  if (difficulty === '') difficulty = 'Medium'
  const diffLower = difficulty.toLowerCase()
  if (['easy', 'low', 'simple', '1'].includes(diffLower)) difficulty = 'Easy'
  else if (['hard', 'difficult', 'high', 'complex', '3'].includes(diffLower)) difficulty = 'Hard'
  else difficulty = 'Medium'

  // Normalise correct answer: accept "A", "B", "1", "2", "True", "False", full option text
  let correctAnswer = (row.correctAnswer || '').trim()
  // If it's a number like "1" → convert to letter "A"
  if (/^[1-5]$/.test(correctAnswer)) {
    correctAnswer = String.fromCharCode(64 + parseInt(correctAnswer)) // "1"→"A"
  }
  // Uppercase single letter
  if (/^[a-e]$/.test(correctAnswer)) {
    correctAnswer = correctAnswer.toUpperCase()
  }
  // "True"/"False" for truefalse questions → "A"/"B"
  if (type === 'truefalse') {
    if (correctAnswer.toLowerCase() === 'true') correctAnswer = 'A'
    else if (correctAnswer.toLowerCase() === 'false') correctAnswer = 'B'
  }

  // Tags
  let tags: string[] = []
  if (row.tags) {
    try {
      tags = JSON.parse(row.tags)
    } catch {
      tags = row.tags.split(/[,;|]/).map((t: string) => t.trim()).filter(Boolean)
    }
  }

  return {
    text: (row.text || '').trim(),
    type,
    options,
    correctAnswer,
    difficulty,
    subject: (row.subject || 'General').trim() || 'General',
    tags,
  }
}

/**
 * Parse a plain-text CSV string into question rows.
 * Handles quoted fields and common delimiters (, or ;).
 */
function parseCSVText(csvContent: string): any[] {
  const lines = csvContent.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row')
  }

  // Detect delimiter: use semicolon if the header has more semicolons than commas
  const headerLine = lines[0]
  const delimiter = (headerLine.split(';').length > headerLine.split(',').length) ? ';' : ','

  // Simple CSV field splitter that respects double-quoted fields
  function splitCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const rawHeaders = splitCSVLine(headerLine)
  const mappedHeaders = rawHeaders.map(h => mapHeader(normaliseHeader(h)))

  const questions: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    mappedHeaders.forEach((field, idx) => {
      if (field) row[field] = values[idx] ?? ''
    })
    if (!row.text) continue // skip rows with no question text
    questions.push(rowToQuestion(row))
  }

  return questions
}

/**
 * Parse a base64-encoded Excel (.xlsx/.xls) file into question rows.
 * Uses the 'xlsx' (SheetJS) library which is already in package.json.
 */
async function parseExcelBase64(base64: string): Promise<any[]> {
  // Dynamic import so the module is only loaded when needed
  const XLSX = await import('xlsx')
  const buffer = Buffer.from(base64, 'base64')
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  // Use the first sheet
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel file contains no sheets')
  const sheet = workbook.Sheets[sheetName]

  // Convert to array-of-arrays (raw values)
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) throw new Error('Excel sheet must have a header row and at least one data row')

  const rawHeaders: string[] = rows[0].map((h: any) => String(h ?? ''))
  const mappedHeaders = rawHeaders.map(h => mapHeader(normaliseHeader(h)))

  const questions: any[] = []
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const row: Record<string, string> = {}
    mappedHeaders.forEach((field, idx) => {
      if (field) row[field] = String(values[idx] ?? '').trim()
    })
    if (!row.text) continue // skip empty rows
    questions.push(rowToQuestion(row))
  }

  return questions
}

/**
 * Parse imported file content (base64 or plain text) into question rows.
 * Supports CSV and Excel formats with flexible column naming.
 */
async function parseImportContent(content: string, filename: string): Promise<any[]> {
  const isExcel = /\.(xlsx|xls)$/i.test(filename || '')

  if (isExcel) {
    return parseExcelBase64(content)
  }

  // For CSV: content may be base64-encoded or plain text
  let csvText = content
  // Detect base64: no newlines and only base64 chars
  if (!/\n/.test(content) && /^[A-Za-z0-9+/]+=*$/.test(content.replace(/\s/g, ''))) {
    csvText = Buffer.from(content, 'base64').toString('utf-8')
  } else if (content.startsWith('data:')) {
    // Strip data URL prefix
    const comma = content.indexOf(',')
    const raw = comma !== -1 ? content.slice(comma + 1) : content
    csvText = Buffer.from(raw, 'base64').toString('utf-8')
  }

  return parseCSVText(csvText)
}

/**
 * @deprecated Use parseImportContent instead.
 * Kept for backward compatibility with any direct callers.
 */
function parseCSV(csvContent: string): any[] {
  return parseCSVText(csvContent)
}

/**
 * Escape a CSV field value (quote if needed)
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
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
      let stringValue: string
      if (header === 'options' || header === 'tags') {
        stringValue = JSON.stringify(value || [])
      } else {
        stringValue = String(value || '')
      }
      return escapeCSVField(stringValue)
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

  // Initialize database on first request
  try {
    initializeDatabase()
    // Note: runMigrations() is intentionally not called here.
    // Tables are managed via direct SQL migrations applied to the database.
  } catch (error: any) {
    console.error('Database initialization error:', error)
    return res.status(503).json({
      success: false,
      error: 'Database initialization failed: ' + error.message,
    })
  }

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

  // GET /api/tenant/cbt/questions/subjects
  if (req.method === 'GET' && action === 'subjects') {
    try {
      const result = await getQuestions(tenantId, { page: 1, limit: 10000 })
      const subjects = [...new Set(result.data.map((q: any) => q.subject).filter(Boolean))].sort()
      return res.status(200).json({ success: true, data: subjects })
    } catch (error) {
      console.error('Error fetching subjects:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch subjects' })
    }
  }

  // POST /api/tenant/cbt/questions/import
  if (req.method === 'POST' && action === 'import') {
    // Delegate to the standalone import handler
    const importHandler = (await import('./questions/import.js')).default
    return importHandler(req, res)
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

  // GET /api/tenant/cbt/questions/export
  if (req.method === 'GET' && action === 'export') {
    try {
      const { questionIds, subject, sample } = req.query

      // If sample=true, return a template with example questions
      if (sample === 'true') {
        const csvContent = `Question,Type,Option A,Option B,Option C,Option D,Correct Answer,Difficulty,Subject,Tags
"What is 2 + 2?","objective","3","4","5","6","B","Easy","Mathematics","basic arithmetic"
"Which planet is closest to the sun?","objective","Venus","Mars","Mercury","Earth","C","Easy","Science","astronomy"
"The capital of France is...","objective","London","Berlin","Paris","Madrid","C","Easy","Geography","capitals"
"Water boils at what temperature (Celsius)?","objective","90°C","100°C","110°C","120°C","B","Medium","Science","physics"
"Who wrote 'Romeo and Juliet'?","objective","Charles Dickens","William Shakespeare","Jane Austen","Mark Twain","B","Medium","English","literature"
"The mitochondria is the...","objective","Powerhouse of the cell","Control center of the cell","Waste disposal unit","Storage unit","A","Hard","Biology","cell biology"
"The Earth is flat.","truefalse","True","False","","","B","Easy","Science","basic facts"
"Water freezes at 0°C.","truefalse","True","False","","","A","Easy","Science","physics"
"Plants perform photosynthesis.","truefalse","True","False","","","A","Easy","Biology","plant biology"
"Explain the process of photosynthesis.","essay","","","","","Medium","Biology","plant biology"`
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="sample-questions.csv"')
        return res.status(200).send(csvContent)
      }

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
