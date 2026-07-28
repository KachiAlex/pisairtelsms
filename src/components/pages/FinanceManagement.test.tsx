import { describe, it, expect } from 'vitest'
import { fc } from '@fast-check/vitest'

/**
 * Property-based tests for Finance total computation
 * Property 14: Finance Total Computation
 */

// Type definitions
interface FeeRecord {
  id: string
  studentId: string
  studentName: string
  admissionNo: string
  class: string
  feeType: string
  amount: number
  paid: number
  balance: number
  status: 'pending' | 'partial' | 'paid'
  lastPaymentDate?: string
  academicSession: string
  term: string
  createdAt: string
}

// Generators
const feeRecordArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    studentId: fc.uuid(),
    studentName: fc.string({ minLength: 2, maxLength: 50 }),
    admissionNo: fc.string({ minLength: 5, maxLength: 10 }),
    class: fc.constantFrom('Primary 1', 'Primary 2', 'JSS 1', 'SS 1'),
    feeType: fc.constantFrom('Tuition', 'Exam', 'Uniform', 'Transport'),
    amount: fc.integer({ min: 1000, max: 100000 }),
    paid: fc.integer({ min: 0, max: 100000 }),
    balance: fc.integer({ min: 0, max: 100000 }),
    status: fc.constantFrom('pending', 'partial', 'paid'),
    lastPaymentDate: fc.option(fc.date().map(d => d.toISOString())),
    academicSession: fc.constantFrom('2024/2025', '2025/2026'),
    term: fc.constantFrom('First Term', 'Second Term', 'Third Term'),
    createdAt: fc.date().map(d => d.toISOString()),
  })

