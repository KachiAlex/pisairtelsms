/**
 * POST /api/tenant/cbt/questions/import
 * Imports questions from CSV or Excel content with validation.
 * 
 * ARCHITECTURE:
 * 1. Parse file content (CSV or Excel)
 * 2. Validate each row (required fields, data types, formats)
 * 3. Check for duplicates
 * 4. Import valid questions
 * 5. Return detailed results with errors
 * 
 * REQUEST BODY:
 * {
 *   content: string (base64-encoded or plain text),
 *   filename: string,
 *   options: {
 *     skipDuplicates?: boolean,
 *     overwriteDuplicates?: boolean,
 *     subject?: string,
 *     difficulty?: string,
 *     type?: string,
 *     tag?: string,
 *     tags?: string[]
 *   }
 * }
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   data: {
 *     imported: number,
 *     skipped: number,
 *     failed: number,
 *     errors: Array<{ row: number, field: string, error: string }>,
 *     preview: Array<{ text: string, type: string, subject: string }>
 *   }
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../../../_lib/auth-middleware.js'
import * as XLSX from 'xlsx'
import {
  createQuestion,
  checkDuplicate,
} from '../_lib/questions.js'
import { initializeDatabase } from '../_lib/db.js'
import type { CreateQuestionInput, QuestionOption } from '../_lib/types.js'

// ─── Column Mapping ─────────────────────────────────────────────────────────────

/**
 * Normalize header name to canonical key
 * Supports multiple variations for flexibility
 */
function normalizeHeader(header: string): string {
  const normalized = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  
  const mapping: Record<string, string> = {
    // Question text
    'question': 'text',
    'questiontext': 'text',
    'text': 'text',
    'stem': 'text',
    'body': 'text',
    'que': 'text',
    
    // Question type
    'type': 'type',
    'questiontype': 'type',
    'qtype': 'type',
    'kind': 'type',
    
    // Options (individual columns)
    'optiona': 'optionA',
    'option1': 'optionA',
    'choicea': 'optionA',
    'choice1': 'optionA',
    'answera': 'optionA',
    'a': 'optionA',
    
    'optionb': 'optionB',
    'option2': 'optionB',
    'choiceb': 'optionB',
    'choice2': 'optionB',
    'answerb': 'optionB',
    'b': 'optionB',
    
    'optionc': 'optionC',
    'option3': 'optionC',
    'choicec': 'optionC',
    'choice3': 'optionC',
    'answerc': 'optionC',
    'c': 'optionC',
    
    'optiond': 'optionD',
    'option4': 'optionD',
    'choiced': 'optionD',
    'choice4': 'optionD',
    'answerd': 'optionD',
    'd': 'optionD',
    
    'optione': 'optionE',
    'option5': 'optionE',
    'choicee': 'optionE',
    'choice5': 'optionE',
    'answere': 'optionE',
    'e': 'optionE',
    
    // Options (single column with pipe/JSON)
    'options': 'options',
    
    // Correct answer
    'correctanswer': 'correctAnswer',
    'answer': 'correctAnswer',
    'correct': 'correctAnswer',
    'key': 'correctAnswer',
    'answerkey': 'correctAnswer',
    'rightanswer': 'correctAnswer',
    'correctoption': 'correctAnswer',
    
    // Difficulty
    'difficulty': 'difficulty',
    'level': 'difficulty',
    'difflevel': 'difficulty',
    'difficultylevel': 'difficulty',
    
    // Subject
    'subject': 'subject',
    'topic': 'subject',
    'course': 'subject',
    'category': 'subject',
    'section': 'subject',
    
    // Tags
    'tags': 'tags',
    'tag': 'tags',
    'keywords': 'tags',
    'labels': 'tags',
    
    // Points (informational)
    'points': 'points',
    'marks': 'points',
    'score': 'points',
    'weight': 'points',
  }
  
  return mapping[normalized] || normalized
}

// ─── Parsing Functions ───────────────────────────────────────────────────────────

/**
 * Parse CSV content with proper quote handling
 */
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row')
  }

  // Detect delimiter (comma or semicolon)
  const headerLine = lines[0]
  const delimiter = (headerLine.split(';').length > headerLine.split(',').length) ? ';' : ','

  // Parse header
  const headers = parseCSVLine(headerLine, delimiter).map(normalizeHeader)

  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line, delimiter)
    const row: Record<string, string> = {}
    
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    
    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line respecting quotes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
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

/**
 * Parse Excel content
 */
function parseExcel(base64Content: string): any[] {
  const buffer = Buffer.from(base64Content, 'base64')
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  
  if (!sheetName) {
    throw new Error('Excel file contains no sheets')
  }
  
  const sheet = workbook.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  
  if (rows.length < 2) {
    throw new Error('Excel sheet must have a header row and at least one data row')
  }

  const headers = rows[0].map((h: any) => normalizeHeader(String(h || '')))
  const data: any[] = []

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const row: Record<string, string> = {}
    
    headers.forEach((header, idx) => {
      row[header] = String(values[idx] || '').trim()
    })
    
    data.push(row)
  }

  return data
}

