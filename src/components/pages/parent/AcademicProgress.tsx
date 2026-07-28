import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'

interface SubjectPerformance {
  id: string; subject: string; caScore: number; examScore: number
  totalScore: number; grade: string; classAverage: number; teacherFeedback: string
  trend: 'up' | 'down' | 'stable'
}

interface AcademicData {
  currentTerm: string
  availableTerms: Array<{ id: string; name: string }>
  subjects: SubjectPerformance[]
  overallGPA: number
  classAverage: number
  performanceTrend: Array<{ term: string; gpa: number; date: string }>
  upcomingAssessments: Array<{ id: string; subject: string; type: string; date: string; weightage: number }>
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />
  return <Minus className="w-4 h-4 text-gray-400" />
}

function gradeColor(grade: string) {
  if (['A', 'A+'].includes(grade)) return 'bg-green-50 text-green-700'
  if (['B', 'B+'].includes(grade)) return 'bg-blue-50 text-blue-700'
  if (['C', 'C+'].includes(grade)) return 'bg-yellow-50 text-yellow-700'
  return 'bg-red-50 text-red-700'
}

export function AcademicProgress() {
  const { selectedChild } = useParentContext()
  const [data, setData] = useState<AcademicData | null>(null)
  const [selectedTerm, setSelectedTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')!).token : null
      const params = new URLSearchParams({ childId: selectedChild.id })
      if (selectedTerm) params.set('termId', selectedTerm)
      const res = await fetch(`/api/parent/academic?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
      if (!selectedTerm) setSelectedTerm(json.currentTerm)
    } catch {
      setError('Failed to load academic data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedChild?.id, selectedTerm])

  if (!selectedChild) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Please select a child.</p></div>

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-48"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-red-500">{error}</p>
      <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button>
    </div>
  )

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Academic Progress</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {data.availableTerms.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* GPA Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Overall GPA</p>
          <p className="text-3xl font-bold text-blue-600">{data.overallGPA.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Class Average GPA</p>
          <p className="text-3xl font-bold text-gray-700">{data.classAverage.toFixed(2)}</p>
        </div>
      </div>

      {/* Subject Performance Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Subject Performance</h3>
        </div>
        {data.subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No grades available for this term.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Subject</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">CA</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Exam</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Total</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Grade</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Class Avg</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium">Trend</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.subjects.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.subject}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{s.caScore}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{s.examScore}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{s.totalScore}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${gradeColor(s.grade)}`}>{s.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.classAverage}</td>
                    <td className="px-4 py-3 text-center"><TrendIcon trend={s.trend} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{s.teacherFeedback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming Assessments */}
      {data.upcomingAssessments.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming Assessments</h3>
          <div className="space-y-3">
            {data.upcomingAssessments.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.subject} — {a.type}</p>
                  <p className="text-xs text-gray-500">{a.date}</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{a.weightage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
