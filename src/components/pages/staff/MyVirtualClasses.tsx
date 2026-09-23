import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import {
  Video, RefreshCw, PlayCircle, Square, Clock, BookOpen, Users, GraduationCap,
} from 'lucide-react'
// Lazy-loaded: the RealtimeKit SDK is ~2.4 MB — only fetch when a class is joined
const CloudflareLiveClassRoom = lazy(() =>
  import('../CloudflareLiveClassRoom').then(m => ({ default: m.CloudflareLiveClassRoom }))
)
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { getAuthFromStorage } from '../../../lib/auth'

interface Lesson {
  id: string
  title: string
  description: string | null
  type: string
  scheduled_at: string | null
  duration_minutes: number
  status: string
  recording_url: string | null
}

interface VirtualClass {
  id: string
  name: string
  description: string | null
  status: string
  subject_name: string | null
  class_name: string | null
  class_arm: string | null
  is_lead: boolean
  lead_teacher_name: string | null
  lessons: Lesson[]
}

function authHeaders() {
  const auth = getAuthFromStorage()
  return {
    'Content-Type': 'application/json',
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  }
}

/**
 * Staff "Virtual Classes" — the teacher's view of the assignment loop.
 * Admin assigns a classroom to a teacher; it appears here. Starting a
 * scheduled lesson flips it live so enrolled students can join.
 */
export function MyVirtualClasses() {
  const [classes, setClasses] = useState<VirtualClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeLesson, setActiveLesson] = useState<{ lesson: Lesson; classroomName: string } | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/staff/virtual-classes', { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to load (${res.status})`)
      setClasses(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const cancelLesson = async (lessonId: string) => {
    if (!confirm('Cancel this lesson? Students will no longer see it.')) return
    setEndingId(lessonId)
    try {
      const res = await fetch('/api/tenant/lessons', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: lessonId, status: 'cancelled' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to cancel (${res.status})`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel lesson')
    } finally {
      setEndingId(null)
    }
  }

  const endClass = async (lessonId: string) => {
    if (!confirm('End this live class? Students will no longer be able to join.')) return
    setEndingId(lessonId)
    try {
      const res = await fetch('/api/tenant/live-meetings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'end-class', lessonId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to end class (${res.status})`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end class')
    } finally {
      setEndingId(null)
    }
  }

  if (activeLesson) {
    return (
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading live class…</div>}>
        <CloudflareLiveClassRoom
          lesson={activeLesson.lesson as any}
          classroomName={activeLesson.classroomName}
          onBack={() => { setActiveLesson(null); load() }}
          onRecordingSaved={() => load()}
        />
      </Suspense>
    )
  }

  const lessonBadge = (status: string) => {
    if (status === 'live') return <Badge variant="destructive">Live now</Badge>
    if (status === 'scheduled') return <Badge variant="secondary">Scheduled</Badge>
    if (status === 'completed') return <Badge variant="outline">Completed</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Digital Learning</p>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Classes</h1>
          <p className="text-sm text-gray-600">
            Classrooms assigned to you. Start a scheduled lesson to open it for your students.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading your virtual classes…</div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-14 w-14 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No virtual classes assigned</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              When an administrator assigns you a virtual classroom, it will appear here with its
              scheduled live sessions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {classes.map(vc => (
            <Card key={vc.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{vc.name}</h3>
                      <p className="text-sm text-gray-500 truncate">
                        {[vc.subject_name, vc.class_name && `${vc.class_name}${vc.class_arm ? ` ${vc.class_arm}` : ''}`]
                          .filter(Boolean).join(' · ') || 'No subject or class linked'}
                        {!vc.is_lead && vc.lead_teacher_name && (
                          <span className="text-blue-600"> · co-teacher (lead: {vc.lead_teacher_name})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={vc.status === 'active' ? 'default' : 'secondary'}>{vc.status}</Badge>
                </div>

                {vc.lessons.length === 0 ? (
                  <p className="text-sm text-gray-400 pl-1">No lessons scheduled yet — ask your administrator to schedule one.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {vc.lessons.map(lesson => (
                      <div key={lesson.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {lesson.type === 'live' ? (
                            <Video className={`h-5 w-5 shrink-0 ${lesson.status === 'live' ? 'text-red-500' : 'text-blue-500'}`} />
                          ) : (
                            <PlayCircle className="h-5 w-5 shrink-0 text-gray-400" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                            {lesson.scheduled_at && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(lesson.scheduled_at).toLocaleString()}
                                {lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {lessonBadge(lesson.status)}
                          {lesson.type === 'live' && (lesson.status === 'scheduled' || lesson.status === 'draft') && (
                            <>
                              <Button size="sm" onClick={() => setActiveLesson({ lesson, classroomName: vc.name })}>
                                <Video className="h-4 w-4 mr-1" /> Start Class
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => cancelLesson(lesson.id)} disabled={endingId === lesson.id}>
                                <Square className="h-4 w-4 mr-1 text-red-500" /> Cancel
                              </Button>
                            </>
                          )}
                          {lesson.type === 'live' && lesson.status === 'live' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setActiveLesson({ lesson, classroomName: vc.name })}>
                                <Video className="h-4 w-4 mr-1" /> Rejoin
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => endClass(lesson.id)} disabled={endingId === lesson.id}>
                                <Square className="h-4 w-4 mr-1" />
                                {endingId === lesson.id ? 'Ending…' : 'End'}
                              </Button>
                            </>
                          )}
                          {lesson.recording_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={lesson.recording_url} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="h-4 w-4 mr-1" /> Recording
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-500 max-w-xl">
        <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Students see a lesson the moment you start it — they join from <strong>Live Classes</strong> in
          their portal. Ending the class stops new joins and saves the recording if one was started.
        </span>
      </div>
    </div>
  )
}

export default MyVirtualClasses
