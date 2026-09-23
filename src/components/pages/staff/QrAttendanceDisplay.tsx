import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  QrCode, RefreshCw, Clock, XCircle, Loader2, MonitorSmartphone,
  ShieldCheck, LogIn, LogOut, Printer, AlertTriangle, Link2, Copy, Trash2, Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../../ui/dialog'

function getAuthHeaders() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

const REFRESH_MS = 25_000
const FEED_MS = 15_000

interface FeedEntry {
  staffName: string
  checkIn?: string
  checkOut?: string
  status?: string
}

interface FeedSummary {
  present: number
  late: number
  absent: number
  total: number
}

/**
 * Attendance kiosk — displays a QR code that rotates every ~25 seconds.
 * Each code is a fresh server-issued token valid ~45s, so a photographed
 * code dies before it can be shared. Put this screen at the school
 * entrance; staff scan it from My Attendance (or any camera app — the
 * code is a deep link) to check in/out. A live feed shows check-ins as
 * they happen, and a printable end-of-day code is available as fallback.
 */
export function QrAttendanceDisplay() {
  const [qrData, setQrData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [summary, setSummary] = useState<FeedSummary | null>(null)
  const [printCode, setPrintCode] = useState<{ qrData: string; date: string } | null>(null)
  const [printLoading, setPrintLoading] = useState(false)
  const [kioskDialog, setKioskDialog] = useState(false)
  const [kioskKeys, setKioskKeys] = useState<Array<{ id: string; key: string; label: string; created_at: string; revoked_at: string | null }>>([])
  const [kioskBusy, setKioskBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const feedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const printQrRef = useRef<HTMLDivElement | null>(null)

  const fetchToken = useCallback(async (initial = false) => {
    try {
      const res = await fetch('/api/tenant/staff-attendance/qr?mode=kiosk', {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success && data.token) {
        setQrData(data.qrData)
        setError(null)
        setCountdown(Math.max(1, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000) - 20))
      } else {
        setError(data.error || 'Failed to load QR code')
        setQrData(null)
      }
    } catch {
      setError('Could not reach the server — check your connection')
    } finally {
      if (initial) setLoading(false)
    }
  }, [])

  const fetchFeed = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/tenant/staff-attendance?date=${today}`, {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success && data.data) {
        const checked = (data.data.records as any[])
          .filter(r => r.attendance?.checkIn)
          .map(r => ({
            staffName: r.staffName as string,
            checkIn: r.attendance.checkIn as string | undefined,
            checkOut: r.attendance.checkOut as string | undefined,
            status: r.attendance.status as string | undefined,
          }))
          .sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''))
          .slice(0, 8)
        setFeed(checked)
        setSummary(data.data.summary)
      }
    } catch {
      // feed is best-effort — the QR keeps rotating regardless
    }
  }, [])

  useEffect(() => {
    fetchToken(true)
    fetchFeed()
    pollRef.current = setInterval(() => fetchToken(), REFRESH_MS)
    feedRef.current = setInterval(() => fetchFeed(), FEED_MS)
    tickRef.current = setInterval(() => setCountdown(c => (c <= 1 ? REFRESH_MS / 1000 : c - 1)), 1000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
      if (feedRef.current) clearInterval(feedRef.current)
    }
  }, [fetchToken, fetchFeed])

  const generatePrintCode = async () => {
    setPrintLoading(true)
    try {
      const res = await fetch('/api/tenant/staff-attendance/qr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'generate', validity: 'day' }),
      })
      const data = await res.json()
      if (data.success && data.qrData) {
        setPrintCode({ qrData: data.qrData, date: data.date })
      } else {
        setError(data.error || 'Failed to generate printable code')
      }
    } catch {
      setError('Could not reach the server — check your connection')
    } finally {
      setPrintLoading(false)
    }
  }

  const fetchKioskKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/staff-attendance/qr?mode=kiosk-links', { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setKioskKeys(data.keys || [])
    } catch { /* ignore */ }
  }, [])

  const createKioskLink = async () => {
    setKioskBusy(true)
    try {
      const res = await fetch('/api/tenant/staff-attendance/qr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'create-kiosk', label: 'Entrance display' }),
      })
      const data = await res.json()
      if (data.success) fetchKioskKeys()
      else setError(data.error || 'Failed to create kiosk link')
    } catch {
      setError('Could not reach the server')
    } finally {
      setKioskBusy(false)
    }
  }

  const revokeKioskLink = async (keyId: string) => {
    setKioskBusy(true)
    try {
      await fetch('/api/tenant/staff-attendance/qr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'revoke-kiosk', keyId }),
      })
      fetchKioskKeys()
    } finally {
      setKioskBusy(false)
    }
  }

  const copyLink = (key: string) => {
    const url = `${window.location.origin}/kiosk/attendance?key=${key}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const printDailyCode = () => {
    const svg = printQrRef.current?.querySelector('svg')?.outerHTML
    if (!svg || !printCode) return
    const win = window.open('', '_blank', 'width=480,height=640')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Staff Attendance QR — ${printCode.date}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px}
      svg{width:320px;height:320px;margin:24px auto}
      h1{font-size:20px;margin:0}p{color:#555;font-size:13px;max-width:340px;margin:8px auto}</style></head>
      <body><h1>Staff Attendance — Scan to Check In/Out</h1><p>${printCode.date} · valid until end of day</p>
      ${svg}<p>Scan with any camera app, or use the QR scanner on My Attendance in the staff portal.</p>
      <script>window.onload=function(){window.print()}<\/script></body></html>`)
    win.document.close()
  }

  const statusColor = (s?: string) =>
    s === 'late' ? 'text-yellow-600' : s === 'present' ? 'text-green-600' : 'text-gray-500'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Attendance Kiosk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            <p className="text-sm text-gray-500">Starting kiosk…</p>
          </div>
        ) : qrData ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
              <QRCodeSVG value={qrData} size={240} level="M" includeMargin={false} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>New code in {countdown}s</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 max-w-sm">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This code rotates automatically and expires in seconds — photos of it won't work.
                Staff scan it from <strong>My Attendance</strong> or with any camera app to check in or out.
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 max-w-sm">
              <MonitorSmartphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Leave this page open on a screen or tablet at the school entrance. Keep it visible — do not share screenshots.</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchToken()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh now
              </Button>
              <Button variant="outline" size="sm" onClick={generatePrintCode} disabled={printLoading}>
                <Printer className="w-4 h-4 mr-2" />
                {printLoading ? 'Generating…' : 'Print daily code'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setKioskDialog(true); fetchKioskKeys() }}>
                <Link2 className="w-4 h-4 mr-2" />
                Kiosk link
              </Button>
            </div>

            {/* Live check-in feed */}
            <div className="w-full max-w-sm border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Today's check-ins</p>
                {summary && (
                  <p className="text-xs text-gray-500">
                    <span className="text-green-600 font-medium">{summary.present}</span> present
                    {' · '}<span className="text-yellow-600 font-medium">{summary.late}</span> late
                    {' · '}<span className="text-red-600 font-medium">{summary.absent}</span> absent
                  </p>
                )}
              </div>
              {feed.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No check-ins yet today.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {feed.map((entry, i) => (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-800 truncate">{entry.staffName}</span>
                      <span className="flex items-center gap-3 text-xs">
                        <span className={`flex items-center gap-1 ${statusColor(entry.status)}`}>
                          <LogIn className="w-3 h-3" />
                          {entry.checkIn?.slice(0, 5)}
                          {entry.status === 'late' && ' (late)'}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <LogOut className="w-3 h-3" />
                          {entry.checkOut?.slice(0, 5) || '—'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
              <QrCode className="w-16 h-16 text-gray-300" />
            </div>
            <Button onClick={() => fetchToken()} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}
      </CardContent>

      {/* Printable daily code — fallback when the kiosk screen is unavailable */}
      <Dialog open={!!printCode} onOpenChange={(open) => !open && setPrintCode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Printable Daily Code</DialogTitle>
            <DialogDescription>
              Valid until end of {printCode?.date}. Weaker than the kiosk — a photo works all day.
            </DialogDescription>
          </DialogHeader>
          {printCode && (
            <div className="flex flex-col items-center gap-4">
              <div ref={printQrRef} className="p-4 bg-white rounded-xl border-2 border-gray-200">
                <QRCodeSVG value={printCode.qrData} size={220} level="M" includeMargin={false} />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Print and post only as a backup (e.g. kiosk screen down). A photographed copy stays valid until midnight — prefer the rotating kiosk whenever possible.</span>
              </div>
              <Button onClick={printDailyCode} className="w-full">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Kiosk link management — display-only URLs for unattended screens */}
      <Dialog open={kioskDialog} onOpenChange={setKioskDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kiosk Links</DialogTitle>
            <DialogDescription>
              Open a kiosk link on the entrance screen — it shows the rotating QR and today's check-ins with no login, and cannot mark attendance. Revoke a link to kill that screen instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {kioskKeys.filter(k => !k.revoked_at).length === 0 && (
              <p className="text-sm text-gray-500 py-2">No active kiosk links yet.</p>
            )}
            {kioskKeys.filter(k => !k.revoked_at).map(k => (
              <div key={k.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{k.label || 'Attendance kiosk'}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {window.location.origin}/kiosk/attendance?key={k.key.slice(0, 14)}…
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyLink(k.key)} title="Copy link">
                  {copied === k.key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => revokeKioskLink(k.id)} disabled={kioskBusy} title="Revoke">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button onClick={createKioskLink} disabled={kioskBusy} className="w-full">
              {kioskBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Create kiosk link
            </Button>
            <p className="text-xs text-gray-500">
              Safer than leaving an admin logged in on a public screen: a kiosk link can only display — never mark attendance or reach admin functions.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default QrAttendanceDisplay
