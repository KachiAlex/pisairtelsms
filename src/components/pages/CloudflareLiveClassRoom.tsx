import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Video, Circle, Square,
  Clock, ArrowLeft, AlertCircle, CheckCircle, Loader2,
  PlayCircle, Hand, LogIn, DoorOpen
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { getAuthFromStorage } from '../../lib/auth'
import { useRealtimeKitClient, RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import { RtkMeeting, createDefaultConfig } from '@cloudflare/realtimekit-react-ui'

interface CloudflareLiveClassRoomProps {
  lesson: Lesson
  classroomName: string
  onBack: () => void
  onRecordingSaved?: (url: string) => void
}

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
}

type MeetingPhase = 'initializing' | 'ready' | 'joining' | 'waiting' | 'joined' | 'rejected' | 'left'

export function CloudflareLiveClassRoom({ lesson, classroomName, onBack, onRecordingSaved }: CloudflareLiveClassRoomProps) {
  const [meeting, initMeeting] = useRealtimeKitClient()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<MeetingPhase>('initializing')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(lesson.recording_url || null)

  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const auth = getAuthFromStorage()
  const displayName = auth?.name || auth?.email || 'Participant'
  const isTeacher = auth?.role === 'staff' || auth?.role === 'tenant_admin'

  // Classroom-tuned control bar: screenshare promoted to the bar, chat /
  // participants / polls on the right, and a trimmed More menu (drops
  // plugins, AI, debugger, captions, breakout rooms, and the duplicate
  // in-meeting recording toggle — we record server-side via our own button).
  const meetingUiConfig = useMemo(() => {
    const menuItem = (tag: string): [string, Record<string, string>] =>
      [tag, { variant: 'horizontal', slot: 'more-elements' }]
    const cfg = createDefaultConfig()
    cfg.root = {
      ...cfg.root,
      'div#controlbar-left': ['rtk-screen-share-toggle', 'rtk-settings-toggle'],
      'div#controlbar-center': [
        'rtk-mic-toggle',
        'rtk-camera-toggle',
        'rtk-more-toggle',
        'rtk-leave-button',
      ],
      'div#controlbar-right': [
        'rtk-chat-toggle',
        'rtk-participants-toggle',
        'rtk-polls-toggle',
      ],
      'div#controlbar-mobile': [
        'rtk-mic-toggle',
        'rtk-camera-toggle',
        'rtk-more-toggle',
        'rtk-leave-button',
      ],
      'rtk-more-toggle.activeMoreMenu': [
        menuItem('rtk-fullscreen-toggle'),
        menuItem('rtk-pip-toggle'),
        menuItem('rtk-mute-all-button'),
      ],
      'rtk-more-toggle.activeMoreMenu.sm': [
        menuItem('rtk-chat-toggle'),
        menuItem('rtk-participants-toggle'),
        menuItem('rtk-screen-share-toggle'),
        menuItem('rtk-polls-toggle'),
        menuItem('rtk-fullscreen-toggle'),
        menuItem('rtk-pip-toggle'),
        menuItem('rtk-mute-all-button'),
        menuItem('rtk-settings-toggle'),
      ],
      'rtk-more-toggle.activeMoreMenu.md': [
        menuItem('rtk-chat-toggle'),
        menuItem('rtk-participants-toggle'),
        menuItem('rtk-screen-share-toggle'),
        menuItem('rtk-polls-toggle'),
        menuItem('rtk-fullscreen-toggle'),
        menuItem('rtk-pip-toggle'),
        menuItem('rtk-mute-all-button'),
        menuItem('rtk-settings-toggle'),
      ],
    }
    return cfg
  }, [])

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'done' | 'error'>('idle')
  const [recordingError, setRecordingError] = useState<string | null>(null)

  const callRecordingApi = useCallback(async (action: string) => {
    const res = await fetch('/api/tenant/live-meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth?.token}`,
      },
      body: JSON.stringify({ lessonId: lesson.id, action }),
    })
    const data = await res.json().catch(() => ({} as any))
    if (!res.ok) throw new Error(data.error || `Recording request failed (${res.status})`)
    return data
  }, [auth?.token, lesson.id])

  const handleStartRecording = async () => {
    try {
      setRecordingError(null)
      await callRecordingApi('start-recording')
      setRecordingState('recording')
    } catch (err) {
      setRecordingError(err instanceof Error ? err.message : 'Failed to start recording')
      setRecordingState('error')
    }
  }

  const handleStopRecording = async () => {
    try {
      setRecordingError(null)
      await callRecordingApi('stop-recording')
      setRecordingState('processing')
    } catch (err) {
      setRecordingError(err instanceof Error ? err.message : 'Failed to stop recording')
      setRecordingState('error')
    }
  }

  // Restore recording state on mount (e.g. after a page refresh mid-recording)
  useEffect(() => {
    if (!isTeacher) return
    callRecordingApi('recording-status')
      .then((data) => {
        if (data.downloadUrl) {
          setRecordingUrl(data.downloadUrl)
          setRecordingState('done')
        } else if (data.status === 'INVOKED' || data.status === 'RECORDING' || data.status === 'PAUSED') {
          setRecordingState('recording')
        } else if (data.status === 'UPLOADING' || data.status === 'UPLOADED') {
          setRecordingState(data.downloadUrl ? 'done' : 'processing')
        }
      })
      .catch(() => {})
  }, [isTeacher, callRecordingApi])

  // Poll recording status until the file is ready
  useEffect(() => {
    if (recordingState !== 'processing') return
    let cancelled = false
    const poll = async () => {
      try {
        const data = await callRecordingApi('recording-status')
        if (cancelled) return
        if (data.downloadUrl) {
          setRecordingUrl(data.downloadUrl)
          setRecordingState('done')
          onRecordingSaved?.(data.downloadUrl)
        } else {
          setTimeout(poll, 8000)
        }
      } catch {
        if (!cancelled) setTimeout(poll, 8000)
      }
    }
    poll()
    return () => { cancelled = true }
  }, [recordingState, callRecordingApi, onRecordingSaved])

  // Track session duration
  useEffect(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Record virtual attendance join/leave — tied to actually entering the room
  useEffect(() => {
    if (!participantId || !lesson.id || phase !== 'joined') return

    const recordAttendance = async (action: 'joined' | 'left') => {
      try {
        await fetch('/api/tenant/virtual-attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth?.token}`,
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            participantId,
            participantName: displayName,
            action,
          }),
        })
      } catch (err) {
        console.error('Failed to record attendance:', err)
      }
    }

    recordAttendance('joined')
    return () => {
      recordAttendance('left')
    }
  }, [participantId, lesson.id, displayName, auth?.token, phase])

  // Fetch Cloudflare Realtime auth token on mount
  useEffect(() => {
    let cancelled = false
    async function joinMeeting() {
      try {
        setIsLoading(true)
        setError(null)

        const auth = getAuthFromStorage()
        if (!auth?.token) {
          throw new Error('Not authenticated')
        }

                const res = await fetch('/api/tenant/live-meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            displayName,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({} as any))
          throw new Error(data.error || `Failed to join live class (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setAuthToken(data.authToken)
          setParticipantId(data.participantId || null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to join live class')
          console.error('Cloudflare LiveClassRoom join error:', err)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    joinMeeting()
    return () => { cancelled = true }
  }, [lesson.id, displayName])

  // Initialize the RealtimeKit client once we have a token
  useEffect(() => {
    if (!authToken) return
    let cancelled = false
    initMeeting({ authToken, defaults: { audio: true, video: true } })
      .then((m) => { if (!cancelled && !m) setError('Failed to initialize meeting') })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize meeting')
          console.error('RealtimeKit init error:', err)
        }
      })
    return () => { cancelled = true }
  }, [authToken, initMeeting])

  // Track join/waiting state from the SDK — drives the join gate UI
  useEffect(() => {
    if (!meeting) return
    const self = meeting.self
    const sync = () => {
      if (self.roomJoined) return setPhase('joined')
      if (self.waitlistStatus === 'rejected' || self.roomState === 'rejected') return setPhase('rejected')
      if (self.roomState === 'waitlisted' || self.waitlistStatus === 'waiting') return setPhase('waiting')
      if (self.roomState !== 'init') return setPhase('left') // left/kicked/ended/disconnected
      setPhase((prev) => (prev === 'joining' ? prev : 'ready'))
    }
    sync()
    self.on('*', sync)
    return () => {
      self.removeListener('*', sync)
      meeting.leave().catch(() => {})
    }
  }, [meeting])

  const handleJoin = async () => {
    if (!meeting) return
    setPhase('joining')
    try {
      await meeting.join()
      // roomJoined/waitlisted events update phase via the sync listener;
      // read state directly too in case events fired before listeners attached
      if (meeting.self.roomJoined) setPhase('joined')
      else if (meeting.self.waitlistStatus === 'waiting' || meeting.self.roomState === 'waitlisted') setPhase('waiting')
    } catch (err) {
      // Some SDK paths reject join() when the participant is waitlisted
      if (meeting.self.roomJoined) setPhase('joined')
      else if (meeting.self.waitlistStatus === 'waiting' || meeting.self.roomState === 'waitlisted') setPhase('waiting')
      else {
        setError(err instanceof Error ? err.message : 'Failed to join the class')
        setPhase('ready')
      }
    }
  }

  const handleLeaveWaiting = async () => {
    try { await meeting?.leave() } catch { /* best effort */ }
    onBack()
  }

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`
  }

  const connectionStatus = error ? 'disconnected'
    : phase === 'joined' ? 'connected'
    : phase === 'waiting' ? 'waiting'
    : phase === 'left' ? 'left'
    : 'connecting'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus === 'connected' ? 'Live'
                : connectionStatus === 'waiting' ? 'Waiting room'
                : connectionStatus === 'left' ? 'Left'
                : connectionStatus === 'disconnected' ? 'Error'
                : 'Connecting'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{classroomName}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {formatTime(elapsedSec)}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Unable to join meeting</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Video Area */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="overflow-hidden">
            <div className="w-full bg-black" style={{ height: '500px' }}>
              {phase === 'joined' && meeting ? (
                <RealtimeKitProvider value={meeting}>
                  <RtkMeeting
                    mode="fill"
                    meeting={meeting}
                    showSetupScreen={false}
                    config={meetingUiConfig}
                    loadConfigFromPreset={false}
                  />
                </RealtimeKitProvider>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  {error && !meeting && (
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                      <div className="rounded-full bg-red-500/20 p-4">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Couldn't set up the meeting</h2>
                        <p className="text-sm text-gray-400 mt-1">{error}</p>
                      </div>
                      <div className="flex gap-3">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.location.reload()}>Retry</Button>
                        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400">Back</Button>
                      </div>
                    </div>
                  )}

                  {!error && phase === 'initializing' && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{isLoading ? 'Preparing live class…' : 'Connecting…'}</span>
                    </div>
                  )}

                  {(phase === 'ready' || phase === 'joining') && (
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                      <div className="rounded-full bg-blue-600/20 p-4">
                        <Video className="h-8 w-8 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Ready to join {lesson.title}?</h2>
                        <p className="text-sm text-gray-400 mt-1">
                          Your camera and microphone will turn on when you join.
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 px-8"
                        onClick={handleJoin}
                        disabled={!meeting || phase === 'joining'}
                      >
                        {phase === 'joining' ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining…</>
                        ) : (
                          <><LogIn className="h-4 w-4 mr-2" /> Join Class</>
                        )}
                      </Button>
                    </div>
                  )}

                  {phase === 'waiting' && (
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                      <div className="rounded-full bg-amber-500/20 p-4">
                        <Hand className="h-8 w-8 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">You're in the waiting room</h2>
                        <p className="text-sm text-gray-400 mt-1">
                          The teacher will let you in when class starts. Stay on this page.
                        </p>
                      </div>
                      <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                      <Button variant="outline" size="sm" onClick={handleLeaveWaiting}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800">
                        <DoorOpen className="h-4 w-4 mr-2" /> Leave waiting room
                      </Button>
                    </div>
                  )}

                  {phase === 'rejected' && (
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                      <div className="rounded-full bg-red-500/20 p-4">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Not admitted</h2>
                        <p className="text-sm text-gray-400 mt-1">The teacher didn't let you into this class.</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" size="sm" onClick={handleJoin}
                          className="border-gray-600 text-gray-300 hover:bg-gray-800">Try again</Button>
                        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400">Back</Button>
                      </div>
                    </div>
                  )}

                  {phase === 'left' && (
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                      <div className="rounded-full bg-gray-600/30 p-4">
                        <DoorOpen className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">You left the class</h2>
                      </div>
                      <div className="flex gap-3">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleJoin}>
                          <LogIn className="h-4 w-4 mr-2" /> Rejoin
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400">Back</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Recording Controls (Teacher only, once inside the room) */}
          {isTeacher && phase === 'joined' && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    {recordingState === 'idle' && (
                      <Button variant="default" className="bg-red-600 hover:bg-red-700" onClick={handleStartRecording}>
                        <Circle className="h-4 w-4 mr-2 fill-current" /> Start Recording
                      </Button>
                    )}
                    {recordingState === 'recording' && (
                      <Button variant="default" className="bg-red-600 hover:bg-red-700" onClick={handleStopRecording}>
                        <Square className="h-4 w-4 mr-2 fill-current" /> Stop Recording
                      </Button>
                    )}
                    {recordingState === 'processing' && (
                      <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing recording...</Badge>
                    )}
                    {recordingState === 'done' && (
                      <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" /> Recording saved</Badge>
                    )}
                    {recordingState === 'error' && (
                      <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Upload failed</Badge>
                    )}
                  </div>

                  {recordingError && (
                    <p className="text-xs text-red-500">{recordingError}</p>
                  )}

                  {recordingUrl && recordingState !== 'recording' && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                        <PlayCircle className="h-4 w-4 mr-2" /> View Recording
                      </a>
                    </Button>
                  )}
                </div>

                {recordingState === 'idle' && (
                  <p className="text-xs text-gray-500 mt-2">
                    Recording is captured server-side by Cloudflare — it keeps running even if you leave or close the browser.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lesson.description && (
                <p className="text-gray-600">{lesson.description}</p>
              )}
              {lesson.scheduled_at && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="h-3 w-3" />
                  {new Date(lesson.scheduled_at).toLocaleString()}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500">
                <Video className="h-3 w-3" />
                {lesson.duration_minutes} min duration
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How this works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>Your audio and video are powered by Cloudflare Realtime. Use the controls inside the meeting window to mute, turn off video, or share your screen.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CloudflareLiveClassRoom
