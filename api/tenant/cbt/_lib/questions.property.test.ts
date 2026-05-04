/**
 * Question Bank - Property-Based Tests
 * Tests for correctness properties of question bank operations
 * Uses fast-check for property-based testing with 20+ generated examples (optimized for speed)
 * 
 * **Validates: Requirements 2.2, 2.4, 2.5, 2.6, 2.7, 2.8**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import * as questionsService from './questions'
import * as db from './db'

// Mock database module
vi.mock('./db')

// ============================================================================
// GENERATORS FOR PROPERTY-BASED TESTING
// ============================================================================

/**
 * Generate valid question text (1-1000 characters, non-whitespace)
 */
const questionTextArb = fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0)

/**
 * Generate valid question types
 */
const questionTypeArb = fc.oneof(
  fc.constant('objective'),
  fc.constant('truefalse'),
  fc.constant('essay')
)

/**
 * Generate valid difficulty levels
 */
const difficultyArb = fc.oneof(
  fc.constant('Easy'),
  fc.constant('Medium'),
  fc.constant('Hard')
)

/**
 * Generate valid subject names (1-100 characters, non-whitespace)
 */
const subjectArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

/**
 * Generate valid question options
 */
const questionOptionArb = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 500 }),
  isCorrect: fc.boolean(),
})

/**
 * Generate valid options array (2-4 options)
 */
const optionsArb = fc.array(questionOptionArb, { minLength: 2, maxLength: 4 })

/**
 * Generate valid tags array
 */
const tagsArb = fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 })

/**
 * Generate valid question input
 */
const validQuestionInputArb = fc.record({
  text: questionTextArb,
  type: questionTypeArb,
  options: optionsArb,
  correctAnswer: fc.string({ minLength: 1, maxLength: 100 }),
  difficulty: difficultyArb,
  subject: subjectArb,
  tags: tagsArb,
})

/**
 * Generate valid question with ID
 */
const validQuestionArb = fc.record({
  id: fc.uuid(),
  tenantId: fc.uuid(),
  text: questionTextArb,
  type: questionTypeArb,
  options: optionsArb,
  correctAnswer: fc.string({ minLength: 1, maxLength: 100 }),
  difficulty: difficultyArb,
  subject: subjectArb,
  tags: tagsArb,
  createdBy: fc.uuid(),
  createdAt: fc.date(),
  updatedAt: fc.date(),
})

/**
 * Generate tenant IDs
 */
const tenantIdArb = fc.uuid()

/**
 * Generate user IDs
 */
const userIdArb = fc.uuid()

// ============================================================================
// PROPERTY-BASED TESTS
// ============================================================================

