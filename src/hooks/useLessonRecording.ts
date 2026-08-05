import { useRef, useState, useCallback } from 'react'
import { getAuthFromStorage } from '../lib/auth'

type RecordingState = 'idle' | 'recording' | 'stopped' | 'uploading' | 'done' | 'error'

interface UseLessonRecordingOptions {
  onUploadComplete?: (url: string) => void
  uploadEndpoint?: string
}

interface UseLessonRecordingReturn {
  state: RecordingState
  error: string | null
  durationSec: number
  startRecording: (displayStream: MediaStream) => Promise<void>
  stopRecording: () => void
  getRecordedBlob: () => Blob | null
}

export function useLessonRecording(opts: UseLessonRecordingOptions = {}): UseLessonRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [durationSec, setDurationSec] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async (displayStream: MediaStream) => {
    try {
      setError(null)
      chunksRef.current = []
      streamRef.current = displayStream

      // Try to also capture microphone audio
      let combinedStream = displayStream
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const tracks = [...displayStream.getTracks(), ...audioStream.getAudioTracks()]
        combinedStream = new MediaStream(tracks)
      } catch {
        // Microphone access denied — continue with display stream only
      }

      // Pick the best supported mime type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ]
      const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'

      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 2500000 })
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        // Stop all tracks
        streamRef.current?.getTracks().forEach(t => t.stop())

        const blob = new Blob(chunksRef.current, { type: mimeType })
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
        setDurationSec(duration)

        // Upload the recording
        if (blob.size > 0 && opts.uploadEndpoint) {
          setState('uploading')
          try {
            const formData = new FormData()
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
            formData.append('file', blob, `recording-${Date.now()}.${ext}`)
            formData.append('duration', String(duration))

            const auth = getAuthFromStorage()
            const headers: Record<string, string> = {}
            if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`

            const res = await fetch(opts.uploadEndpoint, {
              method: 'POST',
              headers,
              body: formData,
            })
            if (res.ok) {
              const data = await res.json()
              const url = data.url || data.data?.url || ''
              setState('done')
              opts.onUploadComplete?.(url)
            } else {
              throw new Error('Upload failed')
            }
          } catch (err) {
            setState('error')
            setError(err instanceof Error ? err.message : 'Upload failed')
          }
        } else {
          setState('done')
        }
      }

      recorder.start(1000) // collect data every second
      mediaRecorderRef.current = recorder
      startTimeRef.current = Date.now()
      setState('recording')

      // Duration timer
      timerRef.current = setInterval(() => {
        setDurationSec(Math.round((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Failed to start recording')
    }
  }, [opts])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setState('stopped')
    }
  }, [])

  const getRecordedBlob = useCallback(() => {
    if (chunksRef.current.length === 0) return null
    const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm'
    return new Blob(chunksRef.current, { type: mimeType })
  }, [])

  return { state, error, durationSec, startRecording, stopRecording, getRecordedBlob }
}
