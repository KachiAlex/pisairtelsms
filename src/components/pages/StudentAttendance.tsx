import React, { useMemo, useState } from 'react'
import {
  CalendarCheck,
  AlertTriangle,
  Users,
  TrendingDown,
  Filter,
  RefreshCcw,
  Download,
  Bell,
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

const summaryStats = [
  { label: 'Today attendance', value: '94.6%', trend: '+1.8% vs last week', tone: 'text-emerald-600' },
  { label: 'Chronic absences', value: '36 students', trend: '8 new alerts', tone: 'text-rose-600' },
  { label: 'Late check-ins', value: '72 entries', trend: '12 flagged buses', tone: 'text-amber-600' },
  { label: 'Homerooms on target', value: '86%', trend: 'Goal: 90%', tone: 'text-blue-600' },
]

const heatmapWeeks = [
  {
    week: 'Week 6',
    days: [94, 95, 91, 90, 93],
  },
  {
    week: 'Week 7',
    days: [96, 94, 95, 92, 94],
  },
  {
    week: 'Week 8',
    days: [92, 90, 89, 91, 93],
  },
  {
    week: 'Week 9',
    days: [95, 96, 94, 93, 95],
  },
]

const flaggedStudents = [
  { name: 'Halima Musa', cohort: 'SS 2A', attendance: '78%', reason: 'Medical', owner: 'Counselor Ada', streak: '4 days absent' },
  { name: 'David Ojo', cohort: 'JSS 3C', attendance: '82%', reason: 'Transport', owner: 'Parent liaison', streak: '6 late check-ins' },
  { name: 'Favour Nwachukwu', cohort: 'SS 1B', attendance: '75%', reason: 'Unknown', owner: 'Year head', streak: '2 truancy reports' },
  { name: 'Ifeanyi Adamu', cohort: 'JSS 2B', attendance: '80%', reason: 'Health', owner: 'Nurse Aminat', streak: '3 partial days' },
]

const homeroomPerformance = [
  { homeroom: 'JSS 1A', rate: 97, advisor: 'Mrs. Bello' },
  { homeroom: 'JSS 2B', rate: 93, advisor: 'Mr. Johnson' },
  { homeroom: 'SS 1C', rate: 89, advisor: 'Mrs. Ikpe' },
  { homeroom: 'SS 2A', rate: 86, advisor: 'Mr. Umeh' },
]

const absenceReasons = [
  { reason: 'Illness', pct: 42 },
  { reason: 'Family travel', pct: 19 },
  { reason: 'Transport issues', pct: 17 },
  { reason: 'Disciplinary', pct: 9 },
  { reason: 'Other / unreported', pct: 13 },
]

export function StudentAttendance() {
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')

  const filteredStudents = useMemo(() => {
    return flaggedStudents.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.cohort.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClass = classFilter === 'all' || student.cohort.startsWith(classFilter)
      const matchesStatus = statusFilter === 'all' || student.reason === statusFilter
      return matchesSearch && matchesClass && matchesStatus
    })
  }, [searchTerm, classFilter, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Student attendance</h1>
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
                {['Medical', 'Transport', 'Unknown', 'Health'].map((option) => (
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
            <CardDescription>Monday → Friday snapshots (% present).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-6 text-xs text-gray-500">
                <span>Week</span>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                  <span key={day} className="text-center">
                    {day}
                  </span>
                ))}
              </div>
              {heatmapWeeks.map((row) => (
                <div key={row.week} className="grid grid-cols-6 gap-2 items-center">
                  <p className="text-xs font-semibold text-gray-600">{row.week}</p>
                  {row.days.map((value, idx) => (
                    <div
                      key={`${row.week}-${idx}`}
                      className={`rounded-xl py-3 text-center text-xs font-semibold text-white ${
                        value >= 95
                          ? 'bg-emerald-500'
                          : value >= 92
                          ? 'bg-emerald-400'
                          : value >= 88
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    >
                      {value}%
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Absence reasons split
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            {absenceReasons.map((item) => (
              <div key={item.reason}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{item.reason}</span>
                  <span>{item.pct}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-blue-600">
              View insights report
            </Button>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-purple-600" /> Homeroom leaderboard
            </CardTitle>
            <CardDescription>Top performing advisors this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {homeroomPerformance.map((homeroom) => (
              <div key={homeroom.homeroom} className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{homeroom.homeroom}</p>
                  <p className="text-xs text-gray-500">Advisor: {homeroom.advisor}</p>
                </div>
                <Badge variant="outline">{homeroom.rate}%</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-blue-600">
              View all homerooms
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default StudentAttendance;
