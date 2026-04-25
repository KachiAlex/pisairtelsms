import React from 'react'
import { Grid, Download, Filter, Search, AlertCircle, Users, UserCheck, Printer, Share2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Progress } from '../ui/progress'

const cohortSummary = [
  { cohort: 'JSS 2', status: 'Ready', lastSynced: 'Today 08:05', completeness: 96 },
  { cohort: 'SS 1 Science', status: 'Pending QA', lastSynced: 'Yesterday 21:14', completeness: 82 },
  { cohort: 'Primary 5', status: 'Draft', lastSynced: 'Today 07:50', completeness: 64 },
]

const studentRankings = [
  { name: 'Aisha Bello', className: 'JSS 2A', avg: 88.4, position: 1, delta: '+1' },
  { name: 'Victor Hassan', className: 'JSS 2C', avg: 87.9, position: 2, delta: '-1' },
  { name: 'Chioma Nnaji', className: 'JSS 2B', avg: 86.1, position: 3, delta: '+2' },
  { name: 'Ugo Obi', className: 'JSS 2D', avg: 85.8, position: 4, delta: '-2' },
]

const anomalyFlags = [
  { id: 'AN-451', label: 'CA total mismatch (Home Economics)', owner: 'QA Desk', status: 'Investigating' },
  { id: 'AN-448', label: 'Missing practical score (Physics)', owner: 'Science HOD', status: 'Awaiting data' },
]

const filterBadges = ['All cohorts', 'JSS 2', 'SS 1', 'Primary']

export function Broadsheets() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Academic intelligence</p>
          <h1 className="text-2xl font-bold text-gray-900">Broadsheets</h1>
          <p className="text-sm text-gray-600">Manage class rankings, distribute printable grids, and surface anomalies before release.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" /> Saved views
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" /> Export selected
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Broadsheets ready</p>
            <p className="text-3xl font-semibold text-gray-900">6 cohorts</p>
            <p className="text-xs text-gray-500">Out of 10 active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pending QA fixes</p>
            <p className="text-3xl font-semibold text-rose-600">4 issues</p>
            <p className="text-xs text-gray-500">2 blocking publishing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Distribution requests</p>
            <p className="text-3xl font-semibold text-gray-900">18</p>
            <p className="text-xs text-gray-500">Email + portal share</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Print batches</p>
            <p className="text-3xl font-semibold text-gray-900">3 queued</p>
            <p className="text-xs text-gray-500">Next pickup at 2 PM</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Cohort readiness</CardTitle>
            <CardDescription>Progress towards signed-off broadsheets across arms.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterBadges.map((label) => (
              <Badge key={label} variant={label === 'All cohorts' ? 'default' : 'secondary'}>
                {label}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {cohortSummary.map((cohort) => (
            <div key={cohort.cohort} className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-gray-900">{cohort.cohort}</p>
                <p className="text-sm text-gray-500">Last synced {cohort.lastSynced}</p>
              </div>
              <div className="w-full sm:w-1/2">
                <Progress value={cohort.completeness} />
                <p className="text-xs text-gray-500 mt-1">{cohort.completeness}% completeness</p>
              </div>
              <Badge variant={cohort.status === 'Ready' ? 'default' : cohort.status === 'Pending QA' ? 'warning' : 'secondary'}>
                {cohort.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Top performers snapshot</CardTitle>
              <CardDescription>Rankings update each time computation completes.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search student" className="w-48" />
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4 mr-2" /> Advanced filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Δ from last cycle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRankings.map((student) => (
                  <TableRow key={student.name}>
                    <TableCell className="font-medium text-gray-900">#{student.position}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.className}</TableCell>
                    <TableCell>{student.avg}%</TableCell>
                    <TableCell>
                      <Badge variant={student.delta.startsWith('+') ? 'default' : 'secondary'}>{student.delta}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anomaly watch</CardTitle>
            <CardDescription>Anything flagged here pauses export until resolved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalyFlags.map((flag) => (
              <div key={flag.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{flag.label}</p>
                  <Badge variant="warning">{flag.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">Owner: {flag.owner}</p>
                <p className="text-xs text-gray-400">Ref: {flag.id}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <AlertCircle className="h-4 w-4 mr-2" /> View anomaly log
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Distribution channels</CardTitle>
            <CardDescription>Push cohorts to stakeholders with tailored templates.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            <Share2 className="h-4 w-4 mr-2" /> Manage recipients
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <Users className="h-4 w-4" /> Parent portal
            </div>
            <p className="text-sm text-gray-500">Auto sync once principal approves.</p>
            <Badge variant="default" className="mt-2">Ready</Badge>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <Printer className="h-4 w-4" /> Print house
            </div>
            <p className="text-sm text-gray-500">Batch 12 in progress.</p>
            <Badge variant="warning" className="mt-2">Processing</Badge>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <UserCheck className="h-4 w-4" /> Internal staff
            </div>
            <p className="text-sm text-gray-500">Guidance counselors notified.</p>
            <Badge variant="secondary" className="mt-2">Queued</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        <div className="flex items-center gap-3">
          <Grid className="h-5 w-5" />
          <p>Need sectional broadsheets for PTA review? Spin up a filtered export with comments in under 60 seconds.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Preview</Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" /> Generate PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
export default Broadsheets;
