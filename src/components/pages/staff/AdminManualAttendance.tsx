import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Users, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'

interface AttendanceRecord {
  id: string
  staffId: string
  staffName: string
  date: string
  checkIn?: string
  checkOut?: string
  status: 'present' | 'absent' | 'late' | 'half_day'
  notes?: string
}

interface Staff {
  id: string
  name: string
  department: string
}

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

type Status = 'present' | 'absent' | 'late' | 'half_day'

export function AdminManualAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [marking, setMarking] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<Status | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Status>>({})
  const [saveResult, setSaveResult] = useState<string | null>(null)

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/staff', { headers: getAuthHeaders() })
      const data = await res.json()
      setStaff(data.data || [])
    } catch {
      // ignore
    }
  }, [])

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenant/staff-attendance?date=${selectedDate}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch attendance')
      const data = await res.json()
      setRecords(data.data?.records || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const getRecord = (staffId: string) => records.find(r => r.staffId === staffId)

  const getPendingStatus = (staffId: string): Status | null => {
    if (pendingChanges[staffId]) return pendingChanges[staffId]
    const record = getRecord(staffId)
    return record?.status || null
  }

  const setPendingStatus = (staffId: string, status: Status) => {
    setPendingChanges(prev => ({ ...prev, [staffId]: status }))
  }

  const markSingle = async (staffMember: Staff, status: Status) => {
    setMarking(staffMember.id)
    setError(null)
    try {
      const now = new Date().toTimeString().slice(0, 5)
      const res = await fetch('/api/tenant/staff-attendance', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staffId: staffMember.id,
          date: selectedDate,
          status,
          checkIn: status !== 'absent' ? now : undefined,
          notes: 'Admin manual mark',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      setPendingChanges(prev => {
        const next = { ...prev }
        delete next[staffMember.id]
        return next
      })
      fetchAttendance()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark attendance')
    } finally {
      setMarking(null)
    }
  }

  const applyBulkStatus = (status: Status) => {
    setBulkStatus(status)
    const changes: Record<string, Status> = {}
    staff.forEach(s => {
      changes[s.id] = status
    })
    setPendingChanges(changes)
  }

  const saveBulkChanges = async () => {
    const entries = Object.entries(pendingChanges)
    if (entries.length === 0) return

    setBulkSaving(true)
    setError(null)
    setSaveResult(null)
    try {
      const now = new Date().toTimeString().slice(0, 5)
      const recordsToMark = entries.map(([staffId, status]) => ({
        staffId,
        status,
        checkIn: status !== 'absent' ? now : undefined,
        notes: 'Admin bulk manual mark',
      }))

      const res = await fetch('/api/tenant/staff-attendance/qr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'bulk-mark', date: selectedDate, records: recordsToMark }),
      })
      const data = await res.json()

      if (data.success) {
        setSaveResult(`Successfully marked ${data.marked} staff${data.failed > 0 ? `, ${data.failed} failed` : ''}`)
        setPendingChanges({})
        setBulkStatus(null)
        fetchAttendance()
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Failed to save bulk changes')
    } finally {
      setBulkSaving(false)
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'present': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'late': return 'bg-yellow-100 text-yellow-800'
      case 'half_day': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0

  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount = records.filter(r => r.status === 'absent').length
  const lateCount = records.filter(r => r.status === 'late').length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Selector + Bulk Actions */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-sm text-gray-600 hidden sm:inline">
              {new Date(selectedDate).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Mark all:</span>
            <Button variant="outline" size="sm" onClick={() => applyBulkStatus('present')} className="text-green-600 border-green-200 hover:bg-green-50">
              Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyBulkStatus('absent')} className="text-red-600 border-red-200 hover:bg-red-50">
              Absent
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyBulkStatus('late')} className="text-yellow-600 border-yellow-200 hover:bg-yellow-50">
              Late
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {saveResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700">{saveResult}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading attendance...</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendance Register — {selectedDate}</CardTitle>
              {hasPendingChanges && (
                <Button onClick={saveBulkChanges} disabled={bulkSaving} size="sm">
                  {bulkSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes ({Object.keys(pendingChanges).length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No staff members found. Add staff first.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mark Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map(s => {
                      const record = getRecord(s.id)
                      const currentStatus = getPendingStatus(s.id)
                      const isPending = !!pendingChanges[s.id]
                      return (
                        <TableRow key={s.id} className={isPending ? 'bg-blue-50' : ''}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.department}</TableCell>
                          <TableCell>{record?.checkIn || '—'}</TableCell>
                          <TableCell>{record?.checkOut || '—'}</TableCell>
                          <TableCell>
                            {currentStatus ? (
                              <Badge className={statusColor(currentStatus)}>
                                {currentStatus.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600">Not Marked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={marking === s.id}
                                onClick={() => markSingle(s, 'present')}
                                title="Present"
                                className={currentStatus === 'present' ? 'bg-green-100' : ''}
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={marking === s.id}
                                onClick={() => markSingle(s, 'absent')}
                                title="Absent"
                                className={currentStatus === 'absent' ? 'bg-red-100' : ''}
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={marking === s.id}
                                onClick={() => markSingle(s, 'late')}
                                title="Late"
                                className={currentStatus === 'late' ? 'bg-yellow-100' : ''}
                              >
                                <Clock className="w-4 h-4 text-yellow-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminManualAttendance
