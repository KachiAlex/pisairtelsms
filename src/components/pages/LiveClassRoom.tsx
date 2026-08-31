import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Video, Mic, MicOff, VideoOff, PhoneOff, Circle, Square,
  Users, Clock, ArrowLeft, AlertCircle, CheckCircle, Loader2,
  PlayCircle, Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { getAuthFromStorage } from '../../lib/auth'
import { tenantApiPost } from '../../lib/tenantApi'
import { useLessonRecording } from '../../hooks/useLessonRecording'

interface LiveClassRoomProps {
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

interface Participant {
  id: string
  displayName: string
  joinedAt: Date
  leftAt?: Date
}

// Generate a Jitsi room name from lesson info
function generateJitsiRoomName(lesson: Lesson): string {
  const base = 'pisairtel'
  const lessonSlug = lesson.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
  const lessonId = lesson.id.slice(0, 8)
  return `${base}-${lessonSlug}-${lessonId}`
}

// Build the Jitsi URL with config params
function buildJitsiUrl(roomName: string, displayName: string, isTeacher: boolean): string {
  const params = new URLSearchParams({
    'config.prejoinPageEnabled': 'false',
    'config.startWithAudioMuted': 'false',
    'config.startWithVideoMuted': 'false',
    'config.disableDeepLinking': 'true',
    'config.enableNoisyMicDetection': 'true',
    'userInfo.displayName': displayName,
    ...(isTeacher ? { 'config.startReconciled': 'true' } : {}),
  })
  return `https://meet.jit.si/${roomName}#${params.toString()}`
}

export function LiveClassRoom({ lesson, classroomName, onBack, onRecordingSaved }: LiveClassRoomProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [recordingUrl, setRecordingUrl] = useState<string | null>(lesson.recording_url || null)

  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<any>(null)
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

  // Load Jitsi external API script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => initJitsi()
    script.onerror = () => setConnectionStatus('disconnected')
    document.body.appendChild(script)

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.disposeEventListeners?.()
        jitsiApiRef.current.dispose?.()
        jitsiApiRef.current = null
      }
      document.body.removeChild(script)
    }
  }, [])

  const initJitsi = useCallback(() => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return

    const roomName = generateJitsiRoomName(lesson)
    const domain = 'meet.jit.si'

    const options = {
      roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop',
          'fullscreen', 'fodeviceselection', 'hangup', 'chat',
          'raisehand', 'videoquality', 'filmstrip', 'feedback',
          'shortcuts', 'tileview', 'videobackgroundblur', 'download',
          'help', 'mute-everyone', 'mute-video-everyone',
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
      },
      userInfo: {
        displayName,
      },
    }

    const api = new window.JitsiMeetExternalAPI(domain, options)
    jitsiApiRef.current = api

    // Event listeners for attendance tracking
    api.addEventListener('participantJoined', (e: any) => {
      setParticipants(prev => [...prev, {
        id: e.id,
        displayName: e.displayName || 'Unknown',
        joinedAt: new Date(),
      }])
    })

    api.addEventListener('participantLeft', (e: any) => {
      setParticipants(prev => prev.map(p =>
        p.id === e.id ? { ...p, leftAt: new Date() } : p
      ))
      // Save attendance to API
      saveAttendance(e.id, e.displayName, 'left')
    })

    api.addEventListener('videoConferenceJoined', (e: any) => {
      setConnectionStatus('connected')
      setParticipants(prev => [...prev, {
        id: e.id,
        displayName: e.displayName || displayName,
        joinedAt: new Date(),
      }])
      // Save attendance to API
      saveAttendance(e.id, e.displayName || displayName, 'joined')
    })

    api.addEventListener('videoConferenceLeft', () => {
      setConnectionStatus('disconnected')
      // Stop recording if still active
      if (recordingState === 'recording') {
        stopRecording()
      }
    })

    api.addEventListener('videoConferenceJoined', () => {
      setConnectionStatus('connected')
    })
  }, [lesson, displayName])

  const saveAttendance = async (participantId: string, name: string, action: 'joined' | 'left') => {
    const auth = getAuthFromStorage()
    if (!auth?.token) return
    try {
      await tenantApiPost('/api/tenant/virtual-attendance', {
        lessonId: lesson.id,
        participantId,
        participantName: name,
        action,
      })
    } catch {
      // Attendance tracking is non-critical
    }
  }

  // Recording controls
  const handleStartRecording = async () => {
    try {
      // Capture the Jitsi container (or the whole screen)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      })
      displayStreamRef.current = stream
      await startRecording(stream)
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start screen capture:', err)
    }
  }

  const handleStopRecording = () => {
    stopRecording()
    setIsRecording(false)
    // Stop the display stream
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

  const activeParticipants = participants.filter(p => !p.leftAt)

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

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Video Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Jitsi Container */}
          <Card className="overflow-hidden">
            <div
              ref={jitsiContainerRef}
              className="w-full bg-black"
              style={{ height: '500px' }}
            />
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
                    {(recordingState === 'recording') && (
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

        {/* Sidebar: Participants + Info */}
        <div className="space-y-4">
          {/* Participants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Participants
                <Badge variant="secondary">{activeParticipants.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {activeParticipants.length === 0 ? (
                <p className="text-xs text-gray-400">No participants yet</p>
              ) : (
                activeParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 truncate">{p.displayName}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Lesson Info */}
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

          {/* Past Participants */}
          {participants.some(p => p.leftAt) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400">Left</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-32 overflow-y-auto">
                {participants.filter(p => p.leftAt).map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-medium text-gray-500">
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{p.displayName}</span>
                    <span className="ml-auto">
                      {p.leftAt?.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Type declaration for Jitsi external API
declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

export default LiveClassRoom
