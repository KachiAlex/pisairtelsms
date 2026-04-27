import { useState, useEffect } from 'react'
import { CreditCard, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'

interface FeeData {
  summary: { totalFees: number; paidAmount: number; outstandingBalance: number; dueDate: string; status: 'paid' | 'partial' | 'overdue' }
  feeStructure: Array<{ id: string; name: string; amount: number; dueDate: string; status: 'paid' | 'pending' | 'overdue' }>
  paymentHistory: Array<{ id: string; date: string; amount: number; method: string; reference: string; receiptUrl: string; status: string }>
  paymentPlans: Array<{ id: string; startDate: string; endDate: string; installments: Array<{ id: string; dueDate: string; amount: number; status: string; paidDate?: string }> }>
  exemptions: Array<{ id: string; type: string; amount: number; reason: string; approvedDate: string }>
}

const statusIcon = (status: string) => {
  if (status === 'paid') return <CheckCircle className="w-4 h-4 text-green-500" />
  if (status === 'overdue') return <AlertTriangle className="w-4 h-4 text-red-500" />
  return <Clock className="w-4 h-4 text-yellow-500" />
}

const statusBadge = (status: string) => {
  if (status === 'paid') return 'bg-green-50 text-green-700'
  if (status === 'overdue') return 'bg-red-50 text-red-700'
  return 'bg-yellow-50 text-yellow-700'
}

export function FeeManagement() {
  const { selectedChild } = useParentContext()
  const [data, setData] = useState<FeeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : null
      const res = await fetch(`/api/parent/fees?childId=${selectedChild.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      setData(await res.json())
    } catch {
      setError('Failed to load fee data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedChild?.id])

  if (!selectedChild) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Please select a child.</p></div>
  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded"></div><div className="h-64 bg-gray-200 rounded"></div></div>
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-4"><p className="text-red-500">{error}</p><button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button></div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Fee Management</h1>
      </div>

      {/* Summary Card */}
      <div className={`rounded-xl p-5 border ${data.summary.status === 'paid' ? 'bg-green-50 border-green-200' : data.summary.status === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Fees</p>
            <p className="text-xl font-bold text-gray-900">₦{data.summary.totalFees.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Paid</p>
            <p className="text-xl font-bold text-green-700">₦{data.summary.paidAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className={`text-xl font-bold ${data.summary.outstandingBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
              ₦{data.summary.outstandingBalance.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Due Date</p>
            <p className="text-xl font-bold text-gray-900">{data.summary.dueDate}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${statusBadge(data.summary.status)}`}>{data.summary.status}</span>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Fee Breakdown</h3>
        </div>
        {data.feeStructure.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No fee structure available.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.feeStructure.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {statusIcon(item.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Due: {item.dueDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₦{item.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${statusBadge(item.status)}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Payment History</h3>
        </div>
        {data.paymentHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payment history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Method</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Reference</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.paymentHistory.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{p.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">₦{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{p.method}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.reference}</td>
                    <td className="px-4 py-3 text-center">
                      <a href={p.receiptUrl} className="text-blue-600 hover:underline text-xs flex items-center justify-center gap-1">
                        <Download className="w-3 h-3" /> Receipt
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exemptions */}
      {data.exemptions.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Exemptions & Discounts</h3>
          <div className="space-y-3">
            {data.exemptions.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.type}</p>
                  <p className="text-xs text-gray-500">{e.reason} · Approved {e.approvedDate}</p>
                </div>
                <span className="text-sm font-bold text-green-700">-₦{e.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
