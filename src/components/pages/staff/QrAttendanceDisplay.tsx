import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, RefreshCw, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
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

export function QrAttendanceDisplay() {
  const [qrData, setQrData] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/staff-attendance/qr', {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success && data.token) {
        setQrData(data.qrData)
        setToken(data.token)
        setExpiresAt(data.expiresAt)
      } else {
        setQrData(null)
        setToken(null)
        setExpiresAt(null)
      }
    } catch {
      // ignore
    }
  }, [])

  const generateQr = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/staff-attendance/qr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'generate' }),
      })
      const data = await res.json()
      if (data.success) {
        setQrData(data.qrData)
        setToken(data.token)
        setExpiresAt(data.expiresAt)
      } else {
        setError(data.error || 'Failed to generate QR code')
      }
    } catch {
      setError('Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveSession()
  }, [fetchActiveSession])

  useEffect(() => {
    if (expiresAt) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
        setCountdown(remaining)
        if (remaining <= 0) {
          setQrData(null)
          setToken(null)
          setExpiresAt(null)
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }
      updateCountdown()
      timerRef.current = setInterval(updateCountdown, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [expiresAt])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {qrData ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative p-4 bg-white rounded-xl border-2 border-gray-200">
              <QRCodeSVG
                value={qrData}
                size={240}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className={countdown < 60 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                Expires in {formatTime(countdown)}
              </span>
            </div>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Staff can scan this QR code with their device camera to check in or check out.
            </p>
            <Button variant="outline" size="sm" onClick={generateQr} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
              <QrCode className="w-16 h-16 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              No active QR code. Generate one to allow staff to mark attendance by scanning.
            </p>
            <Button onClick={generateQr} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default QrAttendanceDisplay