// ─── Normalization Functions ─────────────────────────────────────────────────────

/**
 * Normalize question type
 */
function normalizeType(type: string): 'objective' | 'truefalse' | 'essay' {
  const normalized = type.trim().toLowerCase()
  
  if (['multiple_choice', 'mcq', 'multiplechoice', 'mc', 'objective', 'multiple choice'].includes(normalized)) {
    return 'objective'
  }
  if (['true_false', 'truefalse', 'tf', 'boolean', 'yes_no'].includes(normalized)) {
    return 'truefalse'
  }
  if (['essay', 'short_answer', 'shortanswer', 'open', 'freetext', 'free_text'].includes(normalized)) {
    return 'essay'
  }
  
  return 'objective' // default
}

/**
 * Normalize difficulty
 */
function normalizeDifficulty(difficulty: string): 'Easy' | 'Medium' | 'Hard' {
  const normalized = difficulty.trim().toLowerCase()
  
  if (['easy', 'low', 'simple', '1'].includes(normalized)) {
    return 'Easy'
  }
  if (['hard', 'difficult', 'high', 'complex', '3'].includes(normalized)) {
    return 'Hard'
  }
  
  return 'Medium' // default
}

/**
 * Normalize correct answer
 */
function normalizeCorrectAnswer(answer: string, type: string): string {
  let normalized = answer.trim()
  
  // Convert numbers to letters (1 -> A, 2 -> B, etc.)
  if (/^[1-5]$/.test(normalized)) {
    normalized = String.fromCharCode(64 + parseInt(normalized))
  }
  
  // Uppercase letters
  if (/^[a-e]$/.test(normalized)) {
    normalized = normalized.toUpperCase()
  }
  
  // True/False for truefalse questions
  if (type === 'truefalse') {
    if (normalized.toLowerCase() === 'true') {
      normalized = 'A'
    } else if (normalized.toLowerCase() === 'false') {
      normalized = 'B'
    }
  }
  
  return normalized
}

/**
 * Parse options from row
 */
function parseOptions(row: Record<string, string>): string[] {
  // Try individual option columns first
  const individualOptions: string[] = []
  for (const key of ['optionA', 'optionB', 'optionC', 'optionD', 'optionE']) {
    if (row[key] && row[key].trim()) {
      individualOptions.push(row[key].trim())
    }
  }
  
  if (individualOptions.length > 0) {
    return individualOptions
  }
  
  // Try single options column
  if (row.options) {
    try {
      const parsed = JSON.parse(row.options)
      if (Array.isArray(parsed)) {
        return parsed.map((o: any) => String(o).trim())
      }
    } catch {
      // Try pipe-separated
      return row.options.split('|').map((o: string) => o.trim()).filter(Boolean)
    }
  }
  
  return []
}

/**
 * Parse tags from row
 */
function parseTags(row: Record<string, string>): string[] {
  if (!row.tags) return []
  
  try {
    const parsed = JSON.parse(row.tags)
    if (Array.isArray(parsed)) {
      return parsed.map((t: any) => String(t).trim())
    }
  } catch {
    // Try comma, semicolon, or pipe separated
    return row.tags.split(/[,;|]/).map((t: string) => t.trim()).filter(Boolean)
  }
  
  return []
}

// ─── Validation Functions ───────────────────────────────────────────────────────

interface ValidationError {
  row: number
  field: string
  error: string
}

/**
 * Validate a single question row
 */
function validateRow(row: Record<string, string>, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Required: text
  if (!row.text || !row.text.trim()) {
    errors.push({ row: rowIndex, field: 'text', error: 'Question text is required' })
  }
  
  // Type validation
  if (row.type) {
    const validTypes = ['objective', 'truefalse', 'essay', 'multiple_choice', 'mcq', 'true_false', 'tf']
    const typeLower = row.type.trim().toLowerCase()
    if (!validTypes.some(v => v.includes(typeLower))) {
      errors.push({ row: rowIndex, field: 'type', error: `Invalid type: ${row.type}. Must be objective, truefalse, or essay` })
    }
  }
  
  // For objective questions, validate options and correct answer
  const type = normalizeType(row.type || 'objective')
  if (type === 'objective') {
    const options = parseOptions(row)
    if (options.length < 2) {
      errors.push({ row: rowIndex, field: 'options', error: 'Objective questions require at least 2 options' })
    }
    
    if (row.correctAnswer) {
      const answer = normalizeCorrectAnswer(row.correctAnswer, type)
      if (!/^[A-E]$/.test(answer)) {
        errors.push({ row: rowIndex, field: 'correctAnswer', error: `Invalid correct answer: ${row.correctAnswer}. Must be A, B, C, D, or E` })
      }
    } else {
      errors.push({ row: rowIndex, field: 'correctAnswer', error: 'Correct answer is required for objective questions' })
    }
  }
  
  // For truefalse questions, validate correct answer
  if (type === 'truefalse') {
    if (row.correctAnswer) {
      const answer = normalizeCorrectAnswer(row.correctAnswer, type)
      if (!/^[AB]$/.test(answer)) {
        errors.push({ row: rowIndex, field: 'correctAnswer', error: `Invalid correct answer: ${row.correctAnswer}. Must be A (True) or B (False)` })
      }
    } else {
      errors.push({ row: rowIndex, field: 'correctAnswer', error: 'Correct answer is required for true/false questions' })
    }
  }
  
  // Difficulty validation
  if (row.difficulty) {
    const validDifficulties = ['easy', 'medium', 'hard', 'low', 'high']
    const diffLower = row.difficulty.trim().toLowerCase()
    if (!validDifficulties.some(v => v.includes(diffLower))) {
      errors.push({ row: rowIndex, field: 'difficulty', error: `Invalid difficulty: ${row.difficulty}. Must be Easy, Medium, or Hard` })
    }
  }
  
  return errors
}

