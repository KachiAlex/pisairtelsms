import { describe, it, expect } from 'vitest'
import { computePayroll, calculatePAYE } from './payroll.js'

const NIGERIA_BRACKETS = [
  { min: 0, max: 300000, rate: 7 },
  { min: 300000, max: 600000, rate: 11 },
  { min: 600000, max: 1100000, rate: 15 },
  { min: 1100000, max: 1600000, rate: 19 },
  { min: 1600000, max: 3200000, rate: 21 },
  { min: 3200000, max: null, rate: 24 },
]

describe('calculatePAYE', () => {
  it('applies brackets progressively', () => {
    expect(calculatePAYE(0, NIGERIA_BRACKETS)).toBe(0)
    expect(calculatePAYE(300000, NIGERIA_BRACKETS)).toBeCloseTo(21000, 5)
    // 21,000 + 11% of 100,000 = 32,000
    expect(calculatePAYE(400000, NIGERIA_BRACKETS)).toBeCloseTo(32000, 5)
  })

  it('handles the top unbounded bracket', () => {
    const tax = calculatePAYE(4000000, NIGERIA_BRACKETS)
    expect(tax).toBeGreaterThan(0)
  })
})

describe('computePayroll', () => {
  it('computes statutory deductions and net pay for a ₦100k basic salary', () => {
    const result = computePayroll(100000, [], [], null)

    expect(result.grossPay).toBe(100000)
    expect(result.pensionEmployee).toBe(8000)
    expect(result.pensionEmployer).toBe(10000)
    expect(result.nhf).toBe(2500)
    expect(result.nhis).toBe(1500)

    // CRA = max(200,000, 1% × 1.2M) + 20% × 1.2M = 440,000
    // taxable = 1,200,000 − 96,000 pension − 30,000 NHF − 18,000 NHIS − 440,000 = 616,000
    // annual PAYE = 21,000 + 33,000 + (16,000 × 15%) = 56,400 → 4,700/month
    expect(result.payeTax).toBeCloseTo(4700, 5)

    expect(result.totalDeductions).toBeCloseTo(16700, 5)
    expect(result.netPay).toBeCloseTo(83300, 5)
  })

  it('includes the 20% CRA component (lower PAYE than the old formula)', () => {
    // Without the +20% gross component CRA would be only 200,000 and taxable
    // income 856,000 → annual PAYE 92,400 → 7,700/month. The fixed formula
    // must produce materially less tax.
    const result = computePayroll(100000, [], [], null)
    expect(result.payeTax).toBeLessThan(7000)
  })

  it('adds earnings to gross and applies deductions', () => {
    const result = computePayroll(
      100000,
      [{ category: 'allowance', label: 'Housing', amount: 20000 }],
      [{ category: 'deduction', label: 'Union dues', amount: 1000 }],
      null
    )
    expect(result.grossPay).toBe(120000)
    expect(result.netPay).toBeCloseTo(result.grossPay - result.totalDeductions, 5)
    expect(result.allDeductions.some(d => d.label === 'Union dues')).toBe(true)
  })

  it('respects tenant tax config rates', () => {
    const config = {
      id: 't1', tenantId: 'tenant-1', taxYear: 2025,
      cratumAllowance: 200000, cratumPercentage: 1.0,
      pensionRateEmployee: 5, pensionRateEmployer: 7.5,
      nhfRate: 0, nhisRate: 0,
      brackets: NIGERIA_BRACKETS, isActive: true,
      createdAt: '', updatedAt: '',
    }
    const result = computePayroll(100000, [], [], config)
    expect(result.pensionEmployee).toBe(5000)
    expect(result.pensionEmployer).toBe(7500)
    expect(result.nhf).toBe(0)
    expect(result.nhis).toBe(0)
  })

  it('never produces negative taxable income for low earners', () => {
    // ₦30k/month: taxable = 360k − 28.8k pension − 9k NHF − 5.4k NHIS − 272k
    // CRA = 44,800 → annual PAYE 3,136 → 261.33/month. PAYE stays positive and
    // small; net pay remains positive.
    const result = computePayroll(30000, [], [], null)
    expect(result.payeTax).toBeCloseTo(261.33, 1)
    expect(result.netPay).toBeGreaterThan(0)
  })
})
