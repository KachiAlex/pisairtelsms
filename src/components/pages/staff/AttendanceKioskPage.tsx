import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Clock, XCircle, LogIn, LogOut, ShieldCheck } from 'lucide-react'

const REFRESH_MS = 25_000
const FEED_MS = 15_000

interface FeedEntry {
  staffName: string
  checkIn?: string
  checkOut?: string
  status?: string
}

/**
 * Public attendance kiosk — opened via an admin-generated kiosk link
 * (/kiosk/attendance?key=...). No login: the key only unlocks display
 * (rotating QR + today's check-in feed) and can never mark attendance.
 * Safe to leave running unattended on an entrance screen.
 */
export default function AttendanceKioskPage() {
  const key = new URLSearchParams(window.location.search).get('key') || ''
  const [qrData, setQrData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [summary, setSummary] = useState<{ checkedIn: number; present: number; late: number; absent: number; total: number } | null>(null)
  const [clock, setClock] = useState(new Date())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchToken = useCallback(async () => {
    if (!key) { setError('No kiosk key in this link. Ask an administrator for a valid kiosk link.'); return }
    try {
      const res = await fetch(`/api/tenant/staff-attendance/qr?mode=kiosk&kiosk=${encodeURIComponent(key)}`)
      const data = await res.json()
      if (data.success && data.qrData) {
        setQrData(data.qrData)
        setError(null)
        setCountdown(Math.max(1, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000) - 20))
      } else {
        setError(data.error || 'This kiosk link is invalid or has been revoked.')
        setQrData(null)
      }
    } catch {
      setError('Could not reach the server — retrying…')
    }
  }, [key])

  const fetchFeed = useCallback(async () => {
    if (!key) return
    try {
      const res = await fetch(`/api/tenant/staff-attendance/qr?mode=kiosk-feed&kiosk=${encodeURIComponent(key)}`)
      const data = await res.json()
      if (data.success) {
        setFeed(data.feed || [])
        setSummary(data.summary || null)
      }
    } catch {
      // best-effort
    }
  }, [key])

  useEffect(() => {
    fetchToken()
    fetchFeed()
    pollRef.current = setInterval(fetchToken, REFRESH_MS)
    const feedTimer = setInterval(fetchFeed, FEED_MS)
    const tickTimer = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_MS / 1000 : c - 1))
      setClock(new Date())
    }, 1000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      clearInterval(feedTimer)
      clearInterval(tickTimer)
    }
  }, [fetchToken, fetchFeed])

  const statusColor = (s?: string) =>
    s === 'late' ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <QrCode className="w-7 h-7 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Staff Attendance</h1>
            <p className="text-xs text-slate-400">Scan the code to check in or out</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold tabular-nums">
            {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-slate-400">{clock.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 p-8">
        {/* QR panel */}
        <div className="flex flex-col items-center gap-5">
          {error ? (
            <div className="w-72 h-72 rounded-2xl border-2 border-dashed border-red-800 bg-red-950/40 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <XCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : qrData ? (
            <div className="p-6 bg-white rounded-2xl shadow-2xl shadow-emerald-500/10">
              <QRCodeSVG value={qrData} size={300} level="M" includeMargin={false} />
            </div>
          ) : (
            <div className="w-72 h-72 rounded-2xl bg-slate-900 animate-pulse" />
          )}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            <span>New code in {countdown}s</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 max-w-xs text-center">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
            <span>Code rotates automatically — a photo of it won't work. Scan with any camera app or the scanner in My Attendance.</span>
          </div>
        </div>

        {/* Live feed panel */}
        <div className="w-full max-w-md">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Today's check-ins</h2>
            {summary && (
              <p className="text-xs text-slate-500">
                <span className="text-emerald-400 font-semibold">{summary.present}</span> present
                {' · '}<span className="text-amber-400 font-semibold">{summary.late}</span> late
                {' · '}<span className="text-slate-400 font-semibold">{summary.absent}</span> not yet in
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800/80 overflow-hidden">
            {feed.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No check-ins yet today.</p>
            ) : (
              feed.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-slate-100 truncate">{entry.staffName}</span>
                  <span className="flex items-center gap-4 text-sm tabular-nums">
                    <span className={`flex items-center gap-1.5 ${statusColor(entry.status)}`}>
                      <LogIn className="w-3.5 h-3.5" />
                      {entry.checkIn?.slice(0, 5)}
                      {entry.status === 'late' && <span className="text-[10px] uppercase">late</span>}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <LogOut className="w-3.5 h-3.5" />
                      {entry.checkOut?.slice(0, 5) || '—'}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="px-8 py-4 border-t border-slate-800 text-center text-xs text-slate-600">
        Display-only kiosk — this screen cannot mark attendance. If it is misused, an administrator can revoke its link instantly.
      </footer>
    </div>
  )
}
