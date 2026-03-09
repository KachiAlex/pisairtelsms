import React, { useMemo } from 'react'
import { ClipboardList, Clock3, AlertTriangle, Upload, CheckCircle2, Gauge, Send, Mail } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'
import { Input } from '../ui/input'

const entryWindows = [
  { title: 'JSS 2 CA2 window', range: '12 Feb – 23 Feb', progress: 72, classes: 12, status: 'In progress' },
  { title: 'SS 1 CA1 window', range: '26 Feb – 08 Mar', progress: 18, classes: 9, status: 'Scheduled' },
  { title: 'Primary 5 CA2 window', range: '04 Mar – 12 Mar', progress: 0, classes: 6, status: 'Not opened' },
]

const classProgress = [
  { className: 'JSS 2A', subjects: 12, submitted: 9, owner: 'Mrs. Angela Ojo', overdue: 1 },
  { className: 'JSS 2B', subjects: 12, submitted: 6, owner: 'Mr. Idris Lawal', overdue: 2 },
  { className: 'JSS 2C', subjects: 12, submitted: 11, owner: 'Ms. Tobi Aina', overdue: 0 },
  { className: 'JSS 2D', subjects: 12, submitted: 7, owner: 'Mrs. Rita Ajao', overdue: 3 },
]

const teacherSubmissions = [
  { teacher: 'Mrs. Angela Ojo', subjects: ['Mathematics', 'Further Math'], status: 'Synced', updated: '2 hrs ago' },
  { teacher: 'Mr. Idris Lawal', subjects: ['Basic Science'], status: 'Pending QA', updated: '30 mins ago' },
  { teacher: 'Ms. Yemi Thomas', subjects: ['Business Studies'], status: 'Awaiting upload', updated: '—' },
]

const qaChecks = [
  { id: 'QA-203', label: 'Outlier detection (CA2)', result: '3 scores beyond 2σ', severity: 'warning' },
  { id: 'QA-187', label: 'Missing template fields', result: 'Home Economics (JSS 2B)', severity: 'critical' },
  { id: 'QA-182', label: 'Score drift vs CA1', result: '+18% spike in CRS', severity: 'info' },
]

const severityMap: Record<string, { text: string; badgeVariant: 'default' | 'secondary' | 'warning' | 'destructive' }> = {
  critical: { text: 'Critical', badgeVariant: 'destructive' },
  warning: { text: 'Warning', badgeVariant: 'warning' },
  info: { text: 'Heads-up', badgeVariant: 'secondary' },
}

export function CAScoreEntry() {
  const totalSubjects = useMemo(() => classProgress.reduce((sum, item) => sum + item.subjects, 0), [])
  const totalSubmitted = useMemo(() => classProgress.reduce((sum, item) => sum + item.submitted, 0), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Continuous assessment cockpit</p>
          <h1 className="text-2xl font-bold text-gray-900">CA score entry</h1>
          <p className="text-sm text-gray-600">Monitor entry windows, track subject submissions, and nudge teachers in real time.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Bulk upload template
          </Button>
          <Button>
            <ClipboardList className="h-4 w-4 mr-2" /> Configure window
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Subjects submitted</p>
            <p className="text-3xl font-semibold text-gray-900">{totalSubmitted}</p>
            <p className="text-xs text-gray-500">of {totalSubjects} total subjects in this cycle</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Late uploads</p>
            <p className="text-3xl font-semibold text-rose-600">6</p>
            <p className="text-xs text-gray-500">Auto-escalations in 2 hrs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Automation rules</p>
            <p className="text-3xl font-semibold text-gray-900">8</p>
            <p className="text-xs text-gray-500">Reminders via email, SMS, in-app</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Data integrity</p>
            <p className="text-3xl font-semibold text-emerald-600">99.1%</p>
            <p className="text-xs text-gray-500">Last QA sweep 35 mins ago</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Active entry windows</CardTitle>
            <CardDescription>Monitor coverage across cohorts and proactively resolve bottlenecks.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <Clock3 className="h-4 w-4 mr-2" /> SLA matrix
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {entryWindows.map((window) => (
            <div key={window.title} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-gray-900">{window.title}</p>
                <p className="text-sm text-gray-500">{window.range}</p>
              </div>
              <div className="w-full lg:w-1/2">
                <Progress value={window.progress} />
                <p className="text-xs text-gray-500 mt-1">{window.progress}% subjects synced • {window.classes} classes</p>
              </div>
              <Badge variant={window.progress === 0 ? 'secondary' : window.progress < 30 ? 'warning' : 'default'}>{window.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Class-level progress</CardTitle>
            <CardDescription>Spot late subjects and nudge class advisors before deadlines slip.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">Sorted by submission status</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Export</Button>
                <Button variant="ghost" size="sm">Share digest</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Past due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classProgress.map((entry) => (
                    <TableRow key={entry.className}>
                      <TableCell className="font-medium text-gray-900">{entry.className}</TableCell>
                      <TableCell>{entry.subjects}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-28">
                            <Progress value={(entry.submitted / entry.subjects) * 100} />
                          </div>
                          <span className="text-sm text-gray-600">
                            {entry.submitted}/{entry.subjects}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{entry.owner}</TableCell>
                      <TableCell>
                        {entry.overdue === 0 ? (
                          <Badge variant="secondary">On track</Badge>
                        ) : (
                          <Badge variant="warning">{entry.overdue} overdue</Badge>
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
            <CardTitle>Teacher submission feed</CardTitle>
            <CardDescription>Watch recently synced files and outstanding uploads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Search teacher" className="bg-gray-50 focus-visible:ring-blue-500" />
            <div className="space-y-3">
              {teacherSubmissions.map((entry) => (
                <div key={entry.teacher} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{entry.teacher}</p>
                    <Badge variant={entry.status === 'Synced' ? 'default' : entry.status.includes('Pending') ? 'warning' : 'secondary'}>{entry.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{entry.subjects.join(' • ')}</p>
                  <p className="text-xs text-gray-400 mt-1">Updated {entry.updated}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Send className="h-4 w-4 mr-2" /> Send reminder
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QA & integrity monitor</CardTitle>
            <CardDescription>Automated rules run every 15 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {qaChecks.map((check) => (
              <div key={check.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{check.label}</p>
                    <p className="text-sm text-gray-500">{check.result}</p>
                  </div>
                  <Badge variant={severityMap[check.severity].badgeVariant}>{severityMap[check.severity].text}</Badge>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Gauge className="h-4 w-4 mr-2" /> Configure guardrails
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reminder channels</CardTitle>
            <CardDescription>Automations keep nudging teachers until uploads land.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
              <div>
                <p className="font-medium text-gray-900">In-app prompts</p>
                <p className="text-sm text-gray-500">Triggered after 24h of inactivity.</p>
              </div>
              <Badge variant="default">Live</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
              <div>
                <p className="font-medium text-gray-900">Email escalations</p>
                <p className="text-sm text-gray-500">Daily digest to HODs at 6pm.</p>
              </div>
              <Badge variant="secondary">Queued</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
              <div>
                <p className="font-medium text-gray-900">SMS fallback</p>
                <p className="text-sm text-gray-500">Only for critical overdue uploads.</p>
              </div>
              <Badge variant="warning">Testing</Badge>
            </div>
            <Button className="w-full">
              <Mail className="h-4 w-4 mr-2" /> Launch escalation now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default CAScoreEntry;
