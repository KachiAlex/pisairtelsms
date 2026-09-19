import React, { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Badge } from '../../ui/badge'
import { Progress } from '../../ui/progress'
import { tenantApiGet } from '../../../lib/tenantApi'

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
  days: number[]
}

interface SessionEntry {
  id: string
  dayOfWeek: number
  slotId: string
  slotName: string
  sequence: number
  startTime: string
  endTime: string
  subjectName: string
  className: string
  roomId: string
}

interface TeacherSchedule {
  teacherId: string
  teacherName: string
  termId: string | null
  totalHours: number
  totalClasses: number
  maxHoursLimit: number | null
  workload: WorkloadEntry[]
  sessions: SessionEntry[]
}

interface Term {
  id: string
  name: string
  academicYear: string
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function TeacherTimetableTab() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [schedule, setSchedule] = useState<TeacherSchedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      tenantApiGet('/api/tenant/staff').then(r => r.json()),
      tenantApiGet('/api/tenant/timetable/calendar?resource=terms').then(r => r.json()).catch(() => ({})),
    ])
      .then(([staffData, termsData]) => {
        const members: StaffMember[] = Array.isArray(staffData.data) ? staffData.data : []
        const termList: Term[] = Array.isArray(termsData.data) ? termsData.data : []
        setStaff(members)
        setTerms(termList)
        if (members.length > 0) setSelectedTeacherId(members[0].id)
        if (termList.length > 0) setSelectedTerm(termList[0].id)
      })
      .catch(() => setError('Failed to load staff'))
  }, [])

  useEffect(() => {
    if (!selectedTeacherId) return
    loadSchedule()
  }, [selectedTeacherId, selectedTerm])

  async function loadSchedule() {
    setLoading(true)
    setError(null)
    try {
      const qs = selectedTerm ? `&termId=${encodeURIComponent(selectedTerm)}` : ''
      const res = await tenantApiGet(`/api/tenant/timetable/teacher-schedules?teacherId=${selectedTeacherId}${qs}`)
      const data = await res.json()
      setSchedule(data.data || null)
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
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-48"><SelectValue placeholder={terms.length === 0 ? 'No terms yet' : undefined} /></SelectTrigger>
          <SelectContent>
            {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academicYear})</SelectItem>)}
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
        <>
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
                        <p className="text-xs text-gray-500">{w.className} • {w.days.map(d => DAY_NAMES[d]).filter(Boolean).join(', ') || '—'}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">{w.hoursPerWeek} hrs/wk</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly grid: which period, which class */}
        {schedule.sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selectedTeacher?.name || 'Teacher'} — Weekly Timetable</CardTitle>
              <CardDescription>Period-by-period view of where this teacher teaches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-36">Period</th>
                      {DAY_NAMES.slice(1).map(d => (
                        <th key={d} className="px-3 py-2 text-center text-xs font-semibold text-gray-700">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Map(schedule.sessions.map(s => [s.slotId, s])).values())
                      .sort((a, b) => a.sequence - b.sequence)
                      .map(slot => (
                        <tr key={slot.slotId} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2 text-xs font-medium text-gray-700">
                            <p>{slot.slotName}</p>
                            <p className="text-gray-400">{slot.startTime}–{slot.endTime}</p>
                          </td>
                          {[1, 2, 3, 4, 5].map(day => {
                            const s = schedule.sessions.find(x => x.slotId === slot.slotId && x.dayOfWeek === day)
                            return (
                              <td key={day} className="px-2 py-1.5 text-center">
                                {s ? (
                                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-1.5 text-xs">
                                    <p className="font-semibold text-emerald-800">{s.subjectName}</p>
                                    <p className="text-emerald-600">{s.className}{s.roomId ? ` • ${s.roomId}` : ''}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p className="text-sm">No schedule found for this teacher in the selected term.</p>
            <p className="text-xs mt-1">Assignments will appear here once class timetables are configured.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
