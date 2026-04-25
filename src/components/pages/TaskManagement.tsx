import React from 'react'
import { ClipboardList, Users, CheckCircle2, AlertTriangle, Plus, CalendarClock, Kanban, Send, Edit3 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const squadBoard = [
  { squad: 'Academics Ops', tasks: 12, owners: ['Mrs. Angela', 'Idris'], focus: 'Results release', risk: 'medium' },
  { squad: 'Finance Ops', tasks: 9, owners: ['Tunde', 'Ada'], focus: 'Fee chase', risk: 'low' },
  { squad: 'Facilities', tasks: 5, owners: ['Estate team'], focus: 'Exam logistics', risk: 'low' },
]

const taskPipeline = [
  { id: 'TASK-7821', title: 'Compile SS 1 broadsheet remarks', priority: 'high', owner: 'Academics Ops', due: 'Today 4 PM', status: 'In progress' },
  { id: 'TASK-7815', title: 'Send guardian fee reminders', priority: 'medium', owner: 'Finance Ops', due: 'Tomorrow', status: 'Queued' },
  { id: 'TASK-7804', title: 'Audit CBT lab seating', priority: 'low', owner: 'Facilities', due: 'Fri', status: 'Scheduled' },
  { id: 'TASK-7798', title: 'Prep PTA summary pack', priority: 'high', owner: 'Principal Office', due: 'Sat', status: 'Pending review' },
]

const workstreams = [
  { id: 'wrk-1', label: 'Results release sprint', progress: 68, blockers: 2, nextMilestone: 'Parent comms draft' },
  { id: 'wrk-2', label: 'Fee recovery drive', progress: 52, blockers: 0, nextMilestone: 'SMS blast' },
  { id: 'wrk-3', label: 'Exam logistics hub', progress: 35, blockers: 1, nextMilestone: 'Hall dry-run' },
]

const reminders = [
  { id: 'rem-17', message: 'Two tasks missing owners (Communication Hub redesign, Staff briefing notes)', severity: 'warning' },
  { id: 'rem-15', message: '8 tasks overdue > 3 days. Auto-nudging assigned owners hourly.', severity: 'destructive' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  'In progress': 'default',
  Queued: 'secondary',
  Scheduled: 'secondary',
  'Pending review': 'warning',
}

const priorityPill: Record<string, 'default' | 'warning' | 'destructive'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'default',
}

const riskBadge: Record<string, 'default' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'warning',
  high: 'destructive',
}

export function TaskManagement() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Notifications & tasks</p>
          <h1 className="text-2xl font-bold text-gray-900">Task management</h1>
          <p className="text-sm text-gray-600">Coordinate cross-functional workstreams, monitor blockers, and broadcast nudges.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Edit3 className="h-4 w-4 mr-2" /> Create checklist
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Open tasks</p>
            <p className="text-3xl font-semibold text-gray-900">48</p>
            <p className="text-xs text-gray-500">14 due today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Completed this week</p>
            <p className="text-3xl font-semibold text-emerald-600">63%</p>
            <p className="text-xs text-gray-500">+9% vs last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">High priority</p>
            <p className="text-3xl font-semibold text-rose-600">11</p>
            <p className="text-xs text-gray-500">Escalations auto-nudging</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">On-track squads</p>
            <p className="text-3xl font-semibold text-gray-900">3</p>
            <p className="text-xs text-gray-500">0 blocked this morning</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Squad board</CardTitle>
          <CardDescription>Who owns what and where risks sit.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {squadBoard.map((squad) => (
            <div key={squad.squad} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900">{squad.squad}</p>
                <Badge variant={riskBadge[squad.risk]}>Risk: {squad.risk}</Badge>
              </div>
              <p className="text-sm text-gray-500">Owners: {squad.owners.join(', ')}</p>
              <p className="text-xs text-gray-400">{squad.tasks} tasks • Focus: {squad.focus}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Task pipeline</CardTitle>
            <CardDescription>Real-time workflow board condensed into a table.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <Kanban className="h-4 w-4 mr-2" /> Open kanban
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskPipeline.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium text-gray-900">{task.id}</TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>
                    <Badge variant={priorityPill[task.priority]}>{task.priority}</Badge>
                  </TableCell>
                  <TableCell>{task.owner}</TableCell>
                  <TableCell>{task.due}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[task.status] || 'secondary'}>{task.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workstreams</CardTitle>
          <CardDescription>Macro initiatives with progress bars and next milestones.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {workstreams.map((stream) => (
            <div key={stream.id} className="rounded-xl border border-gray-100 p-4">
              <p className="font-medium text-gray-900">{stream.label}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{stream.progress}% complete</span>
                  <span>{stream.blockers} blockers</span>
                </div>
                <Progress value={stream.progress} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Next: {stream.nextMilestone}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reminders & nudges</CardTitle>
            <CardDescription>Automations keep everyone accountable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={reminder.severity === 'destructive' ? 'destructive' : 'warning'}>Alert</Badge>
                  <p className="text-sm text-gray-700">{reminder.message}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Send className="h-4 w-4 mr-2" /> Send digest
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership calendar</CardTitle>
            <CardDescription>Upcoming deadlines that need executives looped in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Results release readout</p>
                <p className="text-sm text-gray-500">Academics Ops • Monday 9 AM</p>
              </div>
              <Badge variant="secondary">Prep deck</Badge>
            </div>
            <div className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Finance arrears blitz</p>
                <p className="text-sm text-gray-500">Finance Ops • Tuesday 11 AM</p>
              </div>
              <Badge variant="warning">Requires brief</Badge>
            </div>
            <Button variant="ghost" size="sm" className="w-full">
              <CalendarClock className="h-4 w-4 mr-2" /> Export calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5" />
          <p>Enable "smart triage" to auto-assign tasks based on workload, due dates, and skill tags.</p>
        </div>
        <Button size="sm">
          <Users className="h-4 w-4 mr-2" /> Turn on smart triage
        </Button>
      </div>
    </div>
  )
}
export default TaskManagement;
