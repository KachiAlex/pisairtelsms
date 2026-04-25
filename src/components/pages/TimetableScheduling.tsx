import React, { useMemo, useState } from 'react'
import {
  CalendarClock,
  AlertTriangle,
  RefreshCcw,
  Download,
  Sparkles,
  Share2,
  Users,
  CheckCircle2,
  Clock4,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'

const dayHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

type DayName = (typeof dayHeaders)[number]
type TimetableView = 'class' | 'teacher' | 'exam'

type Severity = 'high' | 'medium' | 'low'

type RequestStatus = 'queued' | 'in-review' | 'approved'

interface ViewConfig {
  title: string
  description: string
  entityLabel: string
  entities: { id: string; name: string; meta: string }[]
  stats: { label: string; value: string; trend: string; tone?: string }[]
}

interface ScheduleRow {
  slot: string
  Monday: string
  Tuesday: string
  Wednesday: string
  Thursday: string
  Friday: string
}

interface ConflictItem {
  id: string
  type: string
  owner: string
  impact: string
  severity: Severity
}

interface TimetableRequest {
  id: string
  requester: string
  item: string
  sla: string
  status: RequestStatus
}

const viewConfigs: Record<TimetableView, ViewConfig> = {
  class: {
    title: 'Class timetable orchestration',
    description: 'Balance subjects across arms, detect clashes early, and push polished grids to homerooms.',
    entityLabel: 'Cohorts',
    entities: [
      { id: 'jss1a', name: 'JSS 1A', meta: 'Advisor: Mrs. Bello • 31 periods' },
      { id: 'jss2b', name: 'JSS 2B', meta: 'Advisor: Mr. Johnson • 33 periods' },
      { id: 'ss1c', name: 'SS 1C', meta: 'Advisor: Mrs. Ikpe • 35 periods' },
      { id: 'ss2a', name: 'SS 2A', meta: 'Advisor: Mr. Umeh • 34 periods' },
    ],
    stats: [
      { label: 'Coverage compliance', value: '94%', trend: '+3% vs last term', tone: 'text-emerald-600' },
      { label: 'Conflicts detected', value: '7 overlaps', trend: '3 critical awaiting fix', tone: 'text-rose-600' },
      { label: 'Pending swap requests', value: '12 moves', trend: '8 from science dept.' },
      { label: 'Publishing readiness', value: '82%', trend: 'Expect full by Wed', tone: 'text-blue-600' },
    ],
  },
  teacher: {
    title: 'Teacher allocation dashboard',
    description: 'Track individual workloads, late changes, and synchronous classes for each educator.',
    entityLabel: 'Faculty',
    entities: [
      { id: 'obasi', name: 'Mr. Obasi', meta: 'Physics • 28 periods' },
      { id: 'aminat', name: 'Mrs. Aminat', meta: 'Biology • 30 periods' },
      { id: 'femi', name: 'Mr. Femi', meta: 'Mathematics • 32 periods' },
      { id: 'ada', name: 'Ms. Ada', meta: 'ICT • 24 periods' },
    ],
    stats: [
      { label: 'Load balanced', value: '91%', trend: '3 teachers over capacity', tone: 'text-amber-600' },
      { label: 'Split classes', value: '5 sync sessions', trend: 'Needs lab assistant' },
      { label: 'Late arrival windows', value: '4 flagged', trend: 'Conflicts with clubs' },
      { label: 'Mentor coverage', value: '100%', trend: 'All classes assigned', tone: 'text-emerald-600' },
    ],
  },
  exam: {
    title: 'Exam & assessment scheduler',
    description: 'Stage CBT, paper exams, and practicals with hall capacity, invigilators, and logistics.',
    entityLabel: 'Exam blocks',
    entities: [
      { id: 'wk6', name: 'Week 6 Reviews', meta: '12 assessments • 3 labs' },
      { id: 'midterm', name: 'Mid-term Exams', meta: '24 papers • 800 candidates' },
      { id: 'practical', name: 'Science Practicals', meta: '8 labs • 5 invigilators' },
    ],
    stats: [
      { label: 'Hall utilization', value: '88%', trend: 'Capacity OK', tone: 'text-emerald-600' },
      { label: 'Invigilator gaps', value: '3 slots', trend: 'Need substitutes', tone: 'text-rose-600' },
      { label: 'CBT terminals ready', value: '145/160', trend: 'Maintenance ongoing' },
      { label: 'Logistics tickets', value: '9 open', trend: '4 transport, 5 power' },
    ],
  },
}

const schedules: Record<TimetableView, ScheduleRow[]> = {
  class: [
    { slot: '08:00 - 08:45', Monday: 'Mathematics • CR2', Tuesday: 'English • CR2', Wednesday: 'Physics • Lab', Thursday: 'Civic • CR2', Friday: 'Mathematics • CR2' },
    { slot: '08:50 - 09:35', Monday: 'Chemistry • Lab', Tuesday: 'Biology • Lab', Wednesday: 'English • CR2', Thursday: 'Mathematics • CR2', Friday: 'Geography • CR2' },
    { slot: '09:40 - 10:25', Monday: 'Economics • CR2', Tuesday: 'Mathematics • CR2', Wednesday: 'Chemistry • Lab', Thursday: 'Physics • Lab', Friday: 'English • CR2' },
    { slot: '10:45 - 11:30', Monday: 'Further Math • CR1', Tuesday: 'ICT • Lab 1', Wednesday: 'Economics • CR2', Thursday: 'Biology • Lab', Friday: 'Mathematics • CR2' },
    { slot: '11:35 - 12:20', Monday: 'English • CR2', Tuesday: 'Geography • CR2', Wednesday: 'Civic • CR2', Thursday: 'Chemistry • Lab', Friday: 'Physics • Lab' },
  ],
  teacher: [
    { slot: '08:00 - 08:45', Monday: 'JSS 2A • Mathematics', Tuesday: 'SS 1C • Mathematics', Wednesday: 'JSS 3B • Mathematics', Thursday: 'SS 2A • Mathematics', Friday: 'JSS 1A • Mathematics' },
    { slot: '08:50 - 09:35', Monday: 'SS 2B • Further Math', Tuesday: 'JSS 2C • Mathematics', Wednesday: 'Planning Window', Thursday: 'SS 1B • Mathematics', Friday: 'PT Conference' },
    { slot: '09:40 - 10:25', Monday: 'JSS 3C • Mathematics', Tuesday: 'Assessment Review', Wednesday: 'SS 1C • Mathematics', Thursday: 'JSS 2A • Mathematics', Friday: 'SS 2A • Further Math' },
    { slot: '10:45 - 11:30', Monday: 'Department Sync', Tuesday: 'SS 2B • Mathematics', Wednesday: 'JSS 1A • Mathematics', Thursday: 'SS 1C • Mathematics', Friday: 'JSS 3B • Mathematics' },
    { slot: '11:35 - 12:20', Monday: 'JSS 2A • Mathematics', Tuesday: 'CBT Prep Duty', Wednesday: 'JSS 2C • Mathematics', Thursday: 'SS 2A • Mathematics', Friday: 'Coaching Clinic' },
  ],
  exam: [
    { slot: '08:00 - 09:30', Monday: 'JSS 3 Mathematics CBT (Lab A)', Tuesday: 'SS 1 English Essay (Hall 2)', Wednesday: 'SS 2 Chemistry Theory (Hall 1)', Thursday: 'JSS 2 Basic Science CBT (Lab B)', Friday: 'Make-up Window' },
    { slot: '10:00 - 11:30', Monday: 'SS 1 Literature (Hall 3)', Tuesday: 'SS 2 Physics Practicals (Lab)', Wednesday: 'CBT Maintenance', Thursday: 'SS 3 Government (Hall 1)', Friday: 'Logistics Hold' },
    { slot: '12:00 - 13:30', Monday: 'CBT Batch 2', Tuesday: 'JSS 2 History (Hall 2)', Wednesday: 'SS 3 Biology Practical', Thursday: 'SS 1 ICT Practical', Friday: 'Result collation' },
    { slot: '14:00 - 15:30', Monday: 'Staff Review', Tuesday: 'Invigilator Briefing', Wednesday: 'Lab Reset', Thursday: 'Generator Maintenance', Friday: 'Resit planning' },
    { slot: '16:00 - 17:30', Monday: 'Evening CBT', Tuesday: 'Logistics buffer', Wednesday: 'Parent updates', Thursday: 'Coaching/Clinics', Friday: 'Close-out' },
  ],
}

const conflictsByView: Record<TimetableView, ConflictItem[]> = {
  class: [
    { id: 'CF-104', type: 'Physics vs Chemistry overlap', owner: 'Science dept.', impact: 'Lab double booking - SS 2A', severity: 'high' },
    { id: 'CF-099', type: 'Advisor clash', owner: 'Guidance team', impact: 'Mrs. Ikpe double scheduled', severity: 'medium' },
    { id: 'CF-088', type: 'Assembly spill', owner: 'Admin office', impact: 'Shortened period Tuesday', severity: 'low' },
  ],
  teacher: [
    { id: 'CF-131', type: 'Prep window breach', owner: 'Academics', impact: 'Mr. Femi lacks planning slot', severity: 'medium' },
    { id: 'CF-129', type: 'Club vs lesson', owner: 'Student life', impact: 'Thursday robotics overlap', severity: 'high' },
  ],
  exam: [
    { id: 'CF-210', type: 'Hall overcapacity', owner: 'Logistics', impact: 'Hall 1 at 125% on Wed', severity: 'high' },
    { id: 'CF-207', type: 'Invigilator shortage', owner: 'HR', impact: 'Need 2 substitutes Friday', severity: 'medium' },
  ],
}

const requestQueue: Record<TimetableView, TimetableRequest[]> = {
  class: [
    { id: 'RQ-501', requester: 'Mrs. Bello', item: 'Swap Civic with History on Thursday', sla: 'Due in 6 hrs', status: 'queued' },
    { id: 'RQ-493', requester: 'Mr. Johnson', item: 'Add lab block for Biology Project', sla: 'Due tomorrow', status: 'in-review' },
    { id: 'RQ-489', requester: 'Sports Lead', item: 'Extend Friday advisory for trials', sla: 'Due today', status: 'approved' },
  ],
  teacher: [
    { id: 'RQ-540', requester: 'Mathematics HOD', item: 'Reduce load for Mr. Femi by 2 periods', sla: 'Due in 1 day', status: 'queued' },
    { id: 'RQ-538', requester: 'ICT Lead', item: 'Share assistants during robotics club', sla: 'Due in 8 hrs', status: 'in-review' },
  ],
  exam: [
    { id: 'RQ-610', requester: 'Exam Office', item: 'Add extra CBT batch for SS 3', sla: 'Due today', status: 'queued' },
    { id: 'RQ-603', requester: 'Logistics', item: 'Shift Physics practical to Lab 3', sla: 'Due tomorrow', status: 'in-review' },
  ],
}

const automationRecipes = [
  { id: 'auto-1', name: 'Auto-detect lab overlaps', detail: 'Scan science arms nightly and reroute to Lab B when conflict threshold > 2' },
  { id: 'auto-2', name: 'Teacher fatigue guardrail', detail: 'Flag schedules with >3 consecutive periods and suggest relief slots' },
  { id: 'auto-3', name: 'Exam logistics prep', detail: 'Lock halls 48h before papers & push checklists to invigilators' },
]

const publishingMilestones = [
  { label: 'Draft complete', value: 80 },
  { label: 'Stakeholder review', value: 55 },
  { label: 'Guardian distribution', value: 25 },
]

const severityColors: Record<Severity, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
}

