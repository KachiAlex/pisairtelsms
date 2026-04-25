import React, { useMemo, useState, useEffect } from 'react'
import {
  CalendarCheck,
  AlertTriangle,
  Users,
  TrendingDown,
  Filter,
  RefreshCcw,
  Download,
  Bell,
  BarChart3,
  FileText,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import type { AttendanceRecord } from '../../types'

// Helper: get ISO week string for a date
function isoWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function StudentAttendance() {
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'students' | 'staff' | 'reports'>('students')

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (classFilter !== 'all') {
          params.append('class', classFilter)
        }
        const response = await fetch(`/api/tenant/attendance?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch attendance records')
        }
        const data = await response.json()
        setAttendanceRecords(data.data || [])
      } catch (err) {
        console.error('Error fetching attendance:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch attendance records')
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [classFilter])

  // Compute summary stats from fetched records
  const summaryStats = useMemo(() => {
    const total = attendanceRecords.length
    if (total === 0) {
      return [
        { label: 'Present rate', value: '—', trend: 'No data yet', tone: 'text-emerald-600' },
        { label: 'Absent rate', value: '—', trend: 'No data yet', tone: 'text-rose-600' },
        { label: 'Late rate', value: '—', trend: 'No data yet', tone: 'text-amber-600' },
        { label: 'Total records', value: '0', trend: 'No records loaded', tone: 'text-blue-600' },
      ]
    }
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length
    return [
      {
        label: 'Present rate',
        value: `${Math.round((presentCount / total) * 100)}%`,
        trend: `${presentCount} of ${total} records`,
        tone: 'text-emerald-600',
      },
      {
        label: 'Absent rate',
        value: `${Math.round((absentCount / total) * 100)}%`,
        trend: `${absentCount} absences`,
        tone: 'text-rose-600',
      },
      {
        label: 'Late rate',
        value: `${Math.round((lateCount / total) * 100)}%`,
        trend: `${lateCount} late check-ins`,
        tone: 'text-amber-600',
      },
      {
        label: 'Total records',
        value: total.toString(),
        trend: 'Loaded from database',
        tone: 'text-blue-600',
      },
    ]
  }, [attendanceRecords])

  // Compute heatmap weeks from fetched records
  const heatmapWeeks = useMemo(() => {
    if (attendanceRecords.length === 0) return []

    // Group by ISO week
    const weekMap = new Map<string, { present: number; absent: number; late: number; total: number }>()
    for (const r of attendanceRecords) {
      const week = isoWeek(r.date)
      if (!weekMap.has(week)) {
        weekMap.set(week, { present: 0, absent: 0, late: 0, total: 0 })
      }
      const w = weekMap.get(week)!
      w.total++
      if (r.status === 'present') w.present++
      else if (r.status === 'absent') w.absent++
      else if (r.status === 'late') w.late++
    }

    // Convert to display format — show present % per week as a single bar
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4) // last 4 weeks
      .map(([week, counts]) => ({
        week,
        presentPct: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
        absentPct: counts.total > 0 ? Math.round((counts.absent / counts.total) * 100) : 0,
        latePct: counts.total > 0 ? Math.round((counts.late / counts.total) * 100) : 0,
        total: counts.total,
      }))
  }, [attendanceRecords])

  // Compute homeroom performance from fetched records
  const homeroomPerformance = useMemo(() => {
    if (attendanceRecords.length === 0) return []

    const classMap = new Map<string, { present: number; total: number }>()
    for (const r of attendanceRecords) {
      const cls = r.class
      if (!classMap.has(cls)) classMap.set(cls, { present: 0, total: 0 })
      const c = classMap.get(cls)!
      c.total++
      if (r.status === 'present') c.present++
    }

    return Array.from(classMap.entries())
      .map(([cls, counts]) => ({
        homeroom: cls,
        rate: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5)
  }, [attendanceRecords])

  const flaggedStudents = useMemo(() => {
    if (attendanceRecords.length === 0) return []

    const studentStats = new Map<string, { present: number; absent: number; late: number }>()
    attendanceRecords.forEach((record) => {
      if (!studentStats.has(record.studentId)) {
        studentStats.set(record.studentId, { present: 0, absent: 0, late: 0 })
      }
      const stats = studentStats.get(record.studentId)!
      if (record.status === 'present') stats.present++
      else if (record.status === 'absent') stats.absent++
      else if (record.status === 'late') stats.late++
    })

    return Array.from(studentStats.entries())
      .map(([studentId, stats]) => {
        const total = stats.present + stats.absent + stats.late
        const attendancePercentage = total > 0 ? Math.round((stats.present / total) * 100) : 0
        return {
          name: studentId,
          cohort: classFilter !== 'all' ? classFilter : 'Unknown',
          attendance: `${attendancePercentage}%`,
          reason: stats.absent > 0 ? 'Absence' : stats.late > 0 ? 'Late' : 'Present',
          owner: 'Class advisor',
          streak: `${stats.absent} absences, ${stats.late} late`,
        }
      })
      .filter((student) => parseInt(student.attendance) < 85)
  }, [attendanceRecords, classFilter])

  const filteredStudents = useMemo(() => {
    return flaggedStudents.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.cohort.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClass = classFilter === 'all' || student.cohort.startsWith(classFilter)
      const matchesStatus = statusFilter === 'all' || student.reason === statusFilter
      return matchesSearch && matchesClass && matchesStatus
    })
  }, [searchTerm, classFilter, statusFilter, flaggedStudents])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Attendance management</h1>
          <p className="text-sm text-gray-600">Monitor daily presence, identify risks, and sync alerts with guardians.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync biometric logs
          </Button>
          <Button>
            <Bell className="h-4 w-4 mr-2" /> Send absence notices
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'students'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Student Attendance
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'staff'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Staff Attendance
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Reports
        </button>
      </div>

      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <p className="text-sm text-rose-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              <p className={`text-xs mt-1 ${stat.tone}`}>{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search student or cohort"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value as typeof classFilter)}
              >
                <option value="all">All cohorts</option>
                {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              >
                <option value="all">All reasons</option>
                {['Absence', 'Late', 'Present'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" /> Advanced filters
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarCheck className="h-4 w-4 text-blue-600" /> Weekly attendance heatmap
            </CardTitle>
            <CardDescription>Present % per week from fetched records.</CardDescription>
          </CardHeader>
          <CardContent>
            {heatmapWeeks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                No attendance data available to build heatmap.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 text-xs text-gray-500 font-medium">
                  <span>Week</span>
                  <span className="text-center text-emerald-600">Present %</span>
                  <span className="text-center text-rose-600">Absent %</span>
                  <span className="text-center text-amber-600">Late %</span>
                </div>
                {heatmapWeeks.map((row) => (
                  <div key={row.week} className="grid grid-cols-4 gap-2 items-center">
                    <p className="text-xs font-semibold text-gray-600">{row.week}</p>
                    <div
                      className={`rounded-xl py-3 text-center text-xs font-semibold text-white ${
                        row.presentPct >= 95
                          ? 'bg-emerald-500'
                          : row.presentPct >= 90
                          ? 'bg-emerald-400'
                          : row.presentPct >= 85
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    >
                      {row.presentPct}%
                    </div>
                    <div className="rounded-xl py-3 text-center text-xs font-semibold text-white bg-rose-400">
                      {row.absentPct}%
                    </div>
                    <div className="rounded-xl py-3 text-center text-xs font-semibold text-white bg-amber-400">
                      {row.latePct}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Absence reasons split
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            <div className="flex items-center justify-center py-6 text-center">
              <div>
                <AlertTriangle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Absence reason tracking not yet implemented.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-rose-600" /> At-risk students
            </CardTitle>
            <CardDescription>Triggered once attendance &lt; 85% rolling 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">Loading attendance records...</div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">
                  {attendanceRecords.length === 0 ? 'No attendance records found' : 'No at-risk students found'}
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Cohort</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Streak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.name}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.cohort}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{student.attendance}</Badge>
                        </TableCell>
                        <TableCell>{student.reason}</TableCell>
                        <TableCell className="text-sm text-gray-500">{student.owner}</TableCell>
                        <TableCell className="text-sm text-gray-500">{student.streak}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    Open intervention board
                  </Button>
                  <Button variant="outline" size="sm">
                    Bulk notify guardians
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-purple-600" /> Homeroom leaderboard
            </CardTitle>
            <CardDescription>Attendance % per class from fetched records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {homeroomPerformance.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                No class data available yet.
              </div>
            ) : (
              homeroomPerformance.map((homeroom) => (
                <div key={homeroom.homeroom} className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{homeroom.homeroom}</p>
                  </div>
                  <Badge variant="outline">{homeroom.rate}%</Badge>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="text-blue-600">
              View all homerooms
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* STUDENT ATTENDANCE TAB */}
      {activeTab === 'students' && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.tone}`}>{stat.trend}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search student or cohort"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value as typeof classFilter)}
                  >
                    <option value="all">All cohorts</option>
                    {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  >
                    <option value="all">All reasons</option>
                    {['Absence', 'Late', 'Present'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" /> Advanced filters
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarCheck className="h-4 w-4 text-blue-600" /> Weekly attendance heatmap
                </CardTitle>
                <CardDescription>Present % per week from fetched records.</CardDescription>
              </CardHeader>
              <CardContent>
                {heatmapWeeks.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    No attendance data available to build heatmap.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 text-xs text-gray-500 font-medium">
                      <span>Week</span>
                      <span className="text-center text-emerald-600">Present %</span>
                      <span className="text-center text-rose-600">Absent %</span>
                      <span className="text-center text-amber-600">Late %</span>
                    </div>
                    {heatmapWeeks.map((row) => (
                      <div key={row.week} className="grid grid-cols-4 gap-2 items-center">
                        <p className="text-xs font-semibold text-gray-600">{row.week}</p>
                        <div
                          className={`rounded-xl py-3 text-center text-xs font-semibold text-white ${
                            row.presentPct >= 95
                              ? 'bg-emerald-500'
                              : row.presentPct >= 90
                              ? 'bg-emerald-400'
                              : row.presentPct >= 85
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        >
                          {row.presentPct}%
                        </div>
                        <div className="rounded-xl py-3 text-center text-xs font-semibold text-white bg-rose-400">
                          {row.absentPct}%
                        </div>
                        <div className="rounded-xl py-3 text-center text-xs font-semibold text-white bg-amber-400">
                          {row.latePct}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> Absence reasons split
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600">
                <div className="flex items-center justify-center py-6 text-center">
                  <div>
                    <AlertTriangle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Absence reason tracking not yet implemented.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingDown className="h-4 w-4 text-rose-600" /> At-risk students
                </CardTitle>
                <CardDescription>Triggered once attendance &lt; 85% rolling 30 days.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading attendance records...</div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">
                      {attendanceRecords.length === 0 ? 'No attendance records found' : 'No at-risk students found'}
                    </div>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Cohort</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Streak</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.name}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.cohort}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{student.attendance}</Badge>
                            </TableCell>
                            <TableCell>{student.reason}</TableCell>
                            <TableCell className="text-sm text-gray-500">{student.owner}</TableCell>
                            <TableCell className="text-sm text-gray-500">{student.streak}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        Open intervention board
                      </Button>
                      <Button variant="outline" size="sm">
                        Bulk notify guardians
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-purple-600" /> Homeroom leaderboard
                </CardTitle>
                <CardDescription>Attendance % per class from fetched records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {homeroomPerformance.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                    No class data available yet.
                  </div>
                ) : (
                  homeroomPerformance.map((homeroom) => (
                    <div key={homeroom.homeroom} className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{homeroom.homeroom}</p>
                      </div>
                      <Badge variant="outline">{homeroom.rate}%</Badge>
                    </div>
                  ))
                )}
                <Button variant="ghost" size="sm" className="text-blue-600">
                  View all homerooms
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* STAFF ATTENDANCE TAB */}
      {activeTab === 'staff' && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total staff</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">42</p>
                <p className="text-xs mt-1 text-blue-600">3 absent today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Present rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">93%</p>
                <p className="text-xs mt-1 text-emerald-600">39 of 42 present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">On leave</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">2</p>
                <p className="text-xs mt-1 text-amber-600">Approved leave</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Late arrivals</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">1</p>
                <p className="text-xs mt-1 text-rose-600">This week</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-600" /> Staff attendance records
              </CardTitle>
              <CardDescription>Daily attendance log for all staff members.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Check-in time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: 'Mr. Adeyemi', dept: 'Mathematics', time: '07:45 AM', status: 'Present', notes: 'On time' },
                    { name: 'Mrs. Okafor', dept: 'English', time: '08:15 AM', status: 'Late', notes: 'Traffic delay' },
                    { name: 'Dr. Eze', dept: 'Science', time: '—', status: 'Absent', notes: 'Approved leave' },
                    { name: 'Mr. Bello', dept: 'History', time: '07:50 AM', status: 'Present', notes: 'On time' },
                    { name: 'Ms. Chioma', dept: 'Languages', time: '07:55 AM', status: 'Present', notes: 'On time' },
                  ].map((staff) => (
                    <TableRow key={staff.name}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>{staff.dept}</TableCell>
                      <TableCell>{staff.time}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            staff.status === 'Present'
                              ? 'default'
                              : staff.status === 'Late'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {staff.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{staff.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Export staff report
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCcw className="h-4 w-4 mr-2" /> Sync biometric
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> Attendance issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-900">Mrs. Okafor - Late arrival</p>
                  <p className="text-xs text-amber-700 mt-1">Arrived 15 minutes late. 3rd occurrence this month.</p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="text-sm font-medium text-rose-900">Dr. Eze - Absent</p>
                  <p className="text-xs text-rose-700 mt-1">On approved leave. Expected return: Tomorrow</p>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  View all issues
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-purple-600" /> Department summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { dept: 'Mathematics', present: 8, total: 8 },
                  { dept: 'English', present: 6, total: 7 },
                  { dept: 'Science', present: 5, total: 6 },
                  { dept: 'Languages', present: 7, total: 7 },
                  { dept: 'History', present: 6, total: 6 },
                ].map((dept) => (
                  <div key={dept.dept} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{dept.dept}</span>
                    <Badge variant="outline">
                      {dept.present}/{dept.total}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Avg attendance rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">87%</p>
                <p className="text-xs mt-1 text-emerald-600">↑ 2% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total absences</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">156</p>
                <p className="text-xs mt-1 text-rose-600">This term</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">At-risk students</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
                <p className="text-xs mt-1 text-amber-600">&lt; 85% attendance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Report period</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">Term 1</p>
                <p className="text-xs mt-1 text-blue-600">2024/2025 session</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-blue-600" /> Attendance trends
                </CardTitle>
                <CardDescription>Monthly attendance rate comparison.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { month: 'September', rate: 82, color: 'bg-blue-400' },
                    { month: 'October', rate: 85, color: 'bg-blue-500' },
                    { month: 'November', rate: 87, color: 'bg-emerald-500' },
                    { month: 'December', rate: 89, color: 'bg-emerald-600' },
                  ].map((item) => (
                    <div key={item.month} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-24">{item.month}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full`}
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-12 text-right">{item.rate}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> Class performance
                </CardTitle>
                <CardDescription>Attendance rate by class.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { class: 'JSS 1A', rate: 92, status: 'Excellent' },
                  { class: 'JSS 1B', rate: 88, status: 'Good' },
                  { class: 'JSS 2A', rate: 85, status: 'Fair' },
                  { class: 'SS 1A', rate: 79, status: 'At risk' },
                  { class: 'SS 2B', rate: 81, status: 'At risk' },
                ].map((item) => (
                  <div key={item.class} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.class}</p>
                      <p className="text-xs text-gray-500">{item.status}</p>
                    </div>
                    <Badge
                      variant={
                        item.rate >= 90
                          ? 'default'
                          : item.rate >= 85
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {item.rate}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-purple-600" /> Generate reports
              </CardTitle>
              <CardDescription>Export attendance data for analysis and record-keeping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Student attendance summary
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Staff attendance report
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  At-risk students list
                </Button>
                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Monthly trends analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
export default StudentAttendance;
