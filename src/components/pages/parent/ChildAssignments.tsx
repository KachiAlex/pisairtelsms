import React, { useState, useEffect } from 'react'
import { ClipboardList, Calendar, Clock, AlertCircle, Loader2, Filter, ChevronRight, User, BookOpen, Star } from 'lucide-react'
import { Button } from '../../ui/button'
import { useParentContext } from '../../../contexts/ParentContext'
import { getAuthFromStorage } from '../../../lib/auth'

type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue'
type AssignmentType = 'homework' | 'project' | 'essay' | 'quiz' | 'reading'

interface Assignment {
  id: string
  subject: string
  title: string
  description: string
  dueDate: string
  status: AssignmentStatus
  type: AssignmentType
  teacherName: string
  submittedAt?: string
  score?: number
  maxScore: number
  feedback?: string
}

interface AssignmentSummary {
  total: number
  pending: number
  submitted: number
  graded: number
  overdue: number
}

const statusConfig: Record<AssignmentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  graded: { label: 'Graded', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  overdue: { label: 'Overdue', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

const typeConfig: Record<AssignmentType, { label: string }> = {
  homework: { label: 'Homework' },
  project: { label: 'Project' },
  essay: { label: 'Essay' },
  quiz: { label: 'Quiz' },
  reading: { label: 'Reading' },
}

export function ChildAssignments() {
  const { selectedChild } = useParentContext()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [summary, setSummary] = useState<AssignmentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const auth = getAuthFromStorage()

  useEffect(() => { fetchAssignments() }, [selectedChild?.id, filter])

  const fetchAssignments = async () => {
    if (!selectedChild) { setLoading(false); return }
    try {
      setLoading(true); setError(null)
      const token = auth?.token
      if (!token) { setError('Not authenticated'); return }
      let url = `/api/parent/assignments?childId=${selectedChild.id}`
      if (filter !== 'all') url += `&status=${filter}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch assignments')
      const data = await res.json()
      setAssignments(data.assignments || [])
      setSummary(data.summary)
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
      setError('Failed to load assignments')
    } finally { setLoading(false) }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString()
  const daysRemaining = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (!selectedChild) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Please select a child to view their assignments.</p>
      </div>
    )
  }

  if (selectedAssignment) {
    const config = statusConfig[selectedAssignment.status]
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(null)} className="gap-2">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>{config.label}</span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">{typeConfig[selectedAssignment.type].label}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{selectedAssignment.title}</h1>
            <p className="text-gray-600 mt-1">{selectedAssignment.subject} · {selectedAssignment.teacherName}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Calendar className="w-5 h-5 text-amber-600" />
              <div><p className="text-sm font-medium text-amber-900">{formatDate(selectedAssignment.dueDate)}</p><p className="text-xs text-amber-600">Due date</p></div>
            </div>
            {selectedAssignment.score !== undefined && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Star className="w-5 h-5 text-green-600" />
                <div><p className="text-sm font-medium text-green-900">{selectedAssignment.score} / {selectedAssignment.maxScore}</p><p className="text-xs text-green-600">Score</p></div>
              </div>
            )}
            {selectedAssignment.submittedAt && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="w-5 h-5 text-blue-600" />
                <div><p className="text-sm font-medium text-blue-900">{formatDate(selectedAssignment.submittedAt)}</p><p className="text-xs text-blue-600">Submitted</p></div>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-200">{selectedAssignment.description}</p>
          </div>
          {selectedAssignment.feedback && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Teacher Feedback</h3>
              <p className="text-gray-700 leading-relaxed p-4 bg-blue-50 rounded-lg border border-blue-200">{selectedAssignment.feedback}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-600 mt-1">{selectedChild.name} — {summary ? `${summary.total} assignment${summary.total !== 1 ? 's' : ''}` : ''}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" /><span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchAssignments}>Retry</Button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-100">
            <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-700">{summary.pending}</p><p className="text-sm text-amber-600">Pending</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
            <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{summary.submitted}</p><p className="text-sm text-blue-600">Submitted</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
            <Star className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{summary.graded}</p><p className="text-sm text-green-600">Graded</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{summary.overdue}</p><p className="text-sm text-red-600">Overdue</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {(['all', 'pending', 'submitted', 'graded', 'overdue'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{filter === 'all' ? 'No assignments found' : `No ${filter} assignments`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const config = statusConfig[a.status]
            const daysLeft = daysRemaining(a.dueDate)
            return (
              <button key={a.id} onClick={() => setSelectedAssignment(a)} className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>{config.label}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">{typeConfig[a.type].label}</span>
                      {a.status === 'pending' && daysLeft <= 3 && daysLeft > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mt-2">{a.title}</h3>
                    <p className="text-sm text-gray-600">{a.subject} · {a.teacherName}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(a.dueDate)}</span>
                      {a.score !== undefined && <span className="flex items-center gap-1 text-green-600 font-medium"><Star className="w-3 h-3" />{a.score}/{a.maxScore}</span>}
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
