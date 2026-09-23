import React, { useState, useEffect, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Video, PlayCircle, Clock, RefreshCw, BookOpen } from 'lucide-react'
// Lazy-loaded: the RealtimeKit SDK is ~2.4 MB — only fetch when a lesson is joined
const CloudflareLiveClassRoom = lazy(() =>
  import('../CloudflareLiveClassRoom').then(m => ({ default: m.CloudflareLiveClassRoom }))
)
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Card, CardContent } from '../../ui/card'
import { getAuthFromStorage } from '../../../lib/auth'

interface Lesson {
  id: string
  title: string
  description: string | null
  type: string
  scheduled_at: string | null
  duration_minutes: number
  meeting_url: string | null
  recording_url: string | null
  status: string
  classroom_name?: string
  subject_name?: string | null
}

export function StudentLiveClass() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [classroomName, setClassroomName] = useState('Live Class')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const auth = getAuthFromStorage()

  const loadLessons = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/student/live-meetings', {
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to load live classes (${res.status})`)
      setLessons(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const loadLesson = async (id: string) => {
    setJoining(true)
    setError(null)
    try {
      const res = await fetch(`/api/student/live-meetings?lessonId=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to load live class (${res.status})`)
      setLesson(data.data)
      setClassroomName(data.data.classroom_name || 'Live Class')
      setSearchParams({ lessonId: id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    if (lesson) return // inside a room — don't poll the list
    const id = searchParams.get('lessonId')
    if (id) loadLesson(id)
    else loadLessons()
    // Poll so a class the teacher just started shows "Live now" without a
    // manual refresh.
    const timer = setInterval(loadLessons, 30_000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson === null])

  if (lesson) {
    return (
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading live class…</div>}>
        <CloudflareLiveClassRoom
          lesson={lesson}
          classroomName={classroomName}
          onBack={() => {
            setLesson(null)
            setSearchParams({})
            loadLessons()
          }}
        />
      </Suspense>
    )
  }

  const joinable = lessons.filter(l => l.type === 'live' && (l.status === 'live' || l.status === 'scheduled'))
  const recordings = lessons.filter(l => l.type === 'live' && l.status === 'completed' && l.recording_url)
  const selfPaced = lessons.filter(l => l.type === 'async' && l.status === 'published')

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-6 w-6 text-blue-600" /> Live Classes
          </h1>
          <p className="text-sm text-gray-500">Join a live class or watch a recording.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLessons} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading your classes…</div>
      ) : joinable.length === 0 && recordings.length === 0 && selfPaced.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Video className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No live classes scheduled right now.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {joinable.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Upcoming &amp; Live
              </h2>
              {joinable.map(l => (
                <Card key={l.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Video className={`h-6 w-6 shrink-0 ${l.status === 'live' ? 'text-red-500' : 'text-blue-500'}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{l.title}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {[l.classroom_name, l.subject_name].filter(Boolean).join(' · ')}
                        </p>
                        {l.scheduled_at && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(l.scheduled_at).toLocaleString()}
                            {l.duration_minutes ? ` · ${l.duration_minutes} min` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={l.status === 'live' ? 'destructive' : 'secondary'}>
                        {l.status === 'live' ? 'Live now' : 'Scheduled'}
                      </Badge>
                      {l.status === 'live' ? (
                        <Button size="sm" onClick={() => loadLesson(l.id)} disabled={joining}>
                          {joining ? 'Joining…' : 'Join'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          Not started
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selfPaced.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Self-Paced Lessons
              </h2>
              {selfPaced.map(l => (
                <Card key={l.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="h-6 w-6 shrink-0 text-emerald-500" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{l.title}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {[l.classroom_name, l.subject_name].filter(Boolean).join(' · ')}
                          {l.description ? ` — ${l.description}` : ''}
                        </p>
                      </div>
                    </div>
                    {l.meeting_url && /^https?:\/\//i.test(l.meeting_url) && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={l.meeting_url} target="_blank" rel="noopener noreferrer">
                          <PlayCircle className="h-4 w-4 mr-1" /> Open
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {recordings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Recordings
              </h2>
              {recordings.map(l => (
                <Card key={l.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayCircle className="h-6 w-6 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{l.title}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {[l.classroom_name, l.subject_name].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={l.recording_url!} target="_blank" rel="noopener noreferrer">
                        <PlayCircle className="h-4 w-4 mr-1" /> Watch
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default StudentLiveClass
