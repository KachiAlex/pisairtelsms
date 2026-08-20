import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, Camera, CheckCircle2, XCircle, Loader2, LogIn, LogOut } from 'lucide-react'
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

interface ScanResult {
  success: boolean
  action: string
  time?: string
  status?: string
  staffName?: string
  message: string
}

export function QrAttendanceScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [todayStatus, setTodayStatus] = useState<{ checkIn?: string; checkOut?: string; status?: string } | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = 'qr-scan-container'

  const fetchTodayStatus = useCallback(async () => {
    try {
      const month = new Date().getMonth() + 1
      const year = new Date().getFullYear()
      const res = await fetch(`/api/staff/my-attendance?month=${month}&year=${year}`, {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.today) {
        setTodayStatus({
          checkIn: data.today.checkInTime || undefined,
          checkOut: data.today.checkOutTime || undefined,
          status: data.records?.find((r: any) => r.date === new Date().toISOString().split('T')[0])?.status,
        })
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchTodayStatus()
  }, [fetchTodayStatus])

  const handleScanResult = async (qrText: string) => {
    try {
      // Parse the QR data
      let token: string
      try {
        const parsed = JSON.parse(qrText)
        token = parsed.t || parsed.token || qrText
      } catch {
        token = qrText
      }

      // Stop scanning
      await stopScanner()

      setResult(null)
      setError(null)

      const res = await fetch('/api/tenant/staff-attendance/qr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'scan', token }),
      })

      const data = await res.json()

      if (data.success) {
        setResult({
          success: true,
          action: data.action,
          time: data.time,
          status: data.status,
          staffName: data.staffName,
          message: data.message,
        })
        fetchTodayStatus()
      } else {
        setError(data.error || 'Failed to process QR code')
        setResult({
          success: false,
          action: 'error',
          message: data.error || 'Failed to process QR code',
        })
      }
    } catch {
      setError('Failed to process scan')
    }
  }

  const startScanner = async () => {
    setError(null)
    setResult(null)
    setScanning(true)

    try {
      const html5Qrcode = new Html5Qrcode(containerId)
      scannerRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanResult(decodedText)
        },
        () => {
          // Per-frame error, ignore
        }
      )
    } catch {
      setError('Failed to access camera. Please ensure camera permissions are granted.')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const statusBadge = (status?: string) => {
    if (!status) return null
    const colors: Record<string, string> = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      half_day: 'bg-blue-100 text-blue-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="w-5 h-5" />
          Scan QR to Mark Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's status */}
        {todayStatus && (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 border p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Check In</p>
                  <p className="text-sm font-medium">{todayStatus.checkIn || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Check Out</p>
                  <p className="text-sm font-medium">{todayStatus.checkOut || '—'}</p>
                </div>
              </div>
            </div>
            {statusBadge(todayStatus.status)}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className={`rounded-lg border p-4 flex items-center gap-3 ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            {result.success ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.message}
              </p>
              {result.time && (
                <p className="text-sm text-gray-600">
                  {result.action === 'check-in' ? 'Check-in' : 'Check-out'} at {result.time}
                  {result.status ? ` · ${result.status}` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Scanner container */}
        <div id={containerId} className="w-full rounded-xl overflow-hidden bg-black min-h-[200px]" />

        {/* Controls */}
        <div className="flex gap-2">
          {!scanning ? (
            <Button onClick={startScanner} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button variant="outline" onClick={stopScanner} className="flex-1">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Stop Scanning
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center">
          Point your camera at the QR code displayed by the admin to mark your attendance.
        </p>
      </CardContent>
    </Card>
  )
}

export default QrAttendanceScanner
