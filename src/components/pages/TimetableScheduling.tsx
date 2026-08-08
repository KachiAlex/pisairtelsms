import React, { useEffect, useMemo, useState } from 'react'
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
  Settings,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { tenantApiGet } from '../../lib/tenantApi'
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
import { ConfigureTab } from './timetable/ConfigureTab'
import { ClassTimetableTab } from './timetable/ClassTimetableTab'
import { TeacherTimetableTab } from './timetable/TeacherTimetableTab'
import { ExamScheduleTab } from './timetable/ExamScheduleTab'

const dayHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

type DayName = (typeof dayHeaders)[number]
type TimetableView = 'configure' | 'class' | 'teacher' | 'exam'

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
  configure: { title: 'Timetable configuration', description: 'Set up calendars, time slots, and academic terms.', entityLabel: 'Configuration', entities: [], stats: [] },
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
  configure: [],
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
  configure: [],
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
  configure: [],
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
  const [selectedEntity, setSelectedEntity] = useState(() => {
    const cfg = viewConfigs[initialView as Exclude<TimetableView, 'configure'>]
    return cfg ? cfg.entities[0].id : ''
  })
  const [weekOffset, setWeekOffset] = useState(0)
  const [liveConflicts, setLiveConflicts] = useState<ConflictItem[]>([])
  const [liveRequests, setLiveRequests] = useState<TimetableRequest[]>([])
  const [publishStatus, setPublishStatus] = useState<{
    readinessPct?: number
    openConflicts?: number
    classScheduleCount?: number
    lastPublishedAt?: string | null
    canPublish?: boolean
  }>({})

  const config = activeView !== 'configure' ? viewConfigs[activeView as Exclude<TimetableView, 'configure'>] : null

  const visibleSchedule = useMemo(() => activeView !== 'configure' ? schedules[activeView as Exclude<TimetableView, 'configure'>] : [], [activeView])

  useEffect(() => {
    async function fetchLiveData() {
      try {
        const [conflictsRes, requestsRes, publishRes] = await Promise.all([
          tenantApiGet('/api/tenant/timetable/conflicts?status=open'),
          tenantApiGet('/api/tenant/timetable/change-requests'),
          tenantApiGet('/api/tenant/timetable/publish'),
        ])
        const conflictsData = await conflictsRes.json()
        const requestsData = await requestsRes.json()
        const publishData = await publishRes.json()
        const rawConflicts = Array.isArray(conflictsData.data) ? conflictsData.data : []
        const rawRequests = Array.isArray(requestsData.data) ? requestsData.data : []
        setLiveConflicts(rawConflicts.map((c: { id: string; conflictType: string; owner: string; impact: string; severity: Severity }) => ({
          id: c.id, type: c.conflictType, owner: c.owner, impact: c.impact, severity: c.severity,
        })))
        setLiveRequests(rawRequests.map((r: { id: string; requesterName: string; changeDescription: string; sla: string; status: RequestStatus }) => ({
          id: r.id, requester: r.requesterName, item: r.changeDescription, sla: r.sla, status: r.status,
        })))
        setPublishStatus(publishData.data || {})
      } catch {
        // fall back to hardcoded data silently
      }
    }
    fetchLiveData()
  }, [activeView])

  const conflicts = liveConflicts.length > 0 ? liveConflicts : (activeView !== 'configure' ? conflictsByView[activeView as Exclude<TimetableView, 'configure'>] : [])
  const requests = liveRequests.length > 0 ? liveRequests : (activeView !== 'configure' ? requestQueue[activeView as Exclude<TimetableView, 'configure'>] : [])

  const handleViewChange = (view: TimetableView) => {
    setActiveView(view)
    if (view !== 'configure') {
      setSelectedEntity(viewConfigs[view as Exclude<TimetableView, 'configure'>].entities[0].id)
    }
    setWeekOffset(0)
  }

  const weekLabel = weekOffset === 0 ? 'Current week' : weekOffset > 0 ? `Week +${weekOffset}` : `Week ${weekOffset}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Timetable & Scheduling</h1>
          <p className="text-sm text-gray-600">{config?.description}</p>
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
        {(['configure', 'class', 'teacher', 'exam'] as TimetableView[]).map((view) => (
          <Button
            key={view}
            variant={activeView === view ? 'default' : 'outline'}
            onClick={() => handleViewChange(view)}
            className={activeView === view ? 'bg-blue-600 text-white' : ''}
          >
            {view === 'configure' && <><Settings className="h-4 w-4 mr-2" />Configure</>}
            {view === 'class' && 'Class view'}
            {view === 'teacher' && 'Teacher view'}
            {view === 'exam' && 'Exam view'}
          </Button>
        ))}
      </div>

      {activeView === 'configure' && <ConfigureTab />}

      {activeView === 'class' && <ClassTimetableTab />}

      {activeView === 'teacher' && <TeacherTimetableTab />}

      {activeView === 'exam' && <ExamScheduleTab />}
    </div>
  )
}
export default TimetableScheduling;
