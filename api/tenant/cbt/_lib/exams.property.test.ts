/**
 * Exam Management - Property-Based Tests
 * Tests for correctness properties of exam management operations
 * Uses fast-check for property-based testing with 20+ generated examples (optimized for speed)
 * 
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import * as examsService from './exams'
import * as db from './db'

// Mock database module
vi.mock('./db')

// ============================================================================
// GENERATORS FOR PROPERTY-BASED TESTING
// ============================================================================

/**
 * Generate valid exam title (1-255 characters, non-whitespace)
 */
const examTitleArb = fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0)

/**
 * Generate valid subject names (1-100 characters, non-whitespace)
 */
const subjectArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

/**
 * Generate valid class names (1-50 characters, non-whitespace)
 */
const classArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

/**
 * Generate valid exam duration (15-480 minutes)
 */
const durationArb = fc.integer({ min: 15, max: 480 })

/**
 * Generate valid marks (1-100, must be > 0)
 */
const marksArb = fc.integer({ min: 1, max: 100 })

/**
 * Generate valid exam status
 */
const examStatusArb = fc.oneof(
  fc.constant('Draft'),
  fc.constant('Scheduled'),
  fc.constant('Ongoing'),
  fc.constant('Completed')
)

/**
 * Generate valid exam input with proper constraints
 */
const validExamInputArb = fc.tuple(marksArb, marksArb).chain(([passMark, totalMarks]) => {
  const maxMark = Math.max(passMark, totalMarks)
  return fc.record({
    title: examTitleArb,
    subject: subjectArb,
    class: classArb,
    duration: durationArb,
    passMark: fc.constant(passMark),
    totalMarks: fc.constant(maxMark),
    description: fc.option(fc.string({ maxLength: 500 })),
    questionIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  })
})

/**
 * Generate valid exam with ID and proper constraints
 */
const validExamArb = fc.tuple(marksArb, marksArb).chain(([passMark, totalMarks]) => {
  const maxMark = Math.max(passMark, totalMarks)
  return fc.record({
    id: fc.uuid(),
    tenantId: fc.uuid(),
    title: examTitleArb,
    subject: subjectArb,
    class: classArb,
    duration: durationArb,
    passMark: fc.constant(passMark),
    totalMarks: fc.constant(maxMark),
    description: fc.option(fc.string({ maxLength: 500 })),
    status: examStatusArb,
    scheduledDate: fc.option(fc.date()),
    scheduledTime: fc.option(fc.string({ minLength: 5, maxLength: 5 })),
    createdBy: fc.uuid(),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  })
})

/**
 * Generate tenant IDs
 */
const tenantIdArb = fc.uuid()

/**
 * Generate user IDs
 */
const userIdArb = fc.uuid()

/**
 * Generate question IDs
 */
const questionIdArb = fc.uuid()

// ============================================================================
// PROPERTY-BASED TESTS
// ============================================================================

