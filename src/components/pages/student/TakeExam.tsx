import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Clock, AlertTriangle, CheckCircle, Flag, ChevronLeft, ChevronRight,
  Loader2, ShieldCheck, LogOut, Send, Camera, CameraOff,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'
import { startExamSecurityMonitoring, logSecurityEvent } from '../../../lib/cbt/security-enforcement'

interface PaperQuestion {
  id: string
  order: number
  text: string
  type: 'objective' | 'truefalse' | 'essay'
  options: { key: string; text: string }[] | null
  marks: number
}

interface ExamMeta {
  id: string
  title: string
  subject: string
  class: string
  description: string
  duration: number
  totalMarks: number
  passMark: number
}

interface SecurityFlags {
  enableProctoring: boolean
  disableCopyPaste: boolean
  disableRightClick: boolean
  requireCamera: boolean
  requiresPassword: boolean
}

interface ExamResult {
  score: number
  total_marks: number
  percentage: number
  status: 'Pending' | 'Passed' | 'Failed'
  time_spent: number
  submitted_at: string
}

type Phase = 'loading' | 'intro' | 'active' | 'submitting' | 'submitted'

export function TakeExam({ examId, onExit }: { examId: string; onExit: () => void }) {
  const auth = getAuthFromStorage()
  const token = auth?.token

  const [phase, setPhase] = useState<Phase>('loading')
  const [exam, setExam] = useState<ExamMeta | null>(null)
  const [questions, setQuestions] = useState<PaperQuestion[]>([])
  const [security, setSecurity] = useState<SecurityFlags | null>(null)
  const [result, setResult] = useState<ExamResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [securityWarnings, setSecurityWarnings] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)
  const [notOpen, setNotOpen] = useState(false)

  const stopSecurityRef = useRef<(() => void) | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittedRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const headers = useCallback(
    (json = false) => ({
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    }),
    [token]
  )

  // Load the paper (and any existing progress/result)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/student/exams/${examId}/paper`, { headers: headers() })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || 'Failed to load exam')
          setPhase('intro')
          return
        }
        setExam(data.exam)
        setSecurity(data.security || null)
        if (data.state === 'submitted') {
          setResult(data.result)
          setPhase('submitted')
          return
        }
        setQuestions(data.questions || [])
        setQuestionCount(data.questionCount ?? (data.questions || []).length)
        setNotOpen(data.state === 'not-open')
        if (data.progress) {
          setAnswers(data.progress.answers || {})
          setCurrent(data.progress.currentQuestion || 0)
          setTimeLeft(data.progress.timeRemainingSec ?? null)
        }
        setPhase('intro')
      } catch {
        if (!cancelled) {
          setError('Failed to load exam')
          setPhase('intro')
        }
      }
    })()
    return () => {
      cancelled = true
      stopSecurityRef.current?.()
      stopCamera()
    }
  }, [examId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Camera proctoring ----------

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera access')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
      setCameraError(null)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setCameraOn(false)
        setCameraError('Camera disconnected')
        void logSecurityEvent(examId, 'camera_lost', { timestamp: new Date().toISOString() })
      })
      return true
    } catch {
      setCameraOn(false)
      setCameraError('Camera access denied — this exam requires a webcam')
      void logSecurityEvent(examId, 'camera_denied', { timestamp: new Date().toISOString() })
      return false
    }
  }, [examId])

  // Acquire the camera as soon as we know it is required
  useEffect(() => {
    if (security?.requireCamera && !cameraOn && !streamRef.current && phase === 'intro') {
      void requestCamera()
    }
  }, [security, cameraOn, phase, requestCamera])

  // Keep the video element bound to the stream whenever it mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  })

  // Periodic snapshot capture while the exam is active
  useEffect(() => {
    if (phase !== 'active' || !security?.requireCamera || !cameraOn || !token) return
    const capture = async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 240)
      const image = canvas.toDataURL('image/jpeg', 0.6)
      await fetch('/api/tenant/cbt/security/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ examId, image }),
      }).catch(() => {})
    }
    void capture()
    const interval = setInterval(() => void capture(), 30_000)
    return () => clearInterval(interval)
  }, [phase, security, cameraOn, examId, token])

  // Countdown
  useEffect(() => {
    if (phase !== 'active' || timeLeft === null) return
    if (timeLeft <= 0) {
      void doSubmit()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => (s === null ? s : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const saveProgress = useCallback(
    (nextAnswers: Record<string, string>, nextCurrent: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/student/exams/${examId}/progress`, {
          method: 'PUT',
          headers: headers(true),
          body: JSON.stringify({ answers: nextAnswers, currentQuestion: nextCurrent }),
        }).catch(() => {})
      }, 1200)
    },
    [examId, headers]
  )

  const setAnswer = (questionId: string, value: string) => {
    const next = { ...answers, [questionId]: value }
    setAnswers(next)
    saveProgress(next, current)
  }

  const navigate = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, questions.length - 1))
    setCurrent(clamped)
    saveProgress(answers, clamped)
  }

  const startExam = async () => {
    setError(null)
    try {
      const res = await fetch(`/api/student/exams/${examId}/start`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(security?.requiresPassword ? { password } : {}),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not start exam')
        return
      }
      setTimeLeft(data.timeRemainingSec)

      if (security) {
        stopSecurityRef.current = startExamSecurityMonitoring(examId, {
          disableCopyPaste: security.disableCopyPaste,
          disableRightClick: security.disableRightClick,
          monitorTabSwitches: security.enableProctoring,
          monitorWindowFocus: security.enableProctoring,
        })
        if (security.enableProctoring) {
          window.addEventListener('blur', bumpWarnings)
        }
      }
      setPhase('active')
    } catch {
      setError('Could not start exam')
    }
  }

  const bumpWarnings = () => setSecurityWarnings((n) => n + 1)

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setPhase('submitting')
    stopSecurityRef.current?.()
    stopCamera()
    window.removeEventListener('blur', bumpWarnings)
    try {
      const res = await fetch(`/api/student/exams/${examId}/submit`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (!res.ok) {
        submittedRef.current = false
        setError(data.error || 'Submission failed')
        setPhase('active')
        return
      }
      setResult(data.result)
      setPhase('submitted')
    } catch {
      submittedRef.current = false
      setError('Submission failed — check your connection and try again')
      setPhase('active')
    }
  }, [examId, answers, headers, stopCamera])

  const answeredCount = questions.filter((q) => answers[q.id] != null && answers[q.id] !== '').length
  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ---------- Views ----------

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (phase === 'submitted' && result) {
    const pct = Math.round(Number(result.percentage))
    return (
      <div className="max-w-lg mx-auto bg-white rounded-lg border border-gray-200 p-8 text-center space-y-4">
        <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Exam Submitted</h2>
        <p className="text-gray-600">{exam?.title || exam?.subject}</p>
        {result.status === 'Pending' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            Your exam includes essay questions that need teacher grading. Your result will appear once marked.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-900">{result.score}/{result.total_marks}</p>
              <p className="text-xs text-gray-500">Score</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-900">{pct}%</p>
              <p className="text-xs text-gray-500">Percentage</p>
            </div>
            <div className={`rounded-lg p-3 ${result.status === 'Passed' ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-2xl font-bold ${result.status === 'Passed' ? 'text-green-700' : 'text-red-700'}`}>
                {result.status}
              </p>
              <p className="text-xs text-gray-500">Result</p>
            </div>
          </div>
        )}
        <Button onClick={onExit} variant="outline" className="gap-2">
          <LogOut className="w-4 h-4" /> Back to Exams
        </Button>
      </div>
    )
  }

  if (phase === 'intro' && exam) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-lg border border-gray-200 p-8 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{exam.title || exam.subject}</h2>
          <p className="text-gray-600 mt-1">{exam.description}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{exam.duration}m</p>
            <p className="text-xs text-blue-600">Duration</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{questionCount}</p>
            <p className="text-xs text-blue-600">Questions</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{exam.totalMarks}</p>
            <p className="text-xs text-blue-600">Total Marks</p>
          </div>
        </div>

        {security && (security.enableProctoring || security.disableCopyPaste || security.disableRightClick || security.requireCamera) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">This exam is proctored.</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                {security.requireCamera && <li>Your webcam is monitored throughout the exam.</li>}
                {security.enableProctoring && <li>Tab switches and focus loss are recorded.</li>}
                {security.disableCopyPaste && <li>Copy and paste are disabled.</li>}
                {security.disableRightClick && <li>Right-click is disabled.</li>}
              </ul>
            </div>
          </div>
        )}

        {security?.requireCamera && (
          <div
            className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${
              cameraOn
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            <span className="flex-1">
              {cameraOn ? 'Camera ready' : cameraError || 'Requesting camera access…'}
            </span>
            {!cameraOn && cameraError && (
              <Button size="sm" variant="outline" onClick={() => void requestCamera()}>
                Retry
              </Button>
            )}
          </div>
        )}

        {security?.requiresPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter the password from your teacher"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {notOpen && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Staff has not opened this sitting yet. Check back shortly.
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onExit}>Back</Button>
          <Button
            className="flex-1"
            onClick={startExam}
            disabled={
              notOpen ||
              (security?.requiresPassword && !password) ||
              (security?.requireCamera && !cameraOn)
            }
          >
            {Object.keys(answers).length > 0 ? 'Resume Exam' : 'Start Exam'}
          </Button>
        </div>
      </div>
    )
  }

  const q = questions[current]
  if (!q) return null

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{exam?.title || exam?.subject}</h2>
          <p className="text-xs text-gray-500">
            Question {current + 1} of {questions.length} · {answeredCount} answered
          </p>
        </div>
        <div className="flex items-center gap-4">
          {securityWarnings > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {securityWarnings} warning{securityWarnings !== 1 ? 's' : ''} recorded
            </span>
          )}
          {timeLeft !== null && (
            <span className={`font-mono text-lg font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-gray-900'}`}>
              <Clock className="w-4 h-4 inline mr-1 -mt-0.5" />
              {fmtTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {security?.requireCamera && !cameraOn && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <CameraOff className="w-4 h-4" />
          <span className="flex-1">Camera lost — {cameraError || 'reconnecting is required for this exam'}. This has been logged.</span>
          <Button size="sm" variant="outline" onClick={() => void requestCamera()}>Reconnect</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Question card */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-gray-900 font-medium leading-relaxed">{q.text}</p>
            <button
              onClick={() =>
                setFlagged((f) => {
                  const n = new Set(f)
                  n.has(q.id) ? n.delete(q.id) : n.add(q.id)
                  return n
                })
              }
              className={`flex-shrink-0 p-1.5 rounded ${flagged.has(q.id) ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-amber-600'}`}
              title="Flag for review"
              aria-label="Flag question for review"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>

          {q.type === 'objective' && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setAnswer(q.id, opt.key)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center gap-3 ${
                    answers[q.id] === opt.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                      answers[q.id] === opt.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span className="text-gray-800">{opt.text}</span>
                </button>
              ))}
            </div>
          )}

          {q.type === 'truefalse' && (
            <div className="flex gap-3">
              {['True', 'False'].map((v) => (
                <button
                  key={v}
                  onClick={() => setAnswer(q.id, v)}
                  className={`flex-1 px-4 py-3 rounded-lg border font-medium transition-colors ${
                    answers[q.id] === v
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 text-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {q.type === 'essay' && (
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Type your answer here..."
            />
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => navigate(current - 1)} disabled={current === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
            {current < questions.length - 1 ? (
              <Button onClick={() => navigate(current + 1)} className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => setConfirmSubmit(true)} className="gap-1 bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4" /> Submit
              </Button>
            )}
          </div>
        </div>

        {/* Navigator */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 h-fit">
          <p className="text-sm font-semibold text-gray-700 mb-3">Questions</p>
          <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
            {questions.map((qq, i) => {
              const answered = answers[qq.id] != null && answers[qq.id] !== ''
              return (
                <button
                  key={qq.id}
                  onClick={() => navigate(i)}
                  className={`relative h-9 rounded text-sm font-medium border transition-colors ${
                    i === current
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : answered
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {i + 1}
                  {flagged.has(qq.id) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
          <Button
            className="w-full mt-4 bg-green-600 hover:bg-green-700 gap-1"
            onClick={() => setConfirmSubmit(true)}
            disabled={phase === 'submitting'}
          >
            {phase === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Exam
          </Button>
        </div>
      </div>

      {/* Live webcam preview (proctoring) */}
      {security?.requireCamera && cameraOn && (
        <div className="fixed bottom-4 right-4 z-40 w-40 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-28 object-cover" />
          <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-white font-medium">REC</span>
          </div>
        </div>
      )}

      {/* Confirm submit */}
      {confirmSubmit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-gray-900">Submit exam?</h3>
            <p className="text-sm text-gray-600">
              You answered {answeredCount} of {questions.length} questions.
              {answeredCount < questions.length && ' Unanswered questions score zero.'} This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmSubmit(false)}>
                Keep working
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setConfirmSubmit(false); void doSubmit() }}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
