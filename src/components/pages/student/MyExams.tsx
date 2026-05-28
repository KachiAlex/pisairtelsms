import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, FileText, AlertCircle, CheckCircle, Loader2, Download, Filter, ChevronRight, BookOpen } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

type ExamStatus = 'upcoming' | 'ongoing' | 'completed'
type ExamType = 'midterm' | 'terminal' | 'mock' | 'promotion'

interface Exam {
  id: string
  subject: string
  paper: string
  date: string
  startTime: string
  endTime: string
  duration: string
  venue: string
  type: ExamType
  status: ExamStatus
  instructions: string
  materialsAllowed: string[]
}

interface ExamSummary {
  total: number
  upcoming: number
  completed: number
  ongoing: number
}

const statusConfig: Record<ExamStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  upcoming: { label: 'Upcoming', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Clock className="w-4 h-4" /> },
  ongoing: { label: 'Ongoing', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: <CheckCircle className="w-4 h-4" /> },
}

const typeConfig: Record<ExamType, { label: string }> = {
  midterm: { label: 'Mid-Term' },
  terminal: { label: 'Terminal' },
  mock: { label: 'Mock' },
  promotion: { label: 'Promotion' },
}

export function MyExams() {
  const [exams, setExams] = useState<Exam[]>([])
  const [summary, setSummary] = useState<ExamSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ExamStatus | 'all'>('all')
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchExams()
  }, [filter])

  const fetchExams = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = auth?.token
      if (!token) { setError('Not authenticated'); return }

      let url = '/api/student/exams'
      if (filter !== 'all') {
        url += `?status=${filter}`
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch exam schedule')

      const data = await res.json()
      setExams(data.exams || [])
      setSummary(data.summary)
    } catch (err) {
      console.error('Failed to fetch exams:', err)
      setError('Failed to load exam schedule')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const handleDownloadSchedule = () => {
    if (!exams.length) return
    const payload = { exams, summary, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exam_schedule.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Detail view
  if (selectedExam) {
    const config = statusConfig[selectedExam.status]
    const daysUntil = getDaysUntil(selectedExam.date)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedExam(null)} className="gap-2">
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>
                {config.icon}
                {config.label}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {typeConfig[selectedExam.type].label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{selectedExam.subject}</h1>
            <p className="text-gray-600 mt-1">{selectedExam.paper}</p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">{formatDate(selectedExam.date)}</p>
                {selectedExam.status === 'upcoming' && (
                  <p className="text-xs text-blue-600">
                    {daysUntil > 0 ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left` : 'Today'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">{formatTime(selectedExam.startTime)} - {formatTime(selectedExam.endTime)}</p>
                <p className="text-xs text-amber-600">{selectedExam.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <MapPin className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">{selectedExam.venue}</p>
                <p className="text-xs text-purple-600">Venue</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h3>
            <p className="text-gray-700 leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-200">
              {selectedExam.instructions}
            </p>
          </div>

          {/* Materials Allowed */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Materials Allowed</h3>
            <div className="flex flex-wrap gap-2">
              {selectedExam.materialsAllowed.map(item => (
                <span key={item} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Schedule</h1>
          <p className="text-gray-600 mt-1">
            {summary ? `${summary.total} exam${summary.total !== 1 ? 's' : ''} · ${summary.upcoming} upcoming` : ''}
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadSchedule} className="gap-2">
          <Download className="w-4 h-4" />
          Download Schedule
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchExams}>Retry</Button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{summary.upcoming}</p>
            <p className="text-sm text-blue-600">Upcoming</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{summary.ongoing}</p>
            <p className="text-sm text-green-600">Ongoing</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
            <CheckCircle className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-700">{summary.completed}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {(['all', 'upcoming', 'ongoing', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Exams List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {filter === 'all' ? 'No exams scheduled' : `No ${filter} exams`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const config = statusConfig[exam.status]
            const daysUntil = getDaysUntil(exam.date)

            return (
              <button
                key={exam.id}
                onClick={() => setSelectedExam(exam)}
                className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {typeConfig[exam.type].label}
                      </span>
                      {exam.status === 'upcoming' && daysUntil <= 3 && daysUntil > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          {daysUntil} day{daysUntil !== 1 ? 's' : ''} left
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mt-2">{exam.subject}</h3>
                    <p className="text-sm text-gray-600">{exam.paper}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(exam.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(exam.startTime)} - {formatTime(exam.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {exam.venue}
                      </span>
                      <span>{exam.duration}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
