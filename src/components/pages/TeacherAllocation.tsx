import React from 'react'
import { UserCheck, AlertTriangle, Clock3, CalendarCheck, Search, Shuffle, Users, BarChart3, Activity } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

const coverageStats = [
  { label: 'Teacher coverage', value: '91%', detail: '234 / 258 slots assigned', color: 'bg-emerald-500' },
  { label: 'Open periods', value: '19', detail: 'Highest: Chemistry (SS2)', color: 'bg-amber-500' },
  { label: 'Overload alerts', value: '7', detail: 'More than 28 periods/week', color: 'bg-rose-500' },
  { label: 'Substitution pool', value: '12', detail: 'Trained for multi-subject coverage', color: 'bg-blue-500' },
]

const teacherCards = [
  {
    name: 'Mrs. Angela Ojo',
    subjects: ['Mathematics', 'Further Math'],
    level: 'SS1-SS3',
    allocation: 26,
    contractHours: 28,
    availability: 'Full',
    risk: 'Healthy',
  },
  {
    name: 'Mr. Sola Eke',
    subjects: ['Chemistry'],
    level: 'SS2-SS3',
    allocation: 31,
    contractHours: 28,
    availability: 'Partial',
    risk: 'Overload',
  },
  {
    name: 'Ms. Lara Ajayi',
    subjects: ['English Studies'],
    level: 'JSS1-JSS3',
    allocation: 24,
    contractHours: 28,
    availability: 'Full',
    risk: 'Healthy',
  },
]

const allocationMatrix = [
  { class: 'JSS 1A', subject: 'Mathematics', teacher: 'Mrs. Angela Ojo', coverage: 'Assigned', warnings: 0 },
  { class: 'JSS 1B', subject: 'Mathematics', teacher: 'Mrs. Angela Ojo', coverage: 'Assigned', warnings: 0 },
  { class: 'JSS 2A', subject: 'Basic Science', teacher: 'Mr. Idris Lawal', coverage: 'Assigned', warnings: 0 },
  { class: 'SS 2 Science', subject: 'Chemistry', teacher: 'Mr. Sola Eke', coverage: 'Assigned', warnings: 1 },
  { class: 'SS 2 Science', subject: 'Further Math', teacher: 'Vacant', coverage: 'Open', warnings: 2 },
  { class: 'SS 3 Commercial', subject: 'Accounting', teacher: 'Mrs. Ada Enem', coverage: 'Assigned', warnings: 0 },
]

const openPeriodTimeline = [
  { day: 'Mon', periods: 4 },
  { day: 'Tue', periods: 3 },
  { day: 'Wed', periods: 6 },
  { day: 'Thu', periods: 4 },
  { day: 'Fri', periods: 2 },
]

const substitutionLog = [
  {
    slot: 'Further Math - SS2 Science',
    priority: 'High priority',
    action: 'Awaiting approval to move Ms. Ojo for double periods.',
    relief: 'Proposed: Mr. Daniel Okon',
    eta: 'Cleared for Week 8',
    impacted: ['SS2 Sci A', 'SS2 Sci B'],
  },
  {
    slot: 'Chemistry - SS2 Science',
    priority: 'High priority',
    action: 'Substitution plan ready once overload review closes.',
    relief: 'Relief: Mrs. Amina Bello (part-time)',
    eta: 'HR onboarding 3 days',
    impacted: ['Lab block A'],
  },
  {
    slot: 'French - JSS2',
    priority: 'Medium priority',
    action: 'Request sent to partner language school.',
    relief: 'External coach shortlist',
    eta: 'Demo lesson 18 Feb',
    impacted: ['JSS2 Arts'],
  },
]

export function TeacherAllocation() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Coverage intelligence</p>
          <h1 className="text-2xl font-bold text-gray-900">Teacher allocation</h1>
          <p className="text-sm text-gray-600">Balance loads, fill gaps, and monitor risks across timetable slots.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" /> Search teacher
          </Button>
          <Button variant="outline">
            <Shuffle className="h-4 w-4 mr-2" /> Auto-balance load
          </Button>
          <Button>
            <CalendarCheck className="h-4 w-4 mr-2" /> Assign slots
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {coverageStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.detail}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${stat.color}`} style={{ width: '100%' }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open period clustering</CardTitle>
          <CardDescription>Visualize when timetable gaps spike to prioritise hiring or substitutions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity className="h-4 w-4 text-amber-600" /> 19 uncovered periods this week (11 are STEM).
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {openPeriodTimeline.map((bucket) => (
              <div key={bucket.day} className="rounded-2xl border border-gray-100 p-3 flex flex-col gap-2 text-sm text-gray-600">
                <span className="text-xs uppercase tracking-wide text-gray-400">{bucket.day}</span>
                <div className="h-20 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ height: `${(bucket.periods / 6) * 100}%` }} />
                </div>
                <span className="text-gray-900 font-semibold">{bucket.periods} gaps</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active allocations</CardTitle>
            <CardDescription>Matrix of classes vs teachers highlighting gaps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search class, subject, or teacher" />
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class / Arm</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Warnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocationMatrix.map((row) => (
                    <TableRow key={`${row.class}-${row.subject}`}>
                      <TableCell className="font-semibold text-gray-900">{row.class}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell className={row.teacher === 'Vacant' ? 'text-rose-600 font-semibold' : ''}>{row.teacher}</TableCell>
                      <TableCell>
                        <Badge variant={row.coverage === 'Assigned' ? 'secondary' : 'outline'} className="text-xs">
                          {row.coverage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {row.warnings > 0 ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" /> {row.warnings}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher load insights</CardTitle>
            <CardDescription>Top signals needing action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherCards.map((teacher) => (
              <div key={teacher.name} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{teacher.name}</p>
                    <p className="text-xs text-gray-500">{teacher.level}</p>
                  </div>
                  <Badge variant={teacher.risk === 'Overload' ? 'destructive' : 'secondary'} className="text-[11px]">
                    {teacher.risk}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">{teacher.subjects.join(' • ')}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Allocation: {teacher.allocation} / {teacher.contractHours} periods</span>
                  <span>{Math.round((teacher.allocation / teacher.contractHours) * 100)}% load</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-1.5 rounded-full ${teacher.risk === 'Overload' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((teacher.allocation / teacher.contractHours) * 100, 120)}%` }}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Users className="h-4 w-4 mr-2" /> View allocation board
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk & substitution log</CardTitle>
          <CardDescription>Every open slot tracked with remediation steps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {substitutionLog.map((entry) => (
            <div key={entry.slot} className="rounded-2xl border border-dashed border-gray-200 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-gray-900">
                <span>{entry.slot}</span>
                <Badge variant="outline" className="text-xs">{entry.priority}</Badge>
              </div>
              <p className="text-xs text-gray-500">{entry.action}</p>
              <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                <span className="font-medium text-gray-900">{entry.relief}</span>
                <span>{entry.eta}</span>
                <span>Impacted: {entry.impacted.join(', ')}</span>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" size="sm">
            <UserCheck className="h-4 w-4 mr-2" /> Assign substitute
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
export default TeacherAllocation;
