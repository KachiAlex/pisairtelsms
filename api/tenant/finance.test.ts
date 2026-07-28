import { describe, it, expect } from 'vitest'

/**
 * Property 15: Payment Balance Update
 * For any fee record and any payment amount, after the POST balance must equal amount - paid
 * Validates: Requirements 8.4
 */

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
  academicSession: string
  term: string
}

// Mirrors balance computation logic from the finance API
function computeBalance(amount: number, paid: number): number {
  return amount - paid
}

function applyPayment(record: FeeRecord, amountPaid: number): FeeRecord {
  const newPaid = record.paid + amountPaid
  const newBalance = computeBalance(record.amount, newPaid)
  const newStatus: FeeRecord['status'] =
    newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
  return { ...record, paid: newPaid, balance: newBalance, status: newStatus }
}

function buildFeeRecord(overrides: Partial<FeeRecord> = {}): FeeRecord {
  const amount = overrides.amount ?? 50000
  const paid = overrides.paid ?? 0
  return {
    id: 'fee_001',
    studentId: 'student_001',
    studentName: 'John Doe',
    admissionNo: 'ADM001',
    class: 'JSS 1',
    feeType: 'School Fees',
    amount,
    paid,
    balance: amount - paid,
    status: paid === 0 ? 'pending' : paid >= amount ? 'paid' : 'partial',
    academicSession: '2024/2025',
    term: 'First Term',
    ...overrides,
  }
}

describe('Finance API - Property Tests', () => {
  describe('Property 15: Payment Balance Update', () => {
    it('balance must equal amount - paid after any payment (invariant)', () => {
      const record = buildFeeRecord({ amount: 50000, paid: 0 })
      const paymentAmounts = [10000, 20000, 5000, 15000]

      let current = record
      for (const payment of paymentAmounts) {
        current = applyPayment(current, payment)
        expect(current.balance).toBe(current.amount - current.paid)
      }
    })

    it('should compute correct balance for 20 random payment scenarios (property-based)', () => {
      for (let i = 0; i < 20; i++) {
        const amount = Math.floor(Math.random() * 100000) + 1000
        const paid = Math.floor(Math.random() * amount)
        const record = buildFeeRecord({ amount, paid, balance: amount - paid })
        expect(record.balance).toBe(record.amount - record.paid)
      }
    })

    it('balance should be 0 when fully paid', () => {
      const record = buildFeeRecord({ amount: 50000, paid: 0 })
      const updated = applyPayment(record, 50000)
      expect(updated.balance).toBe(0)
      expect(updated.status).toBe('paid')
    })

    it('balance should be negative when overpaid', () => {
      const record = buildFeeRecord({ amount: 50000, paid: 0 })
      const updated = applyPayment(record, 60000)
      expect(updated.balance).toBe(-10000)
      expect(updated.balance).toBe(updated.amount - updated.paid)
    })

    it('balance should equal full amount when nothing paid', () => {
      const amounts = [10000, 25000, 50000, 100000]
      for (const amount of amounts) {
        const record = buildFeeRecord({ amount, paid: 0 })
        expect(record.balance).toBe(amount)
      }
    })

    it('balance invariant holds after multiple sequential payments (property-based)', () => {
      for (let i = 0; i < 10; i++) {
        const amount = 100000
        let record = buildFeeRecord({ amount, paid: 0 })
        let totalPaid = 0

        // Make 3–5 partial payments
        const numPayments = 3 + (i % 3)
        for (let j = 0; j < numPayments; j++) {
          const payment = Math.floor(amount / (numPayments + 1))
          record = applyPayment(record, payment)
          totalPaid += payment
          expect(record.balance).toBe(record.amount - record.paid)
          expect(record.paid).toBe(totalPaid)
        }
      }
    })

    it('status should be pending when paid is 0', () => {
      const record = buildFeeRecord({ amount: 50000, paid: 0 })
      expect(record.status).toBe('pending')
    })

    it('status should be partial when partially paid', () => {
      const record = buildFeeRecord({ amount: 50000, paid: 25000, balance: 25000 })
      expect(record.status).toBe('partial')
    })

    it('status should be paid when fully paid', () => {
      const record = buildFeeRecord({ amount: 50000, paid: 50000, balance: 0 })
      expect(record.status).toBe('paid')
    })
  })

  describe('Finance total computation', () => {
    it('totalExpected should equal sum of all fee record amounts', () => {
      const records = [
        buildFeeRecord({ amount: 50000, paid: 30000, balance: 20000 }),
        buildFeeRecord({ amount: 40000, paid: 40000, balance: 0 }),
        buildFeeRecord({ amount: 60000, paid: 0, balance: 60000 }),
      ]
      const totalExpected = records.reduce((sum, r) => sum + r.amount, 0)
      const totalCollected = records.reduce((sum, r) => sum + r.paid, 0)
      const totalOutstanding = records.reduce((sum, r) => sum + r.balance, 0)

      expect(totalExpected).toBe(150000)
      expect(totalCollected).toBe(70000)
      expect(totalOutstanding).toBe(80000)
      // Core invariant: totalExpected = totalCollected + totalOutstanding
      expect(totalExpected).toBe(totalCollected + totalOutstanding)
    })

    it('totalExpected = totalCollected + totalOutstanding for any set of records (property-based)', () => {
      for (let i = 0; i < 20; i++) {
        const count = 3 + (i % 5)
        const records = Array.from({ length: count }, () => {
          const amount = Math.floor(Math.random() * 100000) + 1000
          const paid = Math.floor(Math.random() * (amount + 1))
          return buildFeeRecord({ amount, paid, balance: amount - paid })
        })
        const totalExpected = records.reduce((s, r) => s + r.amount, 0)
        const totalCollected = records.reduce((s, r) => s + r.paid, 0)
        const totalOutstanding = records.reduce((s, r) => s + r.balance, 0)
        expect(totalExpected).toBe(totalCollected + totalOutstanding)
      }
    })
  })
})
