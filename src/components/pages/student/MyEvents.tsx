import React, { useEffect, useState } from 'react'
import { Calendar, MapPin, AlertCircle } from 'lucide-react'
import { getAuthFromStorage } from '../../../lib/auth'

interface SchoolEvent {
  id: string
  title: string
  description: string
  date: string
  venue: string
  category: 'academic' | 'sports' | 'cultural' | 'pta' | 'holiday' | 'general'
  isMandatory: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-800',
  sports: 'bg-green-100 text-green-800',
  cultural: 'bg-purple-100 text-purple-800',
  pta: 'bg-amber-100 text-amber-800',
  holiday: 'bg-rose-100 text-rose-800',
  general: 'bg-gray-100 text-gray-800',
}

export function MyEvents() {
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [session, setSession] = useState('')
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [includePast, setIncludePast] = useState(false)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = getAuthFromStorage()?.token
      if (!token) { setError('Not authenticated'); return }
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (includePast) params.set('includePast', '1')
      const res = await fetch(`/api/student/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load events')
      const data = await res.json()
      setEvents(data.events || [])
      setSession(data.academicSession || '')
      setTerm(data.term || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [category, includePast])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Calendar</h1>
          {term && <p className="text-sm text-gray-500 mt-1">{term} · {session}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            <option value="academic">Academic</option>
            <option value="holiday">Holidays</option>
            <option value="sports">Sports</option>
            <option value="cultural">Cultural</option>
            <option value="pta">PTA</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={includePast} onChange={e => setIncludePast(e.target.checked)} />
            Show past
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={fetchEvents} className="ml-auto text-sm font-medium text-red-700 underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />)}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-600 font-medium">No upcoming events</p>
          <p className="text-sm text-gray-400">School events and holidays will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {events.map(ev => (
            <div key={ev.id} className="flex items-start gap-4 p-4">
              <div className="flex-shrink-0 w-14 text-center">
                <div className="text-2xl font-bold text-gray-900">{new Date(ev.date).getDate()}</div>
                <div className="text-xs uppercase text-gray-500">{new Date(ev.date).toLocaleString('en', { month: 'short' })}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{ev.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.general}`}>
                    {ev.category}
                  </span>
                  {ev.isMandatory && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Required</span>}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{ev.description}</p>
                {ev.venue && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyEvents
