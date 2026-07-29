import React, { useState, useEffect } from 'react'
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
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
    return { 'Content-Type': 'application/json' };
  }
}

export function StaffAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    fetchAttendance()
  }, [selectedDate])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/tenant/staff', { headers: getAuthHeaders() })
      const data = await res.json()
      setStaff(data.data || [])
    } catch (err) {
      console.error('Failed to fetch staff')
    }
  }

  const fetchAttendance = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenant/staff?resource=attendance&date=${selectedDate}`, {
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error('Failed to fetch attendance')
      const data = await res.json()
      setRecords(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }

  const markAttendance = async (staffMember: Staff, status: AttendanceRecord['status']) => {
    setMarking(staffMember.id)
    try {
      const now = new Date().toTimeString().slice(0, 5)
      await fetch('/api/tenant/staff?resource=attendance', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staffId: staffMember.id,
          staffName: staffMember.name,
          date: selectedDate,
          checkIn: status !== 'absent' ? now : undefined,
          status,
        }),
      })
      fetchAttendance()
    } catch (err) {
      alert('Failed to mark attendance')
    } finally {
      setMarking(null)
    }
  }

  const getRecord = (staffId: string) => records.find(r => r.staffId === staffId)

  const statusColor = (s: string) => {
    switch (s) {
      case 'present': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'late': return 'bg-yellow-100 text-yellow-800'
      case 'half_day': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount = records.filter(r => r.status === 'absent').length
  const lateCount = records.filter(r => r.status === 'late').length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Staff</p>
            <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <span className="text-sm text-gray-600">
            {new Date(selectedDate).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
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

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading attendance...</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Register — {selectedDate}</CardTitle>
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
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.department}</TableCell>
                          <TableCell>{record?.checkIn || '—'}</TableCell>
                          <TableCell>{record?.checkOut || '—'}</TableCell>
                          <TableCell>
                            {record ? (
                              <Badge className={statusColor(record.status)}>
                                {record.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600">Not Marked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" disabled={marking === s.id} onClick={() => markAttendance(s, 'present')} title="Present">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" disabled={marking === s.id} onClick={() => markAttendance(s, 'absent')} title="Absent">
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                              <Button variant="ghost" size="sm" disabled={marking === s.id} onClick={() => markAttendance(s, 'late')} title="Late">
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

export default StaffAttendance
