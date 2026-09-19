import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Alert, AlertDescription } from '../../ui/alert'
import { financeApiGet, financeApiPost } from '../../../lib/financeApi'
import { fetchStudents } from '../../../lib/studentsClient'
import type { Student } from '../../../lib/studentsClient'

interface FeeAssignment {
  id: string
  studentId: string
  feeStructureId: string
  academicSession: string
  term: string
  totalAmount: number
  totalPaid: number
  totalBalance: number
  status: string
  dueDate: string
  structureName?: string
}

interface Payment {
  id: string
  receiptNumber: string
  status: string
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mobile_money', label: 'Mobile Money' },
]

const METHODS_REQUIRING_REFERENCE = new Set(['bank_transfer', 'pos', 'cheque', 'mobile_money'])

const REFERENCE_LABELS: Record<string, string> = {
  bank_transfer: 'Bank transaction / transfer reference',
  pos: 'POS transaction reference',
  cheque: 'Cheque number',
  mobile_money: 'Mobile money transaction ID',
}

interface PaymentFormProps {
  studentId?: string
  feeAssignmentId?: string
  balance?: number
  paymentFor?: string
  onSuccess?: (payment: Payment) => void
  onCancel?: () => void
}

function formatCurrency(amount: number) {
  return `₦${amount.toLocaleString()}`
}

function assignmentLabel(a: FeeAssignment) {
  const purpose = a.structureName || 'Fee'
  const period = [a.term, a.academicSession].filter(Boolean).join(' ')
  return `${purpose}${period ? ` — ${period}` : ''} (balance ${formatCurrency(a.totalBalance)})`
}

