import React from 'react'
import {
  Users,
  Briefcase,
  UserPlus,
  ClipboardCheck,
  Clock4,
  AlertTriangle,
  Shield,
  Award,
  TrendingUp,
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

const summaryStats = [
  {
    label: 'Total staff',
    value: '186',
    detail: '+4 offers out',
    tone: 'text-blue-600',
    icon: Users,
  },
  {
    label: 'Open roles',
    value: '11',
    detail: '3 critical hires',
    tone: 'text-amber-600',
    icon: Briefcase,
  },
  {
    label: 'Onboarding today',
    value: '6',
    detail: '14-day SLA',
    tone: 'text-emerald-600',
    icon: UserPlus,
  },
  {
    label: 'Leave in progress',
    value: '23',
    detail: 'Peak: next week',
    tone: 'text-purple-600',
    icon: Clock4,
  },
]

const headcountDistribution = [
  { label: 'Academics', value: 96 },
  { label: 'Student Life', value: 28 },
  { label: 'Operations', value: 24 },
  { label: 'Support', value: 22 },
  { label: 'Leadership', value: 16 },
]

const onboardingPipeline = [
  {
    name: 'Ngozi Bello',
    role: 'Chemistry Instructor',
    status: 'Laptop provisioning',
    due: 'Today',
    owner: 'IT Service Desk',
  },
  {
    name: 'Tosin Adeyemi',
    role: 'Student Life Coordinator',
    status: 'Background check',
    due: 'In 3 days',
    owner: 'HR Ops',
  },
  {
    name: 'David Okeke',
    role: 'Security Supervisor',
    status: 'Orientation walkthrough',
    due: 'Tomorrow',
    owner: 'Facilities',
  },
]

const leaveCalendar = [
  { name: 'Mrs. Aminat Bayo', dept: 'Biology', type: 'Maternity', span: 'Feb 10 - Apr 30', coverage: 'Mr. Gbenga' },
  { name: 'Mr. Chinedu Obasi', dept: 'Physics', type: 'Study', span: 'Mar 1 - Mar 30', coverage: 'Ms. Ada' },
  { name: 'Coach Ife Adamu', dept: 'Sports', type: 'Annual', span: 'Feb 20 - Mar 5', coverage: 'Coach Bala' },
]

const performanceFocus = [
  { pillar: 'Instructional delivery', status: 'On track', score: 78 },
  { pillar: 'Culture & discipline', status: 'Needs action', score: 62 },
  { pillar: 'Ops compliance', status: 'Ahead', score: 85 },
]

const complianceItems = [
  { id: 'CMP-104', item: 'Safeguarding training', owners: 'All staff', progress: 72 },
  { id: 'CMP-098', item: 'First aid recertification', owners: 'Labs & Sports', progress: 54 },
  { id: 'CMP-091', item: 'Whistleblower attestation', owners: 'Leadership', progress: 93 },
]

const incidentLog = [
  {
    id: 'INC-207',
    category: 'Conduct',
    detail: 'Teacher tardiness escalation for SS 1C',
    owner: 'Academics',
    status: 'Under review',
  },
  {
    id: 'INC-193',
    category: 'Risk',
    detail: 'Transport assistant safety refresher',
    owner: 'HR Ops',
    status: 'Actioned',
  },
]

const statusColorMap: Record<string, string> = {
  'Under review': 'bg-amber-100 text-amber-700',
  Actioned: 'bg-emerald-100 text-emerald-700',
}

export function StaffHR() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Tenant HR</p>
          <h1 className="text-2xl font-bold text-gray-900">Staff & HR workspace</h1>
          <p className="text-sm text-gray-600">Monitor hiring, onboarding flows, leave coverage, and compliance guardrails.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" /> Issue offer
          </Button>
          <Button variant="outline">
            <ClipboardCheck className="h-4 w-4 mr-2" /> Bulk approvals
          </Button>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" /> Publish headcount report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.tone}`}>{stat.detail}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Onboarding runway</CardTitle>
            <CardDescription>Track new hires through provisioning milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {onboardingPipeline.map((hire) => (
              <div key={hire.name} className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{hire.name}</p>
                    <p className="text-xs text-gray-500">{hire.role}</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {hire.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Due: {hire.due}</span>
                  <span>Owner: {hire.owner}</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full text-sm">
              View onboarding board
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Headcount mix</CardTitle>
            <CardDescription>Departmental allocation snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {headcountDistribution.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <span className="text-xs text-gray-500">{item.value}%</span>
                </div>
                <Progress value={item.value} className="mt-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave & coverage planner</CardTitle>
            <CardDescription>Ensure no classes are unattended</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaveCalendar.map((leave) => (
              <div key={leave.name} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-gray-900">{leave.name}</p>
                  <Badge variant="outline" className="text-xs">{leave.type}</Badge>
                </div>
                <p className="text-xs text-gray-500">{leave.dept}</p>
                <p className="text-xs text-gray-600 mt-2">{leave.span}</p>
                <p className="text-xs text-emerald-700">Coverage: {leave.coverage}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance focus</CardTitle>
            <CardDescription>Live view of review cycle guardrails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceFocus.map((item) => (
              <div key={item.pillar} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.pillar}</p>
                    <p className="text-xs text-gray-500">{item.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{item.score}%</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      Goal 85%
                    </Badge>
                  </div>
                </div>
                <Progress value={item.score} className="mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Compliance campaigns
            </CardTitle>
            <CardDescription>Automated attestations & training</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {complianceItems.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-semibold text-gray-900">{item.item}</p>
                <p className="text-xs text-gray-500">{item.owners}</p>
                <Progress value={item.progress} className="mt-2" />
                <p className="mt-1 text-xs text-gray-400">{item.progress}% complete</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Recognition queue
            </CardTitle>
            <CardDescription>Nomination and kudos backlog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold text-gray-900">STEM Excellence Spotlight</p>
              <p className="text-xs text-gray-500">Voting closes in 2 days</p>
              <Button variant="ghost" size="sm" className="text-blue-600 mt-2">
                Review nominations
              </Button>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="font-semibold text-gray-900">Guardian kudos feed</p>
              <p className="text-xs text-gray-500">12 shout-outs pending verification</p>
              <Button variant="ghost" size="sm" className="text-blue-600 mt-2">
                Moderate feed
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Incident log
            </CardTitle>
            <CardDescription>Keep tabs on HR escalations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidentLog.map((incident) => (
              <div key={incident.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{incident.id}</p>
                  <Badge className="bg-slate-100 text-slate-700">{incident.category}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{incident.detail}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Owner: {incident.owner}</span>
                  <span className={`px-2 py-0.5 rounded-full ${statusColorMap[incident.status]}`}>{incident.status}</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full text-sm">
              Open escalation center
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default StaffHR;
