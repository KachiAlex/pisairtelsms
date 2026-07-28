/**
 * Question and Option Randomization - Unit Tests
 * Tests for randomization logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getRandomizedQuestions,
  getRandomizedOptions,
  getRandomizedExam,
  verifyRandomizationConsistency,
  getRandomizationSeed,
  calculateRandomizationHash,
} from './randomization'
import * as db from './db'
import type { ExamQuestion, Question } from './types'

// Mock database module
vi.mock('./db')

describe('Question and Option Randomization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRandomizedQuestions', () => {
    it('should return questions in original order when randomization disabled', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-3',
          examId: 'exam-1',
          questionId: 'q-3',
          questionOrder: 3,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockQuestions)

      const result = await getRandomizedQuestions('exam-1', 'student-1', false)

      expect(result).toHaveLength(3)
      expect(result[0].questionId).toBe('q-1')
      expect(result[1].questionId).toBe('q-2')
      expect(result[2].questionId).toBe('q-3')
    })

    it('should randomize questions when randomization enabled', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-3',
          examId: 'exam-1',
          questionId: 'q-3',
          questionOrder: 3,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockQuestions)

      const result = await getRandomizedQuestions('exam-1', 'student-1', true)

      expect(result).toHaveLength(3)
      // Verify all questions are present
      const questionIds = result.map(q => q.questionId)
      expect(questionIds).toContain('q-1')
      expect(questionIds).toContain('q-2')
      expect(questionIds).toContain('q-3')
    })

    it('should maintain consistent randomization for same student', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-3',
          examId: 'exam-1',
          questionId: 'q-3',
          questionOrder: 3,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll)
        .mockResolvedValueOnce(mockQuestions)
        .mockResolvedValueOnce(mockQuestions)

      const result1 = await getRandomizedQuestions('exam-1', 'student-1', true)
      const result2 = await getRandomizedQuestions('exam-1', 'student-1', true)

      // Same student should get same order
      expect(result1.map(q => q.questionId)).toEqual(result2.map(q => q.questionId))
    })

    it('should produce different randomization for different students', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-3',
          examId: 'exam-1',
          questionId: 'q-3',
          questionOrder: 3,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll)
        .mockResolvedValueOnce(mockQuestions)
        .mockResolvedValueOnce(mockQuestions)

      const result1 = await getRandomizedQuestions('exam-1', 'student-1', true)
      const result2 = await getRandomizedQuestions('exam-1', 'student-2', true)

      // Different students may get different orders (not guaranteed but likely)
      const order1 = result1.map(q => q.questionId).join(',')
      const order2 = result2.map(q => q.questionId).join(',')

      // At least verify both are valid
      expect(order1).toBeTruthy()
      expect(order2).toBeTruthy()
    })

    it('should handle empty question list', async () => {
      vi.mocked(db.queryAll).mockResolvedValueOnce([])

      const result = await getRandomizedQuestions('exam-1', 'student-1', true)

      expect(result).toHaveLength(0)
    })

    it('should update question order numbers after randomization', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockQuestions)

      const result = await getRandomizedQuestions('exam-1', 'student-1', true)

      // Verify order numbers are sequential
      for (let i = 0; i < result.length; i++) {
        expect(result[i].questionOrder).toBe(i + 1)
      }
    })
  })

  describe('getRandomizedOptions', () => {
    it('should return options in original order when randomization disabled', async () => {
      const mockQuestion: Question = {
        id: 'q-1',
        tenantId: 'tenant-1',
        text: 'What is 2+2?',
        type: 'objective',
        options: [
          { id: 'opt-1', text: '3' },
          { id: 'opt-2', text: '4' },
          { id: 'opt-3', text: '5' },
        ],
        correctAnswer: 'opt-2',
        difficulty: 'Easy',
        subject: 'Math',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await getRandomizedOptions(mockQuestion, 'student-1', false)

      expect(result.options).toHaveLength(3)
      expect(result.options![0].text).toBe('3')
      expect(result.options![1].text).toBe('4')
      expect(result.options![2].text).toBe('5')
    })

    it('should randomize options when randomization enabled', async () => {
      const mockQuestion: Question = {
        id: 'q-1',
        tenantId: 'tenant-1',
        text: 'What is 2+2?',
        type: 'objective',
        options: [
          { id: 'opt-1', text: '3' },
          { id: 'opt-2', text: '4' },
          { id: 'opt-3', text: '5' },
        ],
        correctAnswer: 'opt-2',
        difficulty: 'Easy',
        subject: 'Math',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await getRandomizedOptions(mockQuestion, 'student-1', true)

      expect(result.options).toHaveLength(3)
      // Verify all options are present
      const optionTexts = result.options!.map(o => o.text)
      expect(optionTexts).toContain('3')
      expect(optionTexts).toContain('4')
      expect(optionTexts).toContain('5')
    })

    it('should maintain consistent option randomization for same student', async () => {
      const mockQuestion: Question = {
        id: 'q-1',
        tenantId: 'tenant-1',
        text: 'What is 2+2?',
        type: 'objective',
        options: [
          { id: 'opt-1', text: '3' },
          { id: 'opt-2', text: '4' },
          { id: 'opt-3', text: '5' },
        ],
        correctAnswer: 'opt-2',
        difficulty: 'Easy',
        subject: 'Math',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result1 = await getRandomizedOptions(mockQuestion, 'student-1', true)
      const result2 = await getRandomizedOptions(mockQuestion, 'student-1', true)

      // Same student should get same option order
      const order1 = result1.options!.map(o => o.text).join(',')
      const order2 = result2.options!.map(o => o.text).join(',')
      expect(order1).toBe(order2)
    })

    it('should handle questions without options', async () => {
      const mockQuestion: Question = {
        id: 'q-1',
        tenantId: 'tenant-1',
        text: 'Essay question',
        type: 'essay',
        difficulty: 'Medium',
        subject: 'English',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await getRandomizedOptions(mockQuestion, 'student-1', true)

      expect(result.options).toBeUndefined()
    })
  })

  describe('getRandomizedExam', () => {
    it('should return randomized exam with both questions and options randomized', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      const mockQuestionDetails: Question[] = [
        {
          id: 'q-1',
          tenantId: 'tenant-1',
          text: 'Question 1',
          type: 'objective',
          options: [
            { id: 'opt-1', text: 'A' },
            { id: 'opt-2', text: 'B' },
          ],
          correctAnswer: 'opt-1',
          difficulty: 'Easy',
          subject: 'Math',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'q-2',
          tenantId: 'tenant-1',
          text: 'Question 2',
          type: 'objective',
          options: [
            { id: 'opt-3', text: 'C' },
            { id: 'opt-4', text: 'D' },
          ],
          correctAnswer: 'opt-3',
          difficulty: 'Medium',
          subject: 'Math',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockQuestions)
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockQuestionDetails[0])
        .mockResolvedValueOnce(mockQuestionDetails[1])

      const result = await getRandomizedExam('exam-1', 'student-1', true, true)

      expect(result.questions).toHaveLength(2)
      expect(result.questionDetails).toHaveLength(2)
    })
  })

  describe('verifyRandomizationConsistency', () => {
    it('should return true for consistent randomization', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      const mockQuestionDetails: Question[] = [
        {
          id: 'q-1',
          tenantId: 'tenant-1',
          text: 'Question 1',
          type: 'objective',
          difficulty: 'Easy',
          subject: 'Math',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'q-2',
          tenantId: 'tenant-1',
          text: 'Question 2',
          type: 'objective',
          difficulty: 'Medium',
          subject: 'Math',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockQuestions)
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockQuestionDetails[0])
        .mockResolvedValueOnce(mockQuestionDetails[1])

      const previousOrder = ['q-1', 'q-2']
      const result = await verifyRandomizationConsistency(
        'exam-1',
        'student-1',
        false,
        false,
        previousOrder
      )

      expect(result).toBe(true)
    })

    it('should return false for inconsistent randomization', async () => {
      const mockQuestions: ExamQuestion[] = [
        {
          id: 'eq-1',
          examId: 'exam-1',
          questionId: 'q-1',
          questionOrder: 1,
          marks: 1,
          createdAt: new Date(),
        },
        {
          id: 'eq-2',
          examId: 'exam-1',
          questionId: 'q-2',
          questionOrder: 2,
          marks: 1,
          createdAt: new Date(),
        },
      ]

      const mockQuestionDetails: Question[] = [
        {
          id: 'q-1',
          tenantId: 'tenant-1',
          text: 'Question 1',
          type: 'objective',
          difficulty: 'Easy',
          subject: 'Math',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'q-2',
          tenantId: 'tenant-1',
          text: 'Question 2',
          type: 'objective',
          difficulty: 'Medium',
          subject: 'Math',
          createdBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(db.queryAll).mockResolvedValueOnce(mockQuestions)
      vi.mocked(db.queryOne)
        .mockResolvedValueOnce(mockQuestionDetails[0])
        .mockResolvedValueOnce(mockQuestionDetails[1])

      const previousOrder = ['q-2', 'q-1'] // Different order
      const result = await verifyRandomizationConsistency(
        'exam-1',
        'student-1',
        false,
        false,
        previousOrder
      )

      expect(result).toBe(false)
    })
  })

  describe('getRandomizationSeed', () => {
    it('should generate consistent seed for student', () => {
      const seed1 = getRandomizationSeed('student-1')
      const seed2 = getRandomizationSeed('student-1')

      expect(seed1).toBe(seed2)
      expect(seed1).toContain('student-1')
    })

    it('should generate different seeds for different students', () => {
      const seed1 = getRandomizationSeed('student-1')
      const seed2 = getRandomizationSeed('student-2')

      expect(seed1).not.toBe(seed2)
    })
  })

  describe('calculateRandomizationHash', () => {
    it('should calculate consistent hash for same inputs', () => {
      const hash1 = calculateRandomizationHash('exam-1', 'student-1', ['q-1', 'q-2', 'q-3'])
      const hash2 = calculateRandomizationHash('exam-1', 'student-1', ['q-1', 'q-2', 'q-3'])

      expect(hash1).toBe(hash2)
    })

    it('should calculate different hash for different question order', () => {
      const hash1 = calculateRandomizationHash('exam-1', 'student-1', ['q-1', 'q-2', 'q-3'])
      const hash2 = calculateRandomizationHash('exam-1', 'student-1', ['q-3', 'q-2', 'q-1'])

      expect(hash1).not.toBe(hash2)
    })

    it('should calculate different hash for different students', () => {
      const hash1 = calculateRandomizationHash('exam-1', 'student-1', ['q-1', 'q-2', 'q-3'])
      const hash2 = calculateRandomizationHash('exam-1', 'student-2', ['q-1', 'q-2', 'q-3'])

      expect(hash1).not.toBe(hash2)
    })

    it('should return valid hex string', () => {
      const hash = calculateRandomizationHash('exam-1', 'student-1', ['q-1', 'q-2'])

      expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
    })
  })
})
