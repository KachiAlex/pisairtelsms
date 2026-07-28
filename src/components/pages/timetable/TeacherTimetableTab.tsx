import React, { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Badge } from '../../ui/badge'
import { Progress } from '../../ui/progress'

interface StaffMember {
  id: string
  name: string
  role: string
  department: string
}

interface WorkloadEntry {
  id: string
  classId: string
  className: string
  subjectName: string
  hoursPerWeek: number
  dayOfWeek: number
}

interface TeacherSchedule {
  id: string
  teacherId: string
  teacherName: string
  termId: string
  totalHours: number
  totalClasses: number
  maxHoursLimit: number | null
  workload: WorkloadEntry[]
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function TeacherTimetableTab() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [schedule, setSchedule] = useState<TeacherSchedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tenant/staff')
      .then(r => r.json())
      .then(d => {
        const members: StaffMember[] = Array.isArray(d.data) ? d.data : []
        setStaff(members)
        if (members.length > 0) setSelectedTeacherId(members[0].id)
      })
      .catch(() => setError('Failed to load staff'))
  }, [])

  useEffect(() => {
    if (!selectedTeacherId) return
    loadSchedule()
  }, [selectedTeacherId])

  async function loadSchedule() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenant/timetable/teacher-schedules?teacherId=${selectedTeacherId}`)
      const data = await res.json()
      const schedules: TeacherSchedule[] = data.data || []
      if (schedules.length > 0) {
        const detailRes = await fetch(`/api/tenant/timetable/teacher-schedules?id=${schedules[0].id}`)
        const detailData = await detailRes.json()
        setSchedule(detailData.data)
      } else {
        setSchedule(null)
      }
    } catch {
      setError('Failed to load teacher schedule')
    } finally {
      setLoading(false)
    }
  }

  const selectedTeacher = staff.find(s => s.id === selectedTeacherId)
  const workloadPct = schedule && schedule.maxHoursLimit
    ? Math.round((schedule.totalHours / schedule.maxHoursLimit) * 100)
    : null
  const isOverCapacity = workloadPct !== null && workloadPct > 100

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
          <SelectTrigger className="w-56"><SelectValue placeholder={staff.length === 0 ? 'No staff available' : undefined} /></SelectTrigger>
          <SelectContent>
            {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadSchedule}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : schedule ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Workload summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-600" />
                Workload Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Teaching hours</span>
                  <span className={`font-semibold ${isOverCapacity ? 'text-red-600' : 'text-gray-900'}`}>
                    {schedule.totalHours}{schedule.maxHoursLimit ? `/${schedule.maxHoursLimit}` : ''} hrs
                  </span>
                </div>
                {workloadPct !== null && (
                  <Progress value={Math.min(workloadPct, 100)} className={isOverCapacity ? '[&>div]:bg-red-500' : ''} />
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total classes</span>
                <span className="font-semibold text-gray-900">{schedule.totalClasses}</span>
              </div>
              {isOverCapacity && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 p-2 text-xs text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  Over capacity — reduce by {schedule.totalHours - (schedule.maxHoursLimit || 0)} hrs
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly assignments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{selectedTeacher?.name || 'Teacher'} — Weekly Assignments</CardTitle>
              <CardDescription>{selectedTeacher?.department} • {selectedTeacher?.role}</CardDescription>
            </CardHeader>
            <CardContent>
              {schedule.workload.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No assignments recorded for this teacher yet.</p>
              ) : (
                <div className="space-y-2">
                  {schedule.workload.map(w => (
                    <div key={w.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{w.subjectName}</p>
                        <p className="text-xs text-gray-500">{w.className} • {DAY_NAMES[w.dayOfWeek]}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{w.hoursPerWeek} hrs/wk</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p className="text-sm">No schedule found for this teacher in the current term.</p>
            <p className="text-xs mt-1">Assignments will appear here once class timetables are configured.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