describe('Exam Management - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================================================
  // Property 1: Exam Creation Persists All Details
  // ========================================================================
  describe('Property 1: Exam Creation Persists All Details', () => {
    it('should persist all exam details to database', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          validExamInputArb,
          async (tenantId, userId, examInput) => {
            // Mock the database to return the created exam
            const createdExam = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...examInput,
              status: 'Draft',
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(createdExam)

            // Create exam
            const created = await examsService.createExam(tenantId, userId, examInput)
            
            // Verify all fields match
            expect(created.title).toBe(examInput.title)
            expect(created.subject).toBe(examInput.subject)
            expect(created.class).toBe(examInput.class)
            expect(created.duration).toBe(examInput.duration)
            expect(created.passMark).toBe(examInput.passMark)
            expect(created.totalMarks).toBe(examInput.totalMarks)
            expect(created.tenantId).toBe(tenantId)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('**Validates: Requirements 1.2** - Exam creation persists all details', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          validExamInputArb,
          async (tenantId, userId, examInput) => {
            const createdExam = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...examInput,
              status: 'Draft',
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(createdExam)

            const created = await examsService.createExam(tenantId, userId, examInput)
            
            // Persistence property: all fields should be persisted
            expect(created.description).toBe(examInput.description)
            expect(created.status).toBe('Draft')
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  // ========================================================================
  // Property 2: Selected Questions Are Retrievable
  // ========================================================================
  describe('Property 2: Selected Questions Are Retrievable', () => {
    it('should retrieve all selected questions from exam', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validExamArb,
          fc.array(questionIdArb, { minLength: 1, maxLength: 20 }),
          async (tenantId, exam, questionIds) => {
            // Mock exam retrieval
            vi.mocked(db.queryOne).mockResolvedValueOnce(exam)

            // Mock questions retrieval
            const questions = questionIds.map((id, idx) => ({
              id,
              text: `Question ${idx + 1}`,
              type: 'objective',
              difficulty: 'Medium',
              subject: exam.subject,
            }))

            vi.mocked(db.queryAll).mockResolvedValueOnce(questions)

            // Get exam with questions
            const examWithQuestions = await examsService.getExamWithQuestions(tenantId, exam.id)
            
            // All selected questions should be retrievable
            expect(examWithQuestions.questions).toHaveLength(questionIds.length)
            examWithQuestions.questions.forEach((q, idx) => {
              expect(q.id).toBe(questionIds[idx])
            })
          }
        ),
        { numRuns: 15 }
      )
    })

    it('**Validates: Requirements 1.3** - Selected questions are retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validExamArb,
          fc.array(questionIdArb, { minLength: 1, maxLength: 20 }),
          async (tenantId, exam, questionIds) => {
            vi.mocked(db.queryOne).mockResolvedValueOnce(exam)

            const questions = questionIds.map((id, idx) => ({
              id,
              text: `Question ${idx + 1}`,
              type: 'objective',
              difficulty: 'Medium',
              subject: exam.subject,
            }))

            vi.mocked(db.queryAll).mockResolvedValueOnce(questions)

            const examWithQuestions = await examsService.getExamWithQuestions(tenantId, exam.id)
            
            // Retrievability property: questions should match selected IDs
            examWithQuestions.questions.forEach((q) => {
              expect(questionIds).toContain(q.id)
            })
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  // ========================================================================
  // Property 3: Exam Validation Rejects Invalid Data
  // ========================================================================
  describe('Property 3: Exam Validation Rejects Invalid Data', () => {
    it('should reject exam with missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          async (tenantId, userId) => {
            // Create invalid exam input (missing title)
            const invalidInput = {
              title: '',
              subject: 'Math',
              class: 'Class 10',
              duration: 60,
              passMark: 40,
              totalMarks: 100,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            // Should throw validation error
            try {
              await examsService.createExam(tenantId, userId, invalidInput)
              expect.fail('Should have thrown validation error')
            } catch (error: any) {
              expect(error.message).toBeTruthy()
            }
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should reject exam with invalid duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          async (tenantId, userId) => {
            // Create invalid exam input (duration too short)
            const invalidInput = {
              title: 'Test Exam',
              subject: 'Math',
              class: 'Class 10',
              duration: 5, // Less than 15 minutes
              passMark: 40,
              totalMarks: 100,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            // Should throw validation error
            try {
              await examsService.createExam(tenantId, userId, invalidInput)
              expect.fail('Should have thrown validation error')
            } catch (error: any) {
              expect(error.message).toContain('Duration')
            }
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should reject exam with pass mark greater than total marks', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          async (tenantId, userId) => {
            // Create invalid exam input (pass mark > total marks)
            const invalidInput = {
              title: 'Test Exam',
              subject: 'Math',
              class: 'Class 10',
              duration: 60,
              passMark: 100,
              totalMarks: 50,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            // Should throw validation error
            try {
              await examsService.createExam(tenantId, userId, invalidInput)
              expect.fail('Should have thrown validation error')
            } catch (error: any) {
              expect(error.message).toBeTruthy()
            }
          }
        ),
        { numRuns: 10 }
      )
    })

    it('**Validates: Requirements 1.4** - Exam validation rejects invalid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          async (tenantId, userId) => {
            // Create invalid exam input (missing subject)
            const invalidInput = {
              title: 'Test Exam',
              subject: '',
              class: 'Class 10',
              duration: 60,
              passMark: 40,
              totalMarks: 100,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            // Validation property: invalid data should be rejected
            try {
              await examsService.createExam(tenantId, userId, invalidInput)
              expect.fail('Should have thrown validation error')
            } catch (error: any) {
              expect(error.message).toBeTruthy()
            }
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  // ========================================================================
  // Property 4: Exam Scheduling Updates Status
  // ========================================================================
  describe('Property 4: Exam Scheduling Updates Status', () => {
    it('should change status to Scheduled when scheduling exam', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validExamArb,
          fc.date(),
          async (tenantId, exam, scheduledDate) => {
            const draftExam = { ...exam, status: 'Draft' }
            const scheduledExam = { ...draftExam, status: 'Scheduled', scheduledDate }

            vi.mocked(db.queryOne)
              .mockResolvedValueOnce(draftExam)
              .mockResolvedValueOnce(scheduledExam)

            // Schedule exam
            const result = await examsService.updateExam(tenantId, exam.id, {
              status: 'Scheduled',
              scheduledDate,
            })
            
            // Status should be updated to Scheduled
            expect(result.status).toBe('Scheduled')
            expect(result.scheduledDate).toBe(scheduledDate)
          }
        ),
        { numRuns: 15 }
      )
    })

    it('**Validates: Requirements 1.5** - Exam scheduling updates status', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validExamArb,
          fc.date(),
          async (tenantId, exam, scheduledDate) => {
            const draftExam = { ...exam, status: 'Draft' }
            const scheduledExam = { ...draftExam, status: 'Scheduled', scheduledDate }

            vi.mocked(db.queryOne)
              .mockResolvedValueOnce(draftExam)
              .mockResolvedValueOnce(scheduledExam)

            const result = await examsService.updateExam(tenantId, exam.id, {
              status: 'Scheduled',
              scheduledDate,
            })
            
            // Scheduling property: status must change to Scheduled
            expect(result.status).toBe('Scheduled')
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  // ========================================================================
  // Property 5: Exam Edits Update Database
  // ========================================================================
  describe('Property 5: Exam Edits Update Database', () => {
    it('should update exam fields in database', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validExamArb,
          examTitleArb,
          async (tenantId, exam, newTitle) => {
            const updatedExam = { ...exam, title: newTitle, updatedAt: new Date() }

            vi.mocked(db.queryOne)
              .mockResolvedValueOnce(exam)
              .mockResolvedValueOnce(updatedExam)

            // Update exam
            const result = await examsService.updateExam(tenantId, exam.id, { title: newTitle })
            
            // Title should be updated
            expect(result.title).toBe(newTitle)
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should update multiple exam fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validExamArb,
          examTitleArb,
          durationArb,
          async (tenantId, exam, newTitle, newDuration) => {
            const updatedExam = {
              ...exam,
              title: newTitle,
              duration: newDuration,
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne)
              .mockResolvedValueOnce(exam)
              .mockResolvedValueOnce(updatedExam)

            // Update exam with multiple fields
            const result = await examsService.updateExam(tenantId, exam.id, {
              title: newTitle,
              duration: newDuration,
            })
            
            // Both fields should be updated
            expect(result.title).toBe(newTitle)
            expect(result.duration).toBe(newDuration)
          }
        ),
        { numRuns: 15 }
      )
    })

    it('**Validates: Requirements 1.6** - Exam edits update database', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          validExamArb,
          subjectArb,
          async (tenantId, exam, newSubject) => {
            const updatedExam = { ...exam, subject: newSubject, updatedAt: new Date() }

            vi.mocked(db.queryOne)
              .mockResolvedValueOnce(exam)
              .mockResolvedValueOnce(updatedExam)

            const result = await examsService.updateExam(tenantId, exam.id, { subject: newSubject })
            
            // Edit property: changes must be persisted to database
            expect(result.subject).toBe(newSubject)
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
    it('should handle exam with maximum duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          subjectArb,
          classArb,
          async (tenantId, userId, subject, examClass) => {
            const maxDurationInput = {
              title: 'Long Exam',
              subject,
              class: examClass,
              duration: 480, // Maximum 8 hours
              passMark: 40,
              totalMarks: 100,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...maxDurationInput,
              status: 'Draft',
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const exam = await examsService.createExam(tenantId, userId, maxDurationInput)
            expect(exam.duration).toBe(480)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should handle exam with minimum duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          subjectArb,
          classArb,
          async (tenantId, userId, subject, examClass) => {
            const minDurationInput = {
              title: 'Quick Exam',
              subject,
              class: examClass,
              duration: 15, // Minimum 15 minutes
              passMark: 40,
              totalMarks: 100,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...minDurationInput,
              status: 'Draft',
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const exam = await examsService.createExam(tenantId, userId, minDurationInput)
            expect(exam.duration).toBe(15)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should handle exam with low pass mark', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          subjectArb,
          classArb,
          async (tenantId, userId, subject, examClass) => {
            const lowPassMarkInput = {
              title: 'Participation Exam',
              subject,
              class: examClass,
              duration: 60,
              passMark: 1,
              totalMarks: 100,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...lowPassMarkInput,
              status: 'Draft',
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const exam = await examsService.createExam(tenantId, userId, lowPassMarkInput)
            expect(exam.passMark).toBe(1)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should handle exam with equal pass mark and total marks', async () => {
      await fc.assert(
        fc.asyncProperty(
          tenantIdArb,
          userIdArb,
          subjectArb,
          classArb,
          marksArb,
          async (tenantId, userId, subject, examClass, marks) => {
            const equalMarksInput = {
              title: 'Perfect Score Exam',
              subject,
              class: examClass,
              duration: 60,
              passMark: marks,
              totalMarks: marks,
              questionIds: [fc.sample(fc.uuid(), 1)[0]],
            }

            const created = {
              id: fc.sample(fc.uuid(), 1)[0],
              tenantId,
              ...equalMarksInput,
              status: 'Draft',
              createdBy: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            vi.mocked(db.queryOne).mockResolvedValueOnce(created)

            const exam = await examsService.createExam(tenantId, userId, equalMarksInput)
            expect(exam.passMark).toBe(exam.totalMarks)
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
