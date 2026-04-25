import React, { useEffect, useState } from 'react'
import {
  Activity,
  HeartPulse,
  ShieldCheck,
  Thermometer,
  CalendarCheck,
  AlertTriangle,
  ClipboardList,
  Stethoscope,
  Clock3,
  Plus,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { fetchStudentHealth, StudentHealthPayload } from '../../lib/studentHealthClient'
import { useToast } from '../ui/use-toast'

const mockHealthPayload: StudentHealthPayload = {
  summaryStats: [
  {
    label: 'Pending screenings',
    value: '37',
    detail: '14 due this week',
    tone: 'text-amber-600',
    icon: <Stethoscope className="h-4 w-4" />,
  },
  {
    label: 'Active counseling cases',
    value: '18',
    detail: '6 high priority',
    tone: 'text-rose-600',
    icon: <HeartPulse className="h-4 w-4" />,
  },
  {
    label: 'High-risk alerts',
    value: '9',
    detail: '3 medical • 6 wellness',
    tone: 'text-red-500',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    label: 'Incidents cleared (30d)',
    value: '24',
    detail: '78% resolved < 48h',
    tone: 'text-emerald-600',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  ],
  screeningQueue: [
  {
    student: 'Favour Nwachukwu',
    cohort: 'JSS 2A',
    type: 'Vision screening',
    due: 'Tomorrow • 09:00',
    owner: 'Health office',
    status: 'Scheduled',
  },
  {
    student: 'Ifeanyi Adamu',
    cohort: 'SS 1C',
    type: 'Dental check',
    due: 'Thu • 11:30',
    owner: 'Partner clinic',
    status: 'Awaiting transport',
  },
  {
    student: 'Bola Ajayi',
    cohort: 'SS 2B',
    type: 'Sickle cell panel',
    due: 'Fri • 14:00',
    owner: 'Nurse Aminat',
    status: 'Prep labs',
  },
  ],
  counselingPipeline: [
  {
    stage: 'Intake',
    color: 'border-sky-200 bg-sky-50',
    cases: [
      { student: 'Miriam Adedeji', topic: 'Boarding adjustment', owner: 'Counselor Doyin', nextStep: 'First session Thu' },
    ],
  },
  {
    stage: 'In session',
    color: 'border-purple-200 bg-purple-50',
    cases: [
      { student: 'Ibrahim Sule', topic: 'Exam anxiety', owner: 'Counselor Ada', nextStep: 'Session 3 today' },
      { student: 'Ezinne Okoro', topic: 'Peer conflict', owner: 'Counselor Mayowa', nextStep: 'Joint session Fri' },
    ],
  },
  {
    stage: 'Action plan',
    color: 'border-amber-200 bg-amber-50',
    cases: [
      { student: 'Samuel Bassey', topic: 'Attendance recovery', owner: 'Counselor Toyin', nextStep: 'Parent call pending' },
    ],
  },
  {
    stage: 'Closed',
    color: 'border-emerald-200 bg-emerald-50',
    cases: [
      { student: 'Sarah Gyang', topic: 'Medical leave reintegration', owner: 'Counselor Titi', nextStep: 'Monitor grades' },
    ],
  },
  ],
  incidentFeed: [
  {
    title: 'Asthma alert triggered',
    student: 'Halima Musa',
    time: '25 mins ago',
    detail: 'Rescue inhaler used, parents notified.',
    severity: 'High',
  },
  {
    title: 'Dorm wellness check',
    student: 'SS 1B cohort',
    time: 'Today • 08:00',
    detail: 'Hydration + lights-out compliance verified.',
    severity: 'Low',
  },
  {
    title: 'Counseling escalation',
    student: 'David Ojo',
    time: 'Yesterday • 18:15',
    detail: 'Referred to external therapist for continued care.',
    severity: 'Critical',
  },
  ],
  wellnessTasks: [
  { task: 'Send sickle-cell reminder to SS2 boarding parents', owner: 'Health office', due: 'Today', status: 'Pending' },
  { task: 'Upload counselor session notes for Musa Ibrahim', owner: 'Counselor Ada', due: 'Tomorrow', status: 'In progress' },
  { task: 'Review allergy action plans (Primary intake)', owner: 'Nurse Aminat', due: 'Fri', status: 'Pending' },
  { task: 'Escalate chronic absenteeism case to Academics', owner: 'Counselor Doyin', due: 'Mon', status: 'Ready' },
  ],
}

export function StudentHealth() {
  const [isScreeningOpen, setIsScreeningOpen] = useState(false)
  const [isIncidentOpen, setIsIncidentOpen] = useState(false)
  const [healthData, setHealthData] = useState<StudentHealthPayload>(mockHealthPayload)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [screeningForm, setScreeningForm] = useState({
    student: '',
    screeningType: 'Vision screening',
    dueDate: '',
    owner: '',
    notes: '',
  })
  const [incidentForm, setIncidentForm] = useState({
    student: '',
    type: 'Medical',
    severity: 'Low',
    location: '',
    notes: '',
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadHealthData() {
      setIsLoading(true)
      try {
        const payload = await fetchStudentHealth(controller.signal)
        setHealthData(payload)
        setError(null)
      } catch (err) {
        console.warn('Falling back to mock health payload', err)
        setHealthData(mockHealthPayload)
        setError(err instanceof Error ? err.message : 'Unable to fetch health dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadHealthData()
    return () => controller.abort()
  }, [])

  const { summaryStats, screeningQueue, counselingPipeline, incidentFeed, wellnessTasks } = healthData

  const resetScreeningForm = () =>
    setScreeningForm({ student: '', screeningType: 'Vision screening', dueDate: '', owner: '', notes: '' })

  const resetIncidentForm = () =>
    setIncidentForm({ student: '', type: 'Medical', severity: 'Low', location: '', notes: '' })

  const handleScreeningSubmit = () => {
    toast({ title: 'Screening scheduled', description: 'Placeholder submission captured locally.' })
    setIsScreeningOpen(false)
    resetScreeningForm()
  }

  const handleIncidentSubmit = () => {
    toast({ title: 'Incident logged', description: 'Workflow hook will notify guardians when wired.' })
    setIsIncidentOpen(false)
    resetIncidentForm()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Wellness</p>
          <h1 className="text-2xl font-bold text-gray-900">Health & wellness tracker</h1>
          <p className="text-sm text-gray-600">
            Monitor screenings, counseling, and safeguarding incidents across every cohort.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsIncidentOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" /> Log incident
          </Button>
          <Button onClick={() => setIsScreeningOpen(true)}>
            <CalendarCheck className="h-4 w-4 mr-2" /> Schedule screening
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-xs text-gray-500">Loading latest health & wellness data…</p>}
      {error && (
        <p className="text-xs text-rose-600">
          Unable to fetch live data ({error}). Displaying cached mock dataset.
        </p>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2 text-gray-600">
                  {stat.icon}
                  {stat.label}
                </div>
                <span className={`font-medium ${stat.tone}`}>{stat.detail}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Stethoscope className="h-4 w-4 text-blue-600" /> Screening compliance
            </CardTitle>
            <CardDescription>Upcoming health screenings and tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {screeningQueue.map((item) => (
              <div key={item.student} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.student}</p>
                  <p className="text-xs text-gray-500">{item.cohort} • {item.type}</p>
                </div>
                <div className="text-xs text-gray-600">
                  <p className="font-medium text-gray-900">{item.due}</p>
                  <p>{item.owner}</p>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" className="w-full text-blue-600">
              Open screening calendar
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-purple-600" /> Counselor pipeline
            </CardTitle>
            <CardDescription>Track sessions across stages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {counselingPipeline.map((column) => (
              <div key={column.stage} className={`rounded-2xl border ${column.color} p-3 space-y-2`}>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span>{column.stage}</span>
                  <Badge variant="secondary">{column.cases.length}</Badge>
                </div>
                {column.cases.map((caseItem) => (
                  <div key={caseItem.student} className="rounded-xl bg-white/80 p-3 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900">{caseItem.student}</p>
                    <p className="text-xs text-gray-500">{caseItem.topic}</p>
                    <p className="text-xs text-gray-600">Owner: {caseItem.owner}</p>
                    <p className="text-xs text-blue-700 mt-1">{caseItem.nextStep}</p>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-rose-600" /> Incident & safeguarding feed
            </CardTitle>
            <CardDescription>Latest alerts requiring follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {incidentFeed.map((incident) => (
              <div key={incident.title} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{incident.title}</p>
                    <p className="text-xs text-gray-500">{incident.student} • {incident.time}</p>
                  </div>
                  <Badge variant="outline">{incident.severity}</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">{incident.detail}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline">
                    Acknowledge
                  </Button>
                  <Button size="sm">
                    Escalate
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Thermometer className="h-4 w-4 text-emerald-600" /> Wellness task board
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            {wellnessTasks.map((task) => (
              <div key={task.task} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{task.task}</p>
                <p className="text-xs text-gray-500">Owner: {task.owner}</p>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span>{task.due}</span>
                  <Badge variant="outline">{task.status}</Badge>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-blue-600">
              View full task list
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isScreeningOpen}
        onOpenChange={(open) => {
          setIsScreeningOpen(open)
          if (!open) resetScreeningForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule screening</DialogTitle>
            <DialogDescription>
              Placeholder form for setting up medical screenings. Wire to API once backend is ready.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="screening-student">Student name</Label>
              <Input
                id="screening-student"
                placeholder="e.g., Halima Musa"
                value={screeningForm.student}
                onChange={(event) => setScreeningForm((prev) => ({ ...prev, student: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="screening-type">Screening type</Label>
              <select
                id="screening-type"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={screeningForm.screeningType}
                onChange={(event) => setScreeningForm((prev) => ({ ...prev, screeningType: event.target.value }))}
              >
                {['Vision screening', 'Dental check', 'Sickle cell panel', 'Medical clearance'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="screening-due">Due date & time</Label>
              <Input
                id="screening-due"
                type="datetime-local"
                value={screeningForm.dueDate}
                onChange={(event) => setScreeningForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="screening-owner">Owner</Label>
              <Input
                id="screening-owner"
                placeholder="Health office / Nurse / Clinic"
                value={screeningForm.owner}
                onChange={(event) => setScreeningForm((prev) => ({ ...prev, owner: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="screening-notes">Notes</Label>
              <textarea
                id="screening-notes"
                className="min-h-[90px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Add preparation steps or guardian comms"
                value={screeningForm.notes}
                onChange={(event) => setScreeningForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsScreeningOpen(false)
                resetScreeningForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleScreeningSubmit} disabled={!screeningForm.student || !screeningForm.dueDate}>
              Save placeholder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isIncidentOpen}
        onOpenChange={(open) => {
          setIsIncidentOpen(open)
          if (!open) resetIncidentForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log health or safeguarding incident</DialogTitle>
            <DialogDescription>
              Collect incident details, assign owners, and notify guardians when workflow is wired up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="incident-student">Student</Label>
              <Input
                id="incident-student"
                placeholder="Student name"
                value={incidentForm.student}
                onChange={(event) => setIncidentForm((prev) => ({ ...prev, student: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-type">Incident type</Label>
              <select
                id="incident-type"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={incidentForm.type}
                onChange={(event) => setIncidentForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                {['Medical', 'Counseling', 'Safeguarding', 'Disciplinary'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-severity">Severity</Label>
              <select
                id="incident-severity"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={incidentForm.severity}
                onChange={(event) => setIncidentForm((prev) => ({ ...prev, severity: event.target.value }))}
              >
                {['Low', 'Medium', 'High', 'Critical'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-location">Location</Label>
              <Input
                id="incident-location"
                placeholder="Dormitory, classroom, clinic..."
                value={incidentForm.location}
                onChange={(event) => setIncidentForm((prev) => ({ ...prev, location: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-notes">Summary / next steps</Label>
              <textarea
                id="incident-notes"
                className="min-h-[120px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Record what happened and the immediate plan"
                value={incidentForm.notes}
                onChange={(event) => setIncidentForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsIncidentOpen(false)
                resetIncidentForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleIncidentSubmit} disabled={!incidentForm.student || !incidentForm.location}>
              Submit placeholder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default StudentHealth;
