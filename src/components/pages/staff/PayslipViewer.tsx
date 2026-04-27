import React, { useEffect, useState } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '../../ui/button'

interface Payslip {
  id: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  paymentStatus: 'pending' | 'paid'
  paymentDate?: string
}

export function PayslipViewer() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)

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
      </div>
    )
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getMonthName = (monthStr: string) => {
    const monthNum = parseInt(monthStr)
    return monthNames[monthNum - 1] || monthStr
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payslip List */}
        <div className="lg:col-span-1 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payslips</h2>
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
                <p className="font-semibold text-gray-900">
                  {getMonthName(payslip.month)} {payslip.year}
                </p>
                <p className="text-sm text-gray-600">
                  ₦{payslip.netSalary.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Payslip Detail */}
        <div className="lg:col-span-2">
          {selectedPayslip ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Payslip - {getMonthName(selectedPayslip.month)} {selectedPayslip.year}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Status:{' '}
                  <span className={`font-semibold ${
                    selectedPayslip.paymentStatus === 'paid'
                      ? 'text-green-600'
                      : 'text-amber-600'
                  }`}>
                    {selectedPayslip.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </p>
                {selectedPayslip.paymentDate && (
                  <p className="text-sm text-gray-600">
                    Payment Date: {selectedPayslip.paymentDate}
                  </p>
                )}
              </div>

              {/* Salary Breakdown */}
              <div className="space-y-6">
                {/* Earnings */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-700">
                      <span>Basic Salary</span>
                      <span className="font-medium">₦{selectedPayslip.basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Allowances</span>
                      <span className="font-medium">₦{selectedPayslip.allowances.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-900 font-semibold">
                      <span>Gross Salary</span>
                      <span>₦{(selectedPayslip.basicSalary + selectedPayslip.allowances).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Deductions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-700">
                      <span>Total Deductions</span>
                      <span className="font-medium">₦{selectedPayslip.deductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Net Salary</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₦{selectedPayslip.netSalary.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Download Payslip
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