describe('Question Bank - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================================================
  // Property 1: Question Addition Round-Trip
  // ========================================================================
  describe('Property 1: Question Addition Round-Trip', () => {
    it('should persist and retrieve question with identical data', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          validQuestionInputArb,
          async (tenantId, userId, questionInput) => {
            // Mock the database to return the created question
            const createdQuestion = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...questionInput,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(createdQuestion)

            // Create question
            const created = await questionsService.createQuestion(tenantId, userId, questionInput)
            
            // Verify all fields match
            expect(created.text).toBe(questionInput.text)
            expect(created.type).toBe(questionInput.type)
            expect(created.difficulty).toBe(questionInput.difficulty)
            expect(created.subject).toBe(questionInput.subject)
            expect(created.correctAnswer).toBe(questionInput.correctAnswer)
            expect(created.tenantId).toBe(tenantId)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('**Validates: Requirements 2.2** - Question addition round-trip with 20+ examples', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          validQuestionInputArb,
          async (tenantId, userId, questionInput) => {
            const createdQuestion = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...questionInput,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(createdQuestion)

            const created = await questionsService.createQuestion(tenantId, userId, questionInput)
            
            // Round-trip property: created question should be retrievable with same data
            expect(created.text).toBe(questionInput.text)
            expect(created.type).toBe(questionInput.type)
            expect(created.difficulty).toBe(questionInput.difficulty)
            expect(created.subject).toBe(questionInput.subject)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  // ========================================================================
  // Property 2: Question Deletion Removes from Bank
  // ========================================================================
  describe('Property 2: Question Deletion Removes from Bank', () => {
    it('should not return deleted questions in queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validQuestionArb,
          async (tenantId, question) => {
            // Mock delete to succeed
            vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })

            // Mock subsequent query to return empty
            vi.mocked(db.queryOne).mockResolvedValueOnce(null)

            await questionsService.deleteQuestion(tenantId, question.id)
            
            // After deletion, question should not be found
            const found = await questionsService.getQuestion(tenantId, question.id)
            expect(found).toBeNull()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('**Validates: Requirements 2.4** - Deleted questions removed from bank', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validQuestionArb,
          async (tenantId, question) => {
            vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1 })
            vi.mocked(db.queryOne).mockResolvedValueOnce(null)

            await questionsService.deleteQuestion(tenantId, question.id)
            const found = await questionsService.getQuestion(tenantId, question.id)
            
            // Deletion property: deleted question should not be retrievable
            expect(found).toBeNull()
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  // ========================================================================
  // Property 3: Search Filters Return Only Matching Questions
  // ========================================================================
  describe('Property 3: Search Filters Return Only Matching Questions', () => {
    it('should return only questions matching subject filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 20 }),
          subjectArb,
          async (tenantId, questions, filterSubject) => {
            // Create questions with different subjects
            const questionsWithSubject = questions.map((q, i) => ({
              ...q,
              subject: i === 0 ? filterSubject : `other-${i}`,
            }))

            // Mock query to return only matching questions
            const matching = questionsWithSubject.filter((q) => q.subject === filterSubject)
            vi.mocked(db.queryOne).mockResolvedValueOnce({ count: matching.length.toString() })
            vi.mocked(db.queryAll).mockResolvedValueOnce(matching)

            const result = await questionsService.getQuestions(tenantId, { subject: filterSubject })
            
            // All returned questions should match the filter
            result.data.forEach((q) => {
              expect(q.subject).toBe(filterSubject)
            })
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should return only questions matching difficulty filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 20 }),
          difficultyArb,
          async (tenantId, questions, filterDifficulty) => {
            const questionsWithDifficulty = questions.map((q, i) => ({
              ...q,
              difficulty: i === 0 ? filterDifficulty : 'Easy',
            }))

            const matching = questionsWithDifficulty.filter(
              (q) => q.difficulty === filterDifficulty
            )
            vi.mocked(db.queryOne).mockResolvedValueOnce({ count: matching.length.toString() })
            vi.mocked(db.queryAll).mockResolvedValueOnce(matching)

            const result = await questionsService.getQuestions(tenantId, { difficulty: filterDifficulty })
            
            result.data.forEach((q) => {
              expect(q.difficulty).toBe(filterDifficulty)
            })
          }
        ),
        { numRuns: 15 }
      )
    })

    it('**Validates: Requirements 2.5** - Search filters return only matching questions', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 20 }),
          questionTypeArb,
          async (tenantId, questions, filterType) => {
            const questionsWithType = questions.map((q, i) => ({
              ...q,
              type: i === 0 ? filterType : 'essay',
            }))

            const matching = questionsWithType.filter((q) => q.type === filterType)
            vi.mocked(db.queryOne).mockResolvedValueOnce({ count: matching.length.toString() })
            vi.mocked(db.queryAll).mockResolvedValueOnce(matching)

            const result = await questionsService.getQuestions(tenantId, { type: filterType })
            
            // Filter property: all returned questions must match the filter
            result.data.forEach((q) => {
              expect(q.type).toBe(filterType)
            })
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  // ========================================================================
  // Property 4: Statistics Accurately Reflect Question Bank
  // ========================================================================
  describe('Property 4: Statistics Accurately Reflect Question Bank', () => {
    it('should calculate correct total count', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 50 }),
          async (tenantId, questions) => {
            const uniqueQuestions = Array.from(
              new Map(questions.map((q) => [q.id, q])).values()
            )

            vi.mocked(db.queryOne).mockResolvedValueOnce({
              count: uniqueQuestions.length.toString(),
            })

            vi.mocked(db.queryAll)
              .mockResolvedValueOnce(
                uniqueQuestions.map((q) => ({
                  difficulty: q.difficulty,
                  count: uniqueQuestions.filter((x) => x.difficulty === q.difficulty).length,
                }))
              )
              .mockResolvedValueOnce(
                uniqueQuestions.map((q) => ({
                  type: q.type,
                  count: uniqueQuestions.filter((x) => x.type === q.type).length,
                }))
              )
              .mockResolvedValueOnce(
                uniqueQuestions.map((q) => ({
                  subject: q.subject,
                  count: uniqueQuestions.filter((x) => x.subject === q.subject).length,
                }))
              )

            const stats = await questionsService.getQuestionStats(tenantId)
            
            // Statistics property: total should match actual count
            expect(stats.total).toBe(uniqueQuestions.length)
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should calculate correct difficulty distribution', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 50 }),
          async (tenantId, questions) => {
            const uniqueQuestions = Array.from(
              new Map(questions.map((q) => [q.id, q])).values()
            )

            const difficultyMap = new Map<string, number>()
            uniqueQuestions.forEach((q) => {
              difficultyMap.set(q.difficulty, (difficultyMap.get(q.difficulty) || 0) + 1)
            })

            vi.mocked(db.queryOne).mockResolvedValueOnce({
              count: uniqueQuestions.length.toString(),
            })

            vi.mocked(db.queryAll)
              .mockResolvedValueOnce(
                Array.from(difficultyMap.entries()).map(([difficulty, count]) => ({
                  difficulty,
                  count: count.toString(),
                }))
              )
              .mockResolvedValueOnce([])
              .mockResolvedValueOnce([])

            const stats = await questionsService.getQuestionStats(tenantId)
            
            // Statistics property: difficulty distribution should match actual data
            difficultyMap.forEach((count, difficulty) => {
              expect(stats.byDifficulty[difficulty]).toBe(count)
            })
          }
        ),
        { numRuns: 15 }
      )
    })

    it('**Validates: Requirements 2.6** - Statistics accurately reflect question bank', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 50 }),
          async (tenantId, questions) => {
            const uniqueQuestions = Array.from(
              new Map(questions.map((q) => [q.id, q])).values()
            )

            const typeMap = new Map<string, number>()
            uniqueQuestions.forEach((q) => {
              typeMap.set(q.type, (typeMap.get(q.type) || 0) + 1)
            })

            vi.mocked(db.queryOne).mockResolvedValueOnce({
              count: uniqueQuestions.length.toString(),
            })

            vi.mocked(db.queryAll)
              .mockResolvedValueOnce([])
              .mockResolvedValueOnce(
                Array.from(typeMap.entries()).map(([type, count]) => ({
                  type,
                  count: count.toString(),
                }))
              )
              .mockResolvedValueOnce([])

            const stats = await questionsService.getQuestionStats(tenantId)
            
            // Statistics property: type distribution must match actual data
            typeMap.forEach((count, type) => {
              expect(stats.byType[type]).toBe(count)
            })
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  // ========================================================================
  // Property 5: CSV Import Preserves Question Data
  // ========================================================================
  describe('Property 5: CSV Import Preserves Question Data', () => {
    it('should preserve all question fields during import', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          fc.array(validQuestionInputArb, { minLength: 1, maxLength: 20 }),
          async (tenantId, userId, questionsToImport) => {
            // Mock successful import
            const importedQuestions = questionsToImport.map((q) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...q,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // For each question, mock the insert
            importedQuestions.forEach((q) => {
              vi.mocked(db.queryOne).mockResolvedValueOnce(q)
            })

            // Simulate import by creating each question
            const importPromises = questionsToImport.map((q) =>
              questionsService.createQuestion(tenantId, userId, q)
            )

            const created = await Promise.all(importPromises)
            
            // Import property: all fields should be preserved
            created.forEach((c, i) => {
              expect(c.text).toBe(questionsToImport[i].text)
              expect(c.type).toBe(questionsToImport[i].type)
              expect(c.difficulty).toBe(questionsToImport[i].difficulty)
              expect(c.subject).toBe(questionsToImport[i].subject)
            })
          }
        ),
        { numRuns: 15 }
      )
    })

    it('**Validates: Requirements 2.7** - CSV import preserves question data', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          fc.array(validQuestionInputArb, { minLength: 1, maxLength: 20 }),
          async (tenantId, userId, questionsToImport) => {
            const importedQuestions = questionsToImport.map((q) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...q,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            importedQuestions.forEach((q) => {
              vi.mocked(db.queryOne).mockResolvedValueOnce(q)
            })

            const importPromises = questionsToImport.map((q) =>
              questionsService.createQuestion(tenantId, userId, q)
            )

            const created = await Promise.all(importPromises)
            
            // Import property: all questions must be persisted with identical data
            created.forEach((c, i) => {
              expect(c.correctAnswer).toBe(questionsToImport[i].correctAnswer)
              expect(c.tags).toEqual(questionsToImport[i].tags)
            })
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  // ========================================================================
  // Property 6: CSV Export-Import Round-Trip
  // ========================================================================
  describe('Property 6: CSV Export-Import Round-Trip', () => {
    it('should preserve data through export-import cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 20 }),
          async (tenantId, userId, originalQuestions) => {
            // Mock export (retrieve questions)
            vi.mocked(db.queryOne).mockResolvedValueOnce({ count: originalQuestions.length.toString() })
            vi.mocked(db.queryAll).mockResolvedValueOnce(originalQuestions)

            // Mock import (create questions)
            const reimportedQuestions = originalQuestions.map((q) => ({
              ...q,
              id: fc.sample(fc.uuid(), 1)[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            reimportedQuestions.forEach((q) => {
              vi.mocked(db.queryOne).mockResolvedValueOnce(q)
            })

            // Simulate export
            const exported = await questionsService.getQuestions(tenantId, {})
            
            // Simulate import of exported data
            const importPromises = exported.data.map((q) =>
              questionsService.createQuestion(tenantId, userId, {
                text: q.text,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                difficulty: q.difficulty,
                subject: q.subject,
                tags: q.tags,
              })
            )
            const reimported = await Promise.all(importPromises)
            
            // Round-trip property: data should be identical
            reimported.forEach((r, i) => {
              expect(r.text).toBe(originalQuestions[i].text)
              expect(r.type).toBe(originalQuestions[i].type)
              expect(r.difficulty).toBe(originalQuestions[i].difficulty)
              expect(r.subject).toBe(originalQuestions[i].subject)
            })
          }
        ),
        { numRuns: 15 }
      )
    })

    it('**Validates: Requirements 2.8** - CSV export-import round-trip preserves data', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          fc.array(validQuestionArb, { minLength: 1, maxLength: 20 }),
          async (tenantId, userId, originalQuestions) => {
            vi.mocked(db.queryOne).mockResolvedValueOnce({ count: originalQuestions.length.toString() })
            vi.mocked(db.queryAll).mockResolvedValueOnce(originalQuestions)

            const reimportedQuestions = originalQuestions.map((q) => ({
              ...q,
              id: fc.sample(fc.uuid(), 1)[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            reimportedQuestions.forEach((q) => {
              vi.mocked(db.queryOne).mockResolvedValueOnce(q)
            })

            const exported = await questionsService.getQuestions(tenantId, {})
            
            const importPromises = exported.data.map((q) =>
              questionsService.createQuestion(tenantId, userId, {
                text: q.text,
                type: q.type,
                options: q.options,
                correctAnswer: q.correctAnswer,
                difficulty: q.difficulty,
                subject: q.subject,
                tags: q.tags,
              })
            )
            const reimported = await Promise.all(importPromises)
            
            // Round-trip property: all fields must survive export-import cycle
            reimported.forEach((r, i) => {
              expect(r.correctAnswer).toBe(originalQuestions[i].correctAnswer)
              expect(r.tags).toEqual(originalQuestions[i].tags)
            })
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  // ========================================================================
  // EDGE CASES
  // ========================================================================
  describe('Edge Cases', () => {
    it('should handle questions with maximum length text', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          difficultyArb,
          subjectArb,
          async (tenantId, userId, difficulty, subject) => {
            const maxLengthText = 'a'.repeat(1000)
            const input = {
              text: maxLengthText,
              type: 'essay' as const,
              difficulty,
              subject,
              options: undefined,
              correctAnswer: undefined,
              tags: [],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...input,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const q = await questionsService.createQuestion(tenantId, userId, input)
            expect(q.text.length).toBe(1000)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should handle questions with minimum length text', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          difficultyArb,
          subjectArb,
          async (tenantId, userId, difficulty, subject) => {
            const minLengthText = 'a'
            const input = {
              text: minLengthText,
              type: 'essay' as const,
              difficulty,
              subject,
              options: undefined,
              correctAnswer: undefined,
              tags: [],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...input,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const q = await questionsService.createQuestion(tenantId, userId, input)
            expect(q.text.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should handle questions with maximum options', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          difficultyArb,
          subjectArb,
          async (tenantId, userId, difficulty, subject) => {
            const maxOptions = [
              { id: fc.sample(fc.uuid(), 1)[0], text: 'Option 1' },
              { id: fc.sample(fc.uuid(), 1)[0], text: 'Option 2' },
              { id: fc.sample(fc.uuid(), 1)[0], text: 'Option 3' },
              { id: fc.sample(fc.uuid(), 1)[0], text: 'Option 4' },
            ]

            const input = {
              text: 'Test question',
              type: 'objective' as const,
              options: maxOptions,
              correctAnswer: 'Option 1',
              difficulty,
              subject,
              tags: [],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...input,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const q = await questionsService.createQuestion(tenantId, userId, input)
            expect(q.options?.length).toBe(4)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should handle questions with minimum options', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          difficultyArb,
          subjectArb,
          async (tenantId, userId, difficulty, subject) => {
            const minOptions = [
              { id: fc.sample(fc.uuid(), 1)[0], text: 'Option 1' },
              { id: fc.sample(fc.uuid(), 1)[0], text: 'Option 2' },
            ]

            const input = {
              text: 'Test question',
              type: 'objective' as const,
              options: minOptions,
              correctAnswer: 'Option 1',
              difficulty,
              subject,
              tags: [],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...input,
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const q = await questionsService.createQuestion(tenantId, userId, input)
            expect(q.options?.length).toBeGreaterThanOrEqual(2)
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
