import { useState, useEffect } from 'react'
import { CalendarCheck, Download } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'

interface AttendanceData {
  attendancePercent: number
  totalPresent: number
  totalAbsent: number
  totalLate: number
  records: Array<{ id: string; date: string; status: 'present' | 'absent' | 'late'; subject: string; reason?: string }>
  trend: Array<{ week: string; percent: number }>
  absenceReasons: Array<{ date: string; reason: string; approvedBy?: string }>
}

const statusColor = (status: string) => {
  if (status === 'present') return 'bg-green-50 text-green-700'
  if (status === 'absent') return 'bg-red-50 text-red-700'
  return 'bg-yellow-50 text-yellow-700'
}

export function AttendanceTracking() {
  const { selectedChild } = useParentContext()
  const [data, setData] = useState<AttendanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : null
      const params = new URLSearchParams({ childId: selectedChild.id })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/parent/attendance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      setData(await res.json())
    } catch {
      setError('Failed to load attendance data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedChild?.id])

  if (!selectedChild) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Please select a child.</p></div>
  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded"></div><div className="h-64 bg-gray-200 rounded"></div></div>
  if (error) return <div className="flex flex-col items-center justify-center h-64 gap-4"><p className="text-red-500">{error}</p><button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button></div>
  if (!data) return null

  const pct = data.attendancePercent
  const pctColor = pct >= 90 ? 'text-green-600' : pct >= 75 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Attendance Rate</p>
          <p className={`text-2xl sm:text-3xl font-bold ${pctColor}`}>{pct}%</p>
          {pct < 75 && <p className="text-xs text-red-500 mt-1">Below minimum threshold</p>}
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Present</p>
          <p className="text-2xl font-bold text-green-600">{data.totalPresent}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Absent</p>
          <p className="text-2xl font-bold text-red-600">{data.totalAbsent}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Late</p>
          <p className="text-2xl font-bold text-yellow-600">{data.totalLate}</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Filter</button>
      </div>

      {/* Records */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Attendance Records</h3>
        </div>
        {data.records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Subject</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{r.date}</td>
                    <td className="px-4 py-3 text-gray-700">{r.subject}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColor(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Absence Reasons */}
      {data.absenceReasons.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Absence Reasons</h3>
          <div className="space-y-3">
            {data.absenceReasons.map((r, i) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-900">{r.reason}</p>
                  <p className="text-xs text-gray-500">{r.date}</p>
                </div>
                {r.approvedBy && <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Approved by {r.approvedBy}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
