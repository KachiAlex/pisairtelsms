/**
 * POST /api/tenant/cbt/questions/import
 * Imports questions from CSV or Excel content.
 * Accepts JSON body: { content: string, filename: string }
 * - CSV: content is the raw CSV text
 * - Excel: content is base64-encoded xlsx data
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as XLSX from 'xlsx'
import {
  createQuestion,
  checkDuplicate,
} from '../_lib/questions.js'
import { initializeDatabase } from '../_lib/db.js'
import type { CreateQuestionInput } from '../_lib/types.js'

function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('File must contain a header row and at least one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''))
  const questions: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted CSV values
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    values.push(current.trim())

    const question: any = {}
    headers.forEach((header, index) => {
      const value = values[index] || ''
      if (header === 'options' || header === 'tags') {
        try {
          question[header] = value ? JSON.parse(value) : []
        } catch {
          question[header] = value ? value.split('|').map(v => v.trim()) : []
        }
      } else {
        question[header] = value
      }
    })

    if (question.text) {
      questions.push(question)
    }
  }

  return questions
}

function parseExcel(base64Content: string): any[] {
  const buffer = Buffer.from(base64Content, 'base64')
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return rows.map(row => {
    const normalized: any = {}
    Object.keys(row).forEach(key => {
      const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '')
      const value = String(row[key] || '').trim()
      if (normalizedKey === 'options' || normalizedKey === 'tags') {
        try {
          normalized[normalizedKey] = value ? JSON.parse(value) : []
        } catch {
          normalized[normalizedKey] = value ? value.split('|').map(v => v.trim()) : []
        }
      } else {
        normalized[normalizedKey] = value
      }
    })
    return normalized
  }).filter(q => q.text)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const tenantId = req.headers['x-tenant-id'] as string
  const userId = req.headers['x-user-id'] as string

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }
  if (!userId) {
    return res.status(401).json({ success: false, error: 'x-user-id header is required' })
  }

  try {
    initializeDatabase()
  } catch (error: any) {
    return res.status(503).json({ success: false, error: 'Database initialization failed: ' + error.message })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = null }
  }

  if (!body || (!body.content && !body.csvContent)) {
    return res.status(400).json({ success: false, error: 'Request body must include content or csvContent' })
  }

  const content: string = body.content || body.csvContent
  const filename: string = body.filename || 'import.csv'
  const isExcel = /\.(xlsx|xls)$/i.test(filename)

  try {
    let questionsData: any[]

    if (isExcel) {
      questionsData = parseExcel(content)
    } else {
      // CSV — content may be base64 or plain text
      let csvText = content
      try {
        // Try to decode as base64 first
        const decoded = Buffer.from(content, 'base64').toString('utf8')
        // If it looks like CSV (has commas/newlines), use decoded
        if (decoded.includes(',') || decoded.includes('\n')) {
          csvText = decoded
        }
      } catch {
        // Use as-is
      }
      questionsData = parseCSV(csvText)
    }

    if (questionsData.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid questions found in the file' })
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    }

    for (let i = 0; i < questionsData.length; i++) {
      try {
        const questionData = questionsData[i]

        if (!questionData.text) {
          results.failed++
          results.errors.push({ row: i + 2, error: 'Missing question text' })
          continue
        }

        // Check for duplicates
        const duplicate = await checkDuplicate(tenantId, questionData.text)
        if (duplicate) {
          results.failed++
          results.errors.push({ row: i + 2, error: 'Question with this text already exists' })
          continue
        }

        // Normalize type
        const type = (questionData.type || 'essay').toLowerCase()
        const validType = ['objective', 'truefalse', 'essay'].includes(type) ? type : 'essay'

        // Normalize difficulty
        const diff = questionData.difficulty || 'Medium'
        const validDiff = ['Easy', 'Medium', 'Hard'].includes(diff) ? diff :
          diff.toLowerCase() === 'easy' ? 'Easy' :
          diff.toLowerCase() === 'hard' ? 'Hard' : 'Medium'

        const input: CreateQuestionInput = {
          text: questionData.text,
          type: validType as any,
          options: Array.isArray(questionData.options) ? questionData.options : [],
          correctAnswer: questionData.correctanswer || questionData.correctAnswer || '',
          difficulty: validDiff as any,
          subject: questionData.subject || 'General',
          tags: Array.isArray(questionData.tags) ? questionData.tags : [],
        }

        await createQuestion(tenantId, userId, input)
        results.imported++
      } catch (error: any) {
        results.failed++
        results.errors.push({ row: i + 2, error: error.message || 'Failed to import question' })
      }
    }

    return res.status(200).json({ success: true, data: results })
  } catch (error: any) {
    console.error('Error importing questions:', error)
    return res.status(400).json({ success: false, error: error.message || 'Failed to import questions' })
  }
}
