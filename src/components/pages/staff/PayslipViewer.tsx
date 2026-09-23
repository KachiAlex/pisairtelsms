import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, ChevronDown, Printer } from 'lucide-react'
import { Button } from '../../ui/button'

interface PayslipLine {
  category: string
  label: string
  amount: number
}

interface Payslip {
  id: string
  month: string
  year: number
  basicSalary: number
  earnings: PayslipLine[]
  deductions: PayslipLine[]
  grossPay: number
  totalDeductions: number
  netPay: number
  payeTax: number
  pensionEmployee: number
  pensionEmployer: number
  paymentStatus: 'pending' | 'paid' | 'failed'
  paymentDate?: string
  paymentReference?: string
}

export function PayslipViewer() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const auth = localStorage.getItem('auth')
  const token = auth ? JSON.parse(auth).token : null

  useEffect(() => {
    const fetchPayslips = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!token) {
          setError('Not authenticated')
          return
        }

        const response = await fetch('/api/staff/payslips', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch payslips')
        }

        const data = await response.json()
        setPayslips(data.payslips || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching payslips:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayslips()
  }, [token])

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Payslip</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #555; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        td { padding: 6px 4px; font-size: 14px; }
        .right { text-align: right; }
        .head td { font-weight: 700; border-bottom: 1px solid #ccc; }
        .section { font-weight: 700; color: #333; padding-top: 12px; }
        .net td { font-size: 17px; font-weight: 700; border-top: 2px solid #111; padding-top: 10px; }
      </style></head><body>${content.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Payslips</h3>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (payslips.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No payslips available</p>
        <p className="text-sm text-gray-500 mt-1">Payslips appear here once the school runs and disburses payroll.</p>
      </div>
    )
  }

  const fmt = (n: number) => `₦${Number(n).toLocaleString()}`

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Payslip List */}
        <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payslips</h2>
          <div className="space-y-2">
            {payslips.map((payslip) => (
              <button
                key={payslip.id}
                onClick={() => setSelectedPayslip(payslip)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selectedPayslip?.id === payslip.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">
                    {payslip.month} {payslip.year}
                  </p>
                  <span className={`text-xs font-medium ${
                    payslip.paymentStatus === 'paid' ? 'text-green-600'
                    : payslip.paymentStatus === 'failed' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {payslip.paymentStatus === 'paid' ? 'Paid' : payslip.paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {fmt(payslip.netPay)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Payslip Detail */}
        <div className="lg:col-span-2">
          {selectedPayslip ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
              <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Payslip — {selectedPayslip.month} {selectedPayslip.year}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Status:{' '}
                  <span className={`font-semibold ${
                    selectedPayslip.paymentStatus === 'paid'
                      ? 'text-green-600'
                      : selectedPayslip.paymentStatus === 'failed' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {selectedPayslip.paymentStatus === 'paid' ? 'Paid'
                      : selectedPayslip.paymentStatus === 'failed' ? 'Payment failed' : 'Pending'}
                  </span>
                </p>
                {selectedPayslip.paymentDate && (
                  <p className="text-sm text-gray-600">
                    Paid: {new Date(selectedPayslip.paymentDate).toLocaleDateString()}
                    {selectedPayslip.paymentReference && ` · Ref ${selectedPayslip.paymentReference}`}
                  </p>
                )}
              </div>

              {/* Printable content */}
              <div ref={printRef}>
                <div className="space-y-6">
                  {/* Earnings */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Earnings</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-700">
                        <span>Basic Salary</span>
                        <span className="font-medium">{fmt(selectedPayslip.basicSalary)}</span>
                      </div>
                      {selectedPayslip.earnings.map((e, i) => (
                        <div key={i} className="flex justify-between text-gray-700">
                          <span>{e.label}</span>
                          <span className="font-medium">{fmt(e.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-900 font-semibold">
                        <span>Gross Pay</span>
                        <span>{fmt(selectedPayslip.grossPay)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Deductions</h3>
                    <div className="space-y-2">
                      {selectedPayslip.deductions.map((d, i) => (
                        <div key={i} className="flex justify-between text-gray-700">
                          <span>{d.label}</span>
                          <span className="font-medium text-red-600">-{fmt(d.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-900 font-semibold">
                        <span>Total Deductions</span>
                        <span className="text-red-600">-{fmt(selectedPayslip.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employer contribution (informational) */}
                  {selectedPayslip.pensionEmployer > 0 && (
                    <p className="text-xs text-gray-500">
                      Employer pension contribution (not deducted from your pay): {fmt(selectedPayslip.pensionEmployer)}
                    </p>
                  )}

                  {/* Net Salary */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Net Pay</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {fmt(selectedPayslip.netPay)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Print Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4 mr-2" /> Download / Print Payslip
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-gray-600">Select a payslip to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
