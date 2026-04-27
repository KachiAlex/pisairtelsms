import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'

interface BehavioralData {
  conductGrade: string
  conductTrend: Array<{ term: string; grade: string; date: string }>
  incidents: Array<{ id: string; date: string; type: string; description: string; severity: 'minor' | 'moderate' | 'serious'; action: string; reportedBy: string }>
  positiveRecognition: Array<{ id: string; date: string; type: string; description: string; awardedBy: string }>
  teacherComments: Array<{ id: string; teacher: string; subject: string; comment: string; date: string }>
}

const severityColor = (severity: string) => {
  if (severity === 'serious') return 'bg-red-50 border-red-200 text-red-700'
  if (severity === 'moderate') return 'bg-yellow-50 border-yellow-200 text-yellow-700'
  return 'bg-green-50 border-green-200 text-green-700'
}

const gradeColor = (grade: string) => {
  if (['A', 'A+'].includes(grade)) return 'text-green-600'
  if (['B', 'B+'].includes(grade)) return 'text-blue-600'
  if (['C', 'C+'].includes(grade)) return 'text-yellow-600'
  return 'text-red-600'
}

export function BehavioralReports() {
  const { selectedChild } = useParentContext()
  const [data, setData] = useState<BehavioralData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : null
      const res = await fetch(`/api/parent/behavioral?childId=${selectedChild.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      setData(await res.json())
    } catch {
      setError('Failed to load behavioral data.')
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
        <AlertCircle className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Behavioral Reports</h1>
      </div>

      {/* Conduct Grade */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current Conduct Grade</p>
            <p className={`text-4xl font-bold ${gradeColor(data.conductGrade)}`}>{data.conductGrade}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-2">Trend</p>
            <div className="space-y-1">
              {data.conductTrend.slice(-3).map((t, i) => (
                <div key={i} className="text-xs text-gray-600">{t.term}: <span className={gradeColor(t.grade)}>{t.grade}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Incidents */}
      {data.incidents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Incident Reports</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.incidents.map(i => (
              <div key={i.id} className={`p-5 border-l-4 ${severityColor(i.severity)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{i.type}</p>
                    <p className="text-xs text-gray-500">{i.date} · Reported by {i.reportedBy}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${severityColor(i.severity)}`}>{i.severity}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{i.description}</p>
                <p className="text-xs text-gray-600"><strong>Action:</strong> {i.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positive Recognition */}
      {data.positiveRecognition.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Positive Recognition</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.positiveRecognition.map(r => (
              <div key={r.id} className="p-5 border-l-4 border-green-200 bg-green-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{r.type}</p>
                    <p className="text-sm text-gray-700 mt-1">{r.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{r.date} · Awarded by {r.awardedBy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher Comments */}
      {data.teacherComments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Teacher Comments</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.teacherComments.map(c => (
              <div key={c.id} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{c.teacher}</p>
                    <p className="text-xs text-gray-500">{c.subject}</p>
                  </div>
                  <p className="text-xs text-gray-500">{c.date}</p>
                </div>
                <p className="text-sm text-gray-700">{c.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.incidents.length === 0 && data.positiveRecognition.length === 0 && data.teacherComments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No behavioral records available.</p>
        </div>
      )}
    </div>
  )
}
