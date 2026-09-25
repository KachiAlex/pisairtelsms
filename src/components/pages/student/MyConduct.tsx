import React, { useEffect, useState } from 'react'
import { ShieldAlert, Award, MessageSquare, AlertCircle } from 'lucide-react'
import { getAuthFromStorage } from '../../../lib/auth'

interface Incident { id: string; date: string; type: string; description: string; severity: string; actionTaken: string; reportedBy: string }
interface Recognition { id: string; date: string; type: string; description: string; awardedBy: string }
interface TeacherComment { id: string; date: string; comment: string; subject: string; teacher: string }

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  minor: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  moderate: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
  severe: 'bg-red-100 text-red-800',
}

export function MyConduct() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [recognitions, setRecognitions] = useState<Recognition[]>([])
  const [comments, setComments] = useState<TeacherComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const token = getAuthFromStorage()?.token
        if (!token) { setError('Not authenticated'); return }
        const res = await fetch('/api/student/behavioral', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Failed to load conduct record')
        const data = await res.json()
        setIncidents(data.incidents || [])
        setRecognitions(data.recognitions || [])
        setComments(data.teacherComments || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load conduct record')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return <div className="space-y-4"><h1 className="text-2xl font-bold text-gray-900">My Conduct</h1>{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />)}</div>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Conduct</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Award className="h-5 w-5 text-green-500" /> Recognitions
        </h2>
        {recognitions.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">No recognitions yet.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {recognitions.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{r.type}</p>
                  <span className="text-xs text-gray-400">{r.date}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                {r.awardedBy && <p className="text-xs text-gray-400 mt-1">Awarded by {r.awardedBy}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" /> Incidents
        </h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">No incidents on record.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {incidents.map(i => (
              <div key={i.id} className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{i.type}</p>
                  {i.severity && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[i.severity.toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
                      {i.severity}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">{i.date}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{i.description}</p>
                {i.actionTaken && <p className="text-xs text-gray-500 mt-1">Action: {i.actionTaken}</p>}
                {i.reportedBy && <p className="text-xs text-gray-400 mt-1">Reported by {i.reportedBy}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" /> Teacher Comments
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">No teacher comments yet.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {comments.map(c => (
              <div key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">{c.subject || 'General'}{c.teacher ? ` · ${c.teacher}` : ''}</p>
                  <span className="text-xs text-gray-400">{c.date}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{c.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default MyConduct
