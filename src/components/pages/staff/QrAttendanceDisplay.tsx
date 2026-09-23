import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, RefreshCw, Clock, XCircle, Loader2, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'

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

/**
 * Attendance kiosk — displays a QR code that rotates every ~25 seconds.
 * Each code is a fresh server-issued token valid ~45s, so a photographed
 * code dies before it can be shared. Put this screen at the school
 * entrance; staff scan it from My Attendance to check in/out.
 */
export function QrAttendanceDisplay() {
  const [qrData, setQrData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  useEffect(() => {
    fetchToken(true)
    pollRef.current = setInterval(() => fetchToken(), REFRESH_MS)
    tickRef.current = setInterval(() => setCountdown(c => (c <= 1 ? REFRESH_MS / 1000 : c - 1)), 1000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [fetchToken])

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
                Staff scan it from <strong>My Attendance</strong> on their dashboard to check in or out.
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 max-w-sm">
              <MonitorSmartphone className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Leave this page open on a screen or tablet at the school entrance. Keep it visible — do not share screenshots.</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchToken()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh now
            </Button>
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
    </Card>
  )
}

export default QrAttendanceDisplay
