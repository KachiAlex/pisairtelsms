import React, { useEffect, useState } from 'react'
import { GraduationCap, AlertCircle } from 'lucide-react'
import { getAuthFromStorage } from '../../../lib/auth'

interface LessonRequest {
  id: string
  teacher_name: string | null
  subject_name: string | null
  purpose: string
  proposed_schedule: string
  duration_minutes: number
  num_sessions: number
  fee_amount: number | null
  fee_currency: string
  status: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_admin: { label: 'Awaiting school approval', color: 'bg-amber-100 text-amber-800' },
  pending_parent: { label: 'Awaiting parent approval', color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  scheduled: { label: 'Scheduled', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800' },
}

export function MyPrivateLessons() {
  const [requests, setRequests] = useState<LessonRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const token = getAuthFromStorage()?.token
        if (!token) { setError('Not authenticated'); return }
        const res = await fetch('/api/tenant/private-lesson-requests', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load private lessons')
        const data = await res.json()
        setRequests(data.data || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Private Lessons</h1>
        <p className="text-sm text-gray-500 mt-1">
          One-on-one lessons arranged for you by teachers or your parent.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-600 font-medium">No private lessons</p>
          <p className="text-sm text-gray-400">When a teacher or your parent arranges extra lessons, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const st = STATUS_LABELS[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-600' }
            return (
              <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{r.subject_name || 'Private Lesson'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{r.purpose}</p>
                <div className="text-xs text-gray-500 mt-2 flex gap-4 flex-wrap">
                  {r.teacher_name && <span>Teacher: {r.teacher_name}</span>}
                  <span>Scheduled: {new Date(r.proposed_schedule).toLocaleString()}</span>
                  <span>{r.duration_minutes}min × {r.num_sessions} session{r.num_sessions > 1 ? 's' : ''}</span>
                  {r.fee_amount != null && <span>Fee: {r.fee_currency} {r.fee_amount}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyPrivateLessons
