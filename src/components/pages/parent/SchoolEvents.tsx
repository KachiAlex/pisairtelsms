import React, { useState, useEffect } from 'react'
import { Calendar, MapPin, Clock, AlertCircle, Loader2, Filter, CalendarDays, PartyPopper, Trophy, GraduationCap, Palmtree, Users, Sparkles } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

interface SchoolEvent {
  id: string
  title: string
  description: string
  date: string
  startTime?: string
  endTime?: string
  venue: string
  category: 'academic' | 'sports' | 'cultural' | 'pta' | 'holiday' | 'general'
  isMandatory: boolean
}

const categoryConfig: Record<SchoolEvent['category'], { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  academic: { label: 'Academic', icon: <GraduationCap className="w-4 h-4" />, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  sports: { label: 'Sports', icon: <Trophy className="w-4 h-4" />, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  cultural: { label: 'Cultural', icon: <PartyPopper className="w-4 h-4" />, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  pta: { label: 'PTA', icon: <Users className="w-4 h-4" />, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  holiday: { label: 'Holiday', icon: <Palmtree className="w-4 h-4" />, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  general: { label: 'General', icon: <Sparkles className="w-4 h-4" />, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
}

export function SchoolEvents() {
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<SchoolEvent['category'] | 'all'>('all')
  const auth = getAuthFromStorage()

  useEffect(() => { fetchEvents() }, [filter])

  const fetchEvents = async () => {
    try {
      setLoading(true); setError(null)
      const token = auth?.token
      if (!token) { setError('Not authenticated'); return }
      let url = '/api/parent/events'
      if (filter !== 'all') url += `?category=${filter}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Failed to fetch events:', err)
      setError('Failed to load school events')
    } finally { setLoading(false) }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date(); d.setHours(h, m)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const categories: Array<SchoolEvent['category'] | 'all'> = ['all', 'academic', 'sports', 'cultural', 'pta', 'holiday', 'general']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Events</h1>
        <p className="text-gray-600 mt-1">Upcoming events and activities</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" /><span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchEvents}>Retry</Button>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {categories.map(f => {
          const label = f === 'all' ? 'All' : categoryConfig[f].label
          return (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />)}</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => {
            const config = categoryConfig[event.category]
            const daysLeft = getDaysUntil(event.date)
            return (
              <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      {event.isMandatory && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          Mandatory
                        </span>
                      )}
                      {daysLeft <= 7 && daysLeft > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} away
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{event.title}</h3>
                    <p className="text-gray-600 mt-1 text-sm leading-relaxed">{event.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(event.date)}
                      </span>
                      {event.startTime && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatTime(event.startTime)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}
                        </span>
                      )}
                      {event.venue !== 'N/A' && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {event.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