const statusBadge: Record<RequestStatus, string> = {
  queued: 'bg-slate-100 text-slate-700',
  'in-review': 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
}

interface TimetableSchedulingProps {
  initialView?: TimetableView
}

export function TimetableScheduling({ initialView = 'class' }: TimetableSchedulingProps) {
  const [activeView, setActiveView] = useState<TimetableView>(initialView)
  const [selectedEntity, setSelectedEntity] = useState(() => viewConfigs[initialView].entities[0].id)
  const [weekOffset, setWeekOffset] = useState(0)

  const config = viewConfigs[activeView]

  const visibleSchedule = useMemo(() => schedules[activeView], [activeView])
  const conflicts = useMemo(() => conflictsByView[activeView], [activeView])
  const requests = useMemo(() => requestQueue[activeView], [activeView])

  const handleViewChange = (view: TimetableView) => {
    setActiveView(view)
    setSelectedEntity(viewConfigs[view].entities[0].id)
    setWeekOffset(0)
  }

  const weekLabel = weekOffset === 0 ? 'Current week' : weekOffset > 0 ? `Week +${weekOffset}` : `Week ${weekOffset}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Timetable & Scheduling</h1>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync updates
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" /> Send preview
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['class', 'teacher', 'exam'] as TimetableView[]).map((view) => (
          <Button
            key={view}
            variant={activeView === view ? 'default' : 'outline'}
            onClick={() => handleViewChange(view)}
            className={activeView === view ? 'bg-blue-600 text-white' : ''}
          >
            {view === 'class' && 'Class view'}
            {view === 'teacher' && 'Teacher view'}
            {view === 'exam' && 'Exam view'}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {config.stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              <p className={`text-xs mt-1 ${stat.tone ?? 'text-gray-500'}`}>{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>Select {config.entityLabel.toLowerCase()} to preview allocations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset((prev) => prev - 1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[120px] rounded-full border border-gray-200 px-4 py-1 text-sm text-gray-700 flex items-center justify-center">
              {weekLabel}
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset((prev) => prev + 1)}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {config.entities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => setSelectedEntity(entity.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedEntity === entity.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{entity.name}</p>
                <p className="text-xs text-gray-500 mt-1">{entity.meta}</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Time slot</TableHead>
                  {dayHeaders.map((day) => (
                    <TableHead key={day} className="text-center">{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSchedule.map((row) => (
                  <TableRow key={row.slot}>
                    <TableCell className="font-medium text-gray-900">{row.slot}</TableCell>
                    {dayHeaders.map((day) => (
                      <TableCell key={day} className="text-sm text-gray-700">
                        {row[day as DayName]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-gray-500">Showing draft grid for {config.entityLabel.slice(0, -1)}: {selectedEntity.toUpperCase()}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Conflict watchlist
            </CardTitle>
            <CardDescription>Auto-detected overlaps grouped by owner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="flex items-start gap-4 rounded-xl border border-gray-200 p-3">
                <Badge className={`uppercase text-[10px] ${severityColors[conflict.severity]}`}>{conflict.severity}</Badge>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{conflict.type}</p>
                  <p className="text-xs text-gray-500">{conflict.impact}</p>
                  <p className="text-xs text-gray-400 mt-1">Owner: {conflict.owner}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-blue-600">
                  Open playbook
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock4 className="h-5 w-5 text-blue-600" />
              Change request queue
            </CardTitle>
            <CardDescription>Prioritize swaps & approvals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-gray-900">{request.item}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${statusBadge[request.status]}`}>{request.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Requested by {request.requester}</p>
                <p className="text-xs text-amber-600 mt-1">{request.sla}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full text-sm">
              View workflow board
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Automation recipes
            </CardTitle>
            <CardDescription>Let the scheduler run proactive guardrails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {automationRecipes.map((recipe) => (
              <div key={recipe.id} className="rounded-xl border border-gray-200 p-3">
                <p className="font-semibold text-gray-900">{recipe.name}</p>
                <p className="text-xs text-gray-500 mt-1">{recipe.detail}</p>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Active</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              Publishing milestones
            </CardTitle>
            <CardDescription>Measure readiness before guardians receive schedules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {publishingMilestones.map((milestone) => (
              <div key={milestone.label}>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-gray-900">{milestone.label}</p>
                  <span className="text-xs text-gray-500">{milestone.value}%</span>
                </div>
                <Progress value={milestone.value} className="mt-2" />
              </div>
            ))}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
              <p className="font-semibold">Ready to publish?</p>
              <p className="text-xs text-blue-600 mt-1">Notify guardians once draft hits 95% readiness and conflicts are cleared.</p>
              <Button className="mt-3 w-full" variant="default">
                <Users className="h-4 w-4 mr-2" /> Send guardian preview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default TimetableScheduling;