// ─── Main Handler ───────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = decoded.tenantId || 'default-tenant'
  const userId = decoded.userId || decoded.staffId || 'system'

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }
  
  const effectiveUserId = userId || 'admin'

  try {
    initializeDatabase()
  } catch (error: any) {
    return res.status(503).json({ success: false, error: 'Database initialization failed: ' + error.message })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }

  if (!body || !body.content) {
    return res.status(400).json({ success: false, error: 'Request body must include content' })
  }

  const content: string = body.content
  const filename: string = body.filename || 'import.csv'
  const options = body.options || {}
  const skipDuplicates = options.skipDuplicates !== false && !options.force // default true, unless force is true
  const overwriteDuplicates = options.overwriteDuplicates || false // default false
  const defaultSubject = options.subject || undefined
  const defaultDifficulty = options.difficulty || undefined
  const defaultType = options.type || undefined
  const defaultTag = typeof options.tag === 'string' ? options.tag.trim() : ''
  const defaultTagsArray = Array.isArray(options.tags) ? options.tags.map((t: string) => t?.trim()).filter(Boolean) : []
  const defaultTags = [...(defaultTag ? [defaultTag] : []), ...defaultTagsArray].filter(Boolean)

  try {
    // Parse file
    let rows: any[]
    const isExcel = /\.(xlsx|xls)$/i.test(filename)
    
    if (isExcel) {
      rows = parseExcel(content)
    } else {
      // CSV - may be base64 or plain text
      let csvText = content
      try {
        const decoded = Buffer.from(content, 'base64').toString('utf8')
        if (decoded.includes(',') || decoded.includes('\n')) {
          csvText = decoded
        }
      } catch {
        // Use as-is
      }
      rows = parseCSV(csvText)
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid questions found in the file' })
    }

    // Validate all rows first
    const allErrors: ValidationError[] = []
    const validRows: any[] = []
    
    for (let i = 0; i < rows.length; i++) {
      const errors = validateRow(rows[i], i + 2) // +2 for header + 1-based
      if (errors.length > 0) {
        allErrors.push(...errors)
      } else {
        validRows.push(rows[i])
      }
    }

    if (allErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: {
          totalRows: rows.length,
          validRows: validRows.length,
          errorRows: allErrors.length,
          errors: allErrors,
        }
      })
    }

    // Process valid rows
    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as ValidationError[],
      preview: [] as Array<{ text: string, type: string, subject: string, tags?: string[] }>,
    }

    for (let i = 0; i < validRows.length; i++) {
      try {
        const row = validRows[i]
        
        // Build question object
        const type = normalizeType(defaultType || row.type || 'objective')
        const options = parseOptions(row)
        const questionOptions: QuestionOption[] = options.map((text, idx) => ({
          id: crypto.randomUUID(),
          text,
          isCorrect: String.fromCharCode(65 + idx) === normalizeCorrectAnswer(row.correctAnswer || '', type)
        }))
        const rowTags = parseTags(row)
        const mergedTags = Array.from(new Set([...rowTags, ...defaultTags]))

        const input: CreateQuestionInput = {
          text: row.text.trim(),
          type,
          options: type === 'essay' ? [] : questionOptions,
          correctAnswer: type === 'essay' ? '' : normalizeCorrectAnswer(row.correctAnswer || '', type),
          difficulty: normalizeDifficulty(defaultDifficulty || row.difficulty || 'Medium'),
          subject: (defaultSubject || row.subject || 'General').trim() || 'General',
          tags: mergedTags,
        }

        // Check for duplicates
        const duplicate = await checkDuplicate(tenantId, input.text)
        if (duplicate) {
          if (skipDuplicates && !overwriteDuplicates) {
            results.skipped++
            continue
          }
          // If overwriteDuplicates is true, we proceed (would need update logic)
        }

        await createQuestion(tenantId, effectiveUserId, input)
        results.imported++
        
        // Add to preview (first 5)
        if (results.preview.length < 5) {
          results.preview.push({
            text: input.text.substring(0, 100) + (input.text.length > 100 ? '...' : ''),
            type: input.type,
            subject: input.subject,
            tags: input.tags,
          })
        }
      } catch (error: any) {
        results.failed++
        results.errors.push({
          row: i + 2,
          field: 'general',
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