export function PaymentForm({
  studentId: propStudentId,
  feeAssignmentId: propFeeAssignmentId,
  balance: propBalance,
  paymentFor,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const standalone = !propStudentId

  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState(propStudentId || '')
  const [assignments, setAssignments] = useState<FeeAssignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(propFeeAssignmentId || '')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!standalone) return
    setStudentsLoading(true)
    fetchStudents()
      .then((list) => setStudents(list.filter((s) => s.status === 'Active')))
      .catch(() => setError('Unable to load students'))
      .finally(() => setStudentsLoading(false))
  }, [standalone])

  useEffect(() => {
    if (!standalone || !selectedStudentId) {
      if (standalone) setAssignments([])
      return
    }
    setAssignmentsLoading(true)
    setAssignments([])
    financeApiGet(`/api/tenant/finance/fee-assignments?studentId=${selectedStudentId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load outstanding fees')
        const result = await response.json()
        setAssignments((result.data || []).filter((a: FeeAssignment) => a.totalBalance > 0))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load outstanding fees'))
      .finally(() => setAssignmentsLoading(false))
  }, [standalone, selectedStudentId])

  const selectedAssignment = standalone
    ? assignments.find((a) => a.id === selectedAssignmentId)
    : undefined

  const selectedStudent = standalone
    ? students.find((s) => s.id === selectedStudentId)
    : undefined

  const filteredStudents = studentSearch.trim()
    ? students.filter((s) => {
        const q = studentSearch.trim().toLowerCase()
        return (
          s.name.toLowerCase().includes(q) ||
          (s.admissionNo || '').toLowerCase().includes(q) ||
          (s.class || '').toLowerCase().includes(q)
        )
      })
    : students

  const balance = standalone ? selectedAssignment?.totalBalance ?? 0 : propBalance ?? 0
  const feeAssignmentId = standalone ? selectedAssignmentId : propFeeAssignmentId
  const studentId = standalone ? selectedStudentId : propStudentId

  const numAmount = parseFloat(amount) || 0
  const balanceAfter = feeAssignmentId ? balance - numAmount : null

  const handleAssignmentChange = (id: string) => {
    setSelectedAssignmentId(id)
    const a = assignments.find((x) => x.id === id)
    if (a) setAmount(String(a.totalBalance))
  }

  const requiresReference = METHODS_REQUIRING_REFERENCE.has(paymentMethod)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!numAmount || numAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    if (!studentId) {
      setError('Select a student')
      return
    }
    if (!feeAssignmentId) {
      setError('Select what this payment is for')
      return
    }
    if (numAmount > balance) {
      setError(`Amount cannot exceed the outstanding balance of ${formatCurrency(balance)}`)
      return
    }
    if (requiresReference && !referenceNumber.trim()) {
      setError(`${REFERENCE_LABELS[paymentMethod] || 'Reference number'} is required for this payment method`)
      return
    }
    if (!paymentDate) {
      setError('Payment date is required')
      return
    }

    setLoading(true)
    try {
      const response = await financeApiPost('/api/tenant/finance/payments', {
        studentId,
        feeAssignmentId,
        feeStructureId: standalone ? selectedAssignment?.feeStructureId : undefined,
        amount: numAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        paymentDate,
        notes: notes.trim() || undefined,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to record payment')
      }

      const result = await response.json()
      const payment = result.data as Payment | undefined
      onSuccess?.(result.data)

      if (payment?.receiptNumber) {
        setSuccessMessage(
          `Payment recorded — receipt ${payment.receiptNumber}${
            payment.status === 'pending' ? ' (awaiting confirmation)' : ''
          }`
        )
      }

      setAmount('')
      setReferenceNumber('')
      setNotes('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      if (standalone) {
        setSelectedStudentId('')
        setSelectedAssignmentId('')
        setStudentSearch('')
        setAssignments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const purposeLabel = standalone
    ? selectedAssignment
      ? assignmentLabel(selectedAssignment)
      : null
    : paymentFor || null

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Record Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {standalone && (
            <>
              <div className="space-y-2">
                <Label htmlFor="studentSearch">Student</Label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between px-3 py-2 border border-blue-300 bg-blue-50 rounded-md">
                    <span className="text-sm font-medium">
                      {selectedStudent.name} ({selectedStudent.admissionNo}) — {selectedStudent.class}
                      {selectedStudent.arm ? ` ${selectedStudent.arm}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentId('')
                        setSelectedAssignmentId('')
                        setAmount('')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      id="studentSearch"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder={studentsLoading ? 'Loading students…' : 'Search by name, admission no, or class'}
                      disabled={studentsLoading}
                    />
                    {students.length > 0 && (
                      <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto divide-y">
                        {filteredStudents.slice(0, 15).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(s.id)
                              setSelectedAssignmentId('')
                              setAmount('')
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                          >
                            <span className="font-medium">{s.name}</span>
                            <span className="text-gray-500 ml-2">
                              {s.admissionNo} — {s.class}
                              {s.arm ? ` ${s.arm}` : ''}
                            </span>
                          </button>
                        ))}
                        {filteredStudents.length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-500">No students match "{studentSearch}"</p>
                        )}
                        {filteredStudents.length > 15 && (
                          <p className="px-3 py-2 text-xs text-gray-400">
                            {filteredStudents.length - 15} more — refine your search
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {selectedStudentId && (
                <div className="space-y-2">
                  <Label htmlFor="paymentFor">Payment For</Label>
                  <select
                    id="paymentFor"
                    value={selectedAssignmentId}
                    onChange={(e) => handleAssignmentChange(e.target.value)}
                    disabled={assignmentsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">
                      {assignmentsLoading ? 'Loading outstanding fees…' : 'Select outstanding fee'}
                    </option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {assignmentLabel(a)}
                      </option>
                    ))}
                  </select>
                  {!assignmentsLoading && assignments.length === 0 && (
                    <p className="text-sm text-gray-500">No outstanding fees for this student.</p>
                  )}
                </div>
              )}
            </>
          )}

          {!standalone && purposeLabel && (
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              Payment for: <span className="font-medium">{purposeLabel}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={balance > 0 ? balance : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                placeholder="0.00"
                disabled={!feeAssignmentId}
              />
            </div>
            <p className="text-sm text-gray-500">
              {feeAssignmentId
                ? `Outstanding balance: ${formatCurrency(balance)}`
                : 'Select a student and fee first'}
            </p>
            {feeAssignmentId && numAmount > 0 && balanceAfter !== null && (
              <p className={`text-sm ${balanceAfter < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                Balance after payment: {formatCurrency(Math.max(balanceAfter, 0))}
                {balanceAfter === 0 ? ' — fully paid' : ''}
                {balanceAfter < 0 ? ' — amount exceeds balance' : ''}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber">
              Reference Number{requiresReference ? '' : ' (optional)'}
            </Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={
                requiresReference
                  ? REFERENCE_LABELS[paymentMethod] || 'Transaction reference'
                  : 'Teller or receipt no., if any'
              }
            />
            <p className="text-sm text-gray-500">
              {requiresReference
                ? REFERENCE_LABELS[paymentMethod]
                : 'Leave blank for cash — a receipt number is generated automatically'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <p className="text-sm text-gray-500">The date the money was actually received</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional payment details..."
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !feeAssignmentId || numAmount <= 0 || numAmount > balance}
              className="flex-1"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
