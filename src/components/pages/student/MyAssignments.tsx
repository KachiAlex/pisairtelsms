import React, { useState, useEffect } from 'react'
import { BookOpen, Clock, CheckCircle, AlertCircle, Upload, FileText, Download, Calendar, Loader2, X, ChevronDown, ChevronUp, Filter, Star } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'late'

interface Attachment {
  id: string
  name: string
  url: string
  type: string
}

interface Assignment {
  id: string
  title: string
  description: string
  subject: string
  teacher: string
  dueDate: string
  status: AssignmentStatus
  submissionType: 'online' | 'offline' | 'both'
  maxScore: number
  score?: number | null
  feedback?: string | null
  attachments: Attachment[]
  submittedAt?: string | null
  submittedFiles?: Attachment[]
  instructions: string
  createdAt: string
}

interface Summary {
  total: number
  pending: number
  submitted: number
  graded: number
  overdue: number
}

const statusConfig: Record<AssignmentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock className="w-4 h-4" /> },
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <Upload className="w-4 h-4" /> },
  graded: { label: 'Graded', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4" /> },
  late: { label: 'Late', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <AlertCircle className="w-4 h-4" /> },
}

export function MyAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AssignmentStatus | 'all' | 'overdue'>('all')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchAssignments()
  }, [filter])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = auth?.token
      if (!token) { setError('Not authenticated'); return }

      let url = '/api/student/assignments'
      if (filter !== 'all' && filter !== 'overdue') {
        url += `?status=${filter}`
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch assignments')

      const data = await res.json()
      let filtered = data.assignments || []
      if (filter === 'overdue') {
        const now = new Date().toISOString().split('T')[0]
        filtered = filtered.filter((a: Assignment) => a.dueDate < now && a.status === 'pending')
      }
      setAssignments(filtered)
      setSummary(data.summary)
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (assignment: Assignment) => {
    try {
      setSubmitting(true)
      const token = auth?.token
      if (!token) return

      const res = await fetch(`/api/student/assignments?id=${assignment.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'submit', files: [] }),
      })

      if (!res.ok) throw new Error('Failed to submit assignment')

      // Update local state
      setAssignments(prev =>
        prev.map(a => a.id === assignment.id ? { ...a, status: 'submitted' as const, submittedAt: new Date().toISOString() } : a)
      )
      setSelectedAssignment(null)
      fetchAssignments()
    } catch (err) {
      console.error('Failed to submit:', err)
      setError('Failed to submit assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const isOverdue = (dueDate: string, status: AssignmentStatus) => {
    if (status !== 'pending') return false
    return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0])
  }

  const getDaysRemaining = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - new Date().getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
    if (type.includes('word') || type.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileText className="w-4 h-4 text-green-500" />
    return <FileText className="w-4 h-4 text-gray-500" />
  }

  // Detail view
  if (selectedAssignment) {
    const config = statusConfig[selectedAssignment.status]
    const overdue = isOverdue(selectedAssignment.dueDate, selectedAssignment.status)
    const daysLeft = getDaysRemaining(selectedAssignment.dueDate)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(null)} className="gap-2">
            <ChevronDown className="h-4 w-4 rotate-90" />
            Back
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>
                  {config.icon}
                  {config.label}
                </span>
                {overdue && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                    Overdue
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{selectedAssignment.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {selectedAssignment.subject} · {selectedAssignment.teacher}
              </p>
            </div>
            {selectedAssignment.score !== undefined && selectedAssignment.score !== null && (
              <div className="text-center bg-green-50 rounded-lg px-4 py-2 border border-green-200">
                <p className="text-2xl font-bold text-green-700">{selectedAssignment.score}</p>
                <p className="text-xs text-green-600">/ {selectedAssignment.maxScore}</p>
              </div>
            )}
          </div>

          {/* Due date */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${overdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <Calendar className={`w-5 h-5 ${overdue ? 'text-red-600' : 'text-blue-600'}`} />
            <div>
              <p className={`text-sm font-medium ${overdue ? 'text-red-800' : 'text-blue-800'}`}>
                {overdue
                  ? `Due ${formatDate(selectedAssignment.dueDate)} · Overdue`
                  : daysLeft > 0
                  ? `Due ${formatDate(selectedAssignment.dueDate)} · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                  : `Due today · ${formatDate(selectedAssignment.dueDate)}`
                }
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{selectedAssignment.description}</p>
          </div>

          {/* Instructions */}
          {selectedAssignment.instructions && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h3>
              <p className="text-gray-700 leading-relaxed">{selectedAssignment.instructions}</p>
            </div>
          )}

          {/* Attachments */}
          {selectedAssignment.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Attachments ({selectedAssignment.attachments.length})</h3>
              <div className="space-y-2">
                {selectedAssignment.attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {getFileIcon(att.type)}
                    <span className="text-sm text-gray-700 flex-1">{att.name}</span>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submitted files */}
          {selectedAssignment.submittedFiles && selectedAssignment.submittedFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Submissions</h3>
              <div className="space-y-2">
                {selectedAssignment.submittedFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700 flex-1">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {selectedAssignment.feedback && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Feedback</h3>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-gray-700">{selectedAssignment.feedback}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {selectedAssignment.status === 'pending' && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setSelectedAssignment(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(selectedAssignment)}
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {submitting ? 'Submitting...' : 'Mark as Submitted'}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600 mt-1">
            {summary ? `${summary.pending} pending, ${summary.submitted} submitted, ${summary.graded} graded` : ''}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-100">
            <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-700">{summary.pending}</p>
            <p className="text-sm text-amber-600">Pending</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
            <Upload className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{summary.submitted}</p>
            <p className="text-sm text-blue-600">Submitted</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{summary.graded}</p>
            <p className="text-sm text-green-600">Graded</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{summary.overdue}</p>
            <p className="text-sm text-red-600">Overdue</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchAssignments}>Retry</Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {(['all', 'pending', 'submitted', 'graded', 'overdue'] as const).map(f => (
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

      {/* Assignments List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {filter === 'all' ? 'No assignments found' : `No ${filter} assignments`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(assignment => {
            const config = statusConfig[assignment.status]
            const overdue = isOverdue(assignment.dueDate, assignment.status)
            const daysLeft = getDaysRemaining(assignment.dueDate)

            return (
              <button
                key={assignment.id}
                onClick={() => setSelectedAssignment(assignment)}
                className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      {overdue && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          Overdue
                        </span>
                      )}
                      {daysLeft <= 2 && assignment.status === 'pending' && !overdue && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          {daysLeft === 0 ? 'Due today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mt-2">{assignment.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{assignment.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{assignment.subject}</span>
                      <span>·</span>
                      <span>{assignment.teacher}</span>
                      <span>·</span>
                      <span className={overdue ? 'text-red-600 font-medium' : ''}>
                        Due {formatDate(assignment.dueDate)}
                      </span>
                    </div>
                  </div>

                  {assignment.score !== undefined && assignment.score !== null && (
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-green-700">{assignment.score}</p>
                      <p className="text-xs text-gray-500">/ {assignment.maxScore}</p>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
