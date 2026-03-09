import React from 'react'
import { Layers, GraduationCap, ShieldCheck, BookText, Sparkles, Clock3, TrendingUp, Building, Target, GitMerge, Megaphone } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

const structureMetrics = [
  {
    label: 'Academic Programs',
    value: '3',
    detail: 'Primary • Junior • Senior',
    icon: Layers,
    color: 'text-blue-600',
  },
  {
    label: 'Departments',
    value: '12',
    detail: 'STEM focus at 44% share',
    icon: Building,
    color: 'text-amber-600',
  },
  {
    label: 'Streams & Arms',
    value: '46',
    detail: '+6 new arms in 2026',
    icon: GraduationCap,
    color: 'text-emerald-600',
  },
  {
    label: 'Compliance health',
    value: '97%',
    detail: 'All policies aligned',
    icon: ShieldCheck,
    color: 'text-purple-600',
  },
]

const quickActions = [
  {
    title: 'Launch a new stream',
    description: 'Clone timetables, allocate teachers, sync enrollment caps.',
    badge: 'Popular',
    icon: GitMerge,
  },
  {
    title: 'Rebalance subject load',
    description: 'Shift electives between arms to meet class-size policy.',
    icon: Target,
  },
  {
    title: 'Publish term brief',
    description: 'Notify parents and staff with curriculum updates.',
    icon: Megaphone,
  },
]

const changeLog = [
  {
    title: 'STEM innovation cluster',
    owner: 'Academics Board',
    impact: 'Applies to SS1-SS3',
    status: 'Awaiting Approval',
    severity: 'warning',
  },
  {
    title: 'New language immersion arm',
    owner: 'Curriculum Office',
    impact: 'JSS 2 French stream',
    status: 'Scheduled',
    severity: 'info',
  },
  {
    title: 'Merge Arts Arm B & C',
    owner: 'Principal',
    impact: 'Capacity update required',
    status: 'In review',
    severity: 'risk',
  },
]

const complianceWatch = [
  {
    label: 'Curriculum versioning',
    detail: '2026 curriculum freeze closes in 9 days.',
    severity: 'warning',
  },
  {
    label: 'Accreditation sync',
    detail: 'IB inspection files synced.',
    severity: 'good',
  },
  {
    label: 'Curriculum variance',
    detail: 'Two electives lacking scheme of work upload.',
    severity: 'attention',
  },
]

export function AcademicStructureOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Academic control center</p>
          <h1 className="text-2xl font-bold text-gray-900">Academic structure</h1>
          <p className="text-sm text-gray-600">Orchestrate levels, subjects, and policies powering Scholix experiences.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Clock3 className="h-4 w-4 mr-2" /> Plan session changeover
          </Button>
          <Button>
            <Sparkles className="h-4 w-4 mr-2" /> Add new program
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {structureMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="p-4 space-y-2">
                <div className={`rounded-full bg-gray-50 w-10 h-10 flex items-center justify-center ${metric.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{metric.label}</p>
                <p className="text-3xl font-semibold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.detail}</p>
              </CardContent>
            </Card>
          )
        })}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Session health</p>
            <div className="flex items-center gap-4">
              <div
                className="relative w-20 h-20 rounded-full"
                style={{
                  background: 'conic-gradient(#2563eb 0deg, #2563eb 240deg, #e2e8f0 240deg)'
                }}
              >
                <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-900">86%</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span>Curriculum ready</span>
                  <span className="text-gray-900 font-medium">43 schools</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Pending audits</span>
                  <span className="text-amber-600 font-medium">7</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Blocked</span>
                  <span className="text-rose-600 font-medium">2</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Change pipeline</CardTitle>
            <CardDescription>Structural requests routed through governance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {changeLog.map((change) => (
              <div key={change.title} className="rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{change.title}</p>
                  <p className="text-xs text-gray-500">{change.owner}</p>
                  <p className="text-xs text-gray-400 mt-1">{change.impact}</p>
                </div>
                <Badge
                  variant={
                    change.severity === 'risk'
                      ? 'destructive'
                      : change.severity === 'warning'
                      ? 'warning'
                      : 'default'
                  }
                  className="text-xs"
                >
                  {change.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance signals</CardTitle>
            <CardDescription>Automated guardrails syncing with regulators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {complianceWatch.map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                <div
                  className={`mt-3 h-1.5 rounded-full ${
                    item.severity === 'good'
                      ? 'bg-emerald-500/50'
                      : item.severity === 'warning'
                      ? 'bg-amber-500/60'
                      : 'bg-rose-500/60'
                  }`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump to the most requested workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <div key={action.title} className="rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  {action.icon ? <action.icon className="h-5 w-5" /> : <BookText className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                    {action.badge && <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{action.badge}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{action.description}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Runs automation across timetable + notifications.</p>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  Start
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategic focus</CardTitle>
            <CardDescription>Analytics blended from attendance, results, and staffing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Curriculum readiness</span>
                <span>86%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: '86%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Teacher coverage</span>
                <span>91%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: '91%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Assessment calibration</span>
                <span>74%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: '74%' }} />
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-gray-200 p-4 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">AI recommendations ready</p>
                <p className="text-xs text-gray-500">3 suggestions for timetable compression and class merging.</p>
              </div>
              <Button size="sm" variant="outline">Review</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default AcademicStructureOverview;