describe('Finance Total Computation - Property Tests', () => {
  describe('Property 14: Finance Total Computation', () => {
    it(
      'should compute totalExpected as sum of all amounts',
      fc.prop(
        fc.array(feeRecordArbitrary(), { minLength: 0, maxLength: 50 }),
        records => {
          // Property: totalExpected = sum of all amounts
          const totalExpected = records.reduce((sum, record) => sum + record.amount, 0)

          expect(totalExpected).toBeGreaterThanOrEqual(0)
          expect(typeof totalExpected).toBe('number')
        }
      )
    )

    it(
      'should compute totalCollected as sum of all paid amounts',
      fc.prop(
        fc.array(feeRecordArbitrary(), { minLength: 0, maxLength: 50 }),
        records => {
          // Property: totalCollected = sum of all paid amounts
          const totalCollected = records.reduce((sum, record) => sum + record.paid, 0)

          expect(totalCollected).toBeGreaterThanOrEqual(0)
          expect(typeof totalCollected).toBe('number')
        }
      )
    )

    it(
      'should compute totalOutstanding as sum of all balance amounts',
      fc.prop(
        fc.array(feeRecordArbitrary(), { minLength: 0, maxLength: 50 }),
        records => {
          // Property: totalOutstanding = sum of all balance amounts
          const totalOutstanding = records.reduce((sum, record) => sum + record.balance, 0)

          expect(totalOutstanding).toBeGreaterThanOrEqual(0)
          expect(typeof totalOutstanding).toBe('number')
        }
      )
    )

    it(
      'should satisfy the equation: totalExpected = totalCollected + totalOutstanding',
      fc.prop(
        fc.array(feeRecordArbitrary(), { minLength: 0, maxLength: 50 }),
        records => {
          // Property: totalExpected = totalCollected + totalOutstanding
          const totalExpected = records.reduce((sum, record) => sum + record.amount, 0)
          const totalCollected = records.reduce((sum, record) => sum + record.paid, 0)
          const totalOutstanding = records.reduce((sum, record) => sum + record.balance, 0)

          // The fundamental equation must hold
          expect(totalExpected).toBe(totalCollected + totalOutstanding)
        }
      )
    )

    it(
      'should handle empty fee records',
      fc.prop(fc.constant([]), records => {
        // Property: Empty records should result in zero totals
        const totalExpected = records.reduce((sum: number, record: FeeRecord) => sum + record.amount, 0)
        const totalCollected = records.reduce((sum: number, record: FeeRecord) => sum + record.paid, 0)
        const totalOutstanding = records.reduce((sum: number, record: FeeRecord) => sum + record.balance, 0)

        expect(totalExpected).toBe(0)
        expect(totalCollected).toBe(0)
        expect(totalOutstanding).toBe(0)
        expect(totalExpected).toBe(totalCollected + totalOutstanding)
      })
    )

    it(
      'should handle single fee record',
      fc.prop(feeRecordArbitrary(), record => {
        // Property: Single record totals should equal the record values
        const records = [record]
        const totalExpected = records.reduce((sum, r) => sum + r.amount, 0)
        const totalCollected = records.reduce((sum, r) => sum + r.paid, 0)
        const totalOutstanding = records.reduce((sum, r) => sum + r.balance, 0)

        expect(totalExpected).toBe(record.amount)
        expect(totalCollected).toBe(record.paid)
        expect(totalOutstanding).toBe(record.balance)
        expect(totalExpected).toBe(totalCollected + totalOutstanding)
      })
    )

    it(
      'should maintain equation for fully paid records',
      fc.prop(
        fc.array(
          fc.record({
            id: fc.uuid(),
            studentId: fc.uuid(),
            studentName: fc.string({ minLength: 2, maxLength: 50 }),
            admissionNo: fc.string({ minLength: 5, maxLength: 10 }),
            class: fc.constantFrom('Primary 1', 'Primary 2', 'JSS 1', 'SS 1'),
            feeType: fc.constantFrom('Tuition', 'Exam', 'Uniform', 'Transport'),
            amount: fc.integer({ min: 1000, max: 100000 }),
            paid: fc.integer({ min: 1000, max: 100000 }),
            balance: fc.integer({ min: 0, max: 0 }), // Fully paid
            status: fc.constant('paid'),
            lastPaymentDate: fc.option(fc.date().map(d => d.toISOString())),
            academicSession: fc.constantFrom('2024/2025', '2025/2026'),
            term: fc.constantFrom('First Term', 'Second Term', 'Third Term'),
            createdAt: fc.date().map(d => d.toISOString()),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        records => {
          // Property: For fully paid records, balance should be 0
          const totalExpected = records.reduce((sum, record) => sum + record.amount, 0)
          const totalCollected = records.reduce((sum, record) => sum + record.paid, 0)
          const totalOutstanding = records.reduce((sum, record) => sum + record.balance, 0)

          expect(totalOutstanding).toBe(0)
          expect(totalExpected).toBe(totalCollected)
          expect(totalExpected).toBe(totalCollected + totalOutstanding)
        }
      )
    )

    it(
      'should maintain equation for unpaid records',
      fc.prop(
        fc.array(
          fc.record({
            id: fc.uuid(),
            studentId: fc.uuid(),
            studentName: fc.string({ minLength: 2, maxLength: 50 }),
            admissionNo: fc.string({ minLength: 5, maxLength: 10 }),
            class: fc.constantFrom('Primary 1', 'Primary 2', 'JSS 1', 'SS 1'),
            feeType: fc.constantFrom('Tuition', 'Exam', 'Uniform', 'Transport'),
            amount: fc.integer({ min: 1000, max: 100000 }),
            paid: fc.constant(0), // Unpaid
            balance: fc.integer({ min: 1000, max: 100000 }),
            status: fc.constant('pending'),
            lastPaymentDate: fc.option(fc.date().map(d => d.toISOString())),
            academicSession: fc.constantFrom('2024/2025', '2025/2026'),
            term: fc.constantFrom('First Term', 'Second Term', 'Third Term'),
            createdAt: fc.date().map(d => d.toISOString()),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        records => {
          // Property: For unpaid records, collected should be 0
          const totalExpected = records.reduce((sum, record) => sum + record.amount, 0)
          const totalCollected = records.reduce((sum, record) => sum + record.paid, 0)
          const totalOutstanding = records.reduce((sum, record) => sum + record.balance, 0)

          expect(totalCollected).toBe(0)
          expect(totalExpected).toBe(totalOutstanding)
          expect(totalExpected).toBe(totalCollected + totalOutstanding)
        }
      )
    )

    it(
      'should maintain equation for partially paid records',
      fc.prop(
        fc.array(
          fc.tuple(
            fc.integer({ min: 1000, max: 100000 }),
            fc.integer({ min: 1, max: 99 })
          ),
          { minLength: 0, maxLength: 50 }
        ),
        amountAndPercentages => {
          // Create partially paid records
          const records = amountAndPercentages.map(([amount, paidPercent]) => ({
            id: fc.sample(fc.uuid(), 1)[0],
            studentId: fc.sample(fc.uuid(), 1)[0],
            studentName: 'Test Student',
            admissionNo: 'ADM001',
            class: 'Primary 1',
            feeType: 'Tuition',
            amount,
            paid: Math.floor((amount * paidPercent) / 100),
            balance: Math.ceil((amount * (100 - paidPercent)) / 100),
            status: 'partial' as const,
            lastPaymentDate: new Date().toISOString(),
            academicSession: '2024/2025',
            term: 'First Term',
            createdAt: new Date().toISOString(),
          }))

          // Property: Equation should hold for partially paid records
          const totalExpected = records.reduce((sum, record) => sum + record.amount, 0)
          const totalCollected = records.reduce((sum, record) => sum + record.paid, 0)
          const totalOutstanding = records.reduce((sum, record) => sum + record.balance, 0)

          expect(totalExpected).toBe(totalCollected + totalOutstanding)
        }
      )
    )

    it(
      'should handle large numbers correctly',
      fc.prop(
        fc.array(
          fc.record({
            id: fc.uuid(),
            studentId: fc.uuid(),
            studentName: fc.string({ minLength: 2, maxLength: 50 }),
            admissionNo: fc.string({ minLength: 5, maxLength: 10 }),
            class: fc.constantFrom('Primary 1', 'Primary 2', 'JSS 1', 'SS 1'),
            feeType: fc.constantFrom('Tuition', 'Exam', 'Uniform', 'Transport'),
            amount: fc.integer({ min: 1000000, max: 10000000 }),
            paid: fc.integer({ min: 0, max: 10000000 }),
            balance: fc.integer({ min: 0, max: 10000000 }),
            status: fc.constantFrom('pending', 'partial', 'paid'),
            lastPaymentDate: fc.option(fc.date().map(d => d.toISOString())),
            academicSession: fc.constantFrom('2024/2025', '2025/2026'),
            term: fc.constantFrom('First Term', 'Second Term', 'Third Term'),
            createdAt: fc.date().map(d => d.toISOString()),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        records => {
          // Property: Equation should hold even with large numbers
          const totalExpected = records.reduce((sum, record) => sum + record.amount, 0)
          const totalCollected = records.reduce((sum, record) => sum + record.paid, 0)
          const totalOutstanding = records.reduce((sum, record) => sum + record.balance, 0)

          expect(totalExpected).toBe(totalCollected + totalOutstanding)
        }
      )
    )

    it(
      'should compute percentages correctly',
      fc.prop(
        fc.array(feeRecordArbitrary(), { minLength: 1, maxLength: 50 }),
        records => {
          // Property: Collection percentage should be between 0 and 100
          const totalExpected = records.reduce((sum, record) => sum + record.amount, 0)
          const totalCollected = records.reduce((sum, record) => sum + record.paid, 0)

          if (totalExpected > 0) {
            const collectionPercentage = (totalCollected / totalExpected) * 100
            expect(collectionPercentage).toBeGreaterThanOrEqual(0)
            expect(collectionPercentage).toBeLessThanOrEqual(100)
          }
        }
      )
    )
  })
})
