import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Video, Mic, MicOff, VideoOff, PhoneOff, Circle, Square,
  Users, Clock, ArrowLeft, AlertCircle, CheckCircle, Loader2,
  PlayCircle, Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { getAuthFromStorage } from '../../lib/auth'
import { tenantApiPost } from '../../lib/tenantApi'
import { useLessonRecording } from '../../hooks/useLessonRecording'
import { useRealtimeKitClient, RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui'

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

export function CloudflareLiveClassRoom({ lesson, classroomName, onBack, onRecordingSaved }: CloudflareLiveClassRoomProps) {
  const [meeting, initMeeting] = useRealtimeKitClient()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(lesson.recording_url || null)

  const startTimeRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)

  const auth = getAuthFromStorage()
  const displayName = auth?.name || auth?.email || 'Participant'
  const isTeacher = auth?.role === 'staff' || auth?.role === 'tenant_admin'

  const { state: recordingState, error: recordingError, durationSec, startRecording, stopRecording } = useLessonRecording({
    uploadEndpoint: `/api/tenant/lessons/recording?lessonId=${lesson.id}`,
    onUploadComplete: (url) => {
      setRecordingUrl(url)
      onRecordingSaved?.(url)
    },
  })

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

        const res = await fetch('/api/tenant/live-meetings/join', {
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
    if (authToken) {
      initMeeting({ authToken })
    }
  }, [authToken, initMeeting])

  // Stop display stream on unmount
  useEffect(() => {
    return () => {
      displayStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      })
      displayStreamRef.current = stream
      await startRecording(stream)
    } catch (err) {
      console.error('Failed to start screen capture:', err)
    }
  }

  const handleStopRecording = () => {
    stopRecording()
    displayStreamRef.current?.getTracks().forEach(t => t.stop())
  }

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`
  }

  const connectionStatus: 'connecting' | 'connected' | 'disconnected' = isLoading ? 'connecting' : error ? 'disconnected' : 'connected'

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
              {connectionStatus === 'connected' ? 'Live' : connectionStatus}
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
              {meeting ? (
                <RealtimeKitProvider value={meeting}>
                  <RtkMeeting
                    mode="fill"
                    meeting={meeting}
                    showSetupScreen={true}
                  />
                </RealtimeKitProvider>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Joining live class...</span>
                    </div>
                  ) : (
                    <span>Waiting to join</span>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Recording Controls (Teacher only) */}
          {isTeacher && (
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
                        <Square className="h-4 w-4 mr-2 fill-current" /> Stop Recording ({formatTime(durationSec)})
                      </Button>
                    )}
                    {recordingState === 'stopped' && (
                      <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Stopping...</Badge>
                    )}
                    {recordingState === 'uploading' && (
                      <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading recording...</Badge>
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
                    Recording captures your screen + microphone. The file uploads automatically when you stop.
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
