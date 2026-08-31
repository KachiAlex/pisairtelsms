import React from 'react'
import { BookOpen, RefreshCcw, Link2, GraduationCap, AlertTriangle, CloudDownload, Radio, Shield, Wand2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const connectorCatalog = [
  { id: 'Google Classroom', status: 'Connected', sync: 'Every 15 mins', courses: 42, lastSync: '06:10 AM' },
  { id: 'Canvas', status: 'Drift', sync: 'Manual', courses: 18, lastSync: 'Yesterday 10:45 PM' },
  { id: 'Moodle', status: 'Sandbox', sync: 'On demand', courses: 12, lastSync: 'Never' },
]

const syncFeed = [
  { id: 'SYNC-771', surface: 'Assignments', connector: 'Google Classroom', duration: '42s', status: 'Success' },
  { id: 'SYNC-768', surface: 'Grades', connector: 'Canvas', duration: '2m 14s', status: 'Warning' },
  { id: 'SYNC-764', surface: 'Roster', connector: 'Google Classroom', duration: '33s', status: 'Success' },
]

const gradeMappings = [
  { subject: 'Mathematics', sourceScale: 'Percentage', targetScale: 'A-F bands', owner: 'A. Bello', drift: '0.4%' },
  { subject: 'Literature', sourceScale: 'Rubric 5', targetScale: 'Numerical', owner: 'K. Aliyu', drift: '1.2%' },
  { subject: 'Physics', sourceScale: 'Percentage', targetScale: 'Weighted bands', owner: 'O. Udoh', drift: 'Stable' },
]

const adoptionStats = [
  { label: 'Courses synced', value: 78 },
  { label: 'Teachers onboarded', value: 64 },
  { label: 'Auto-published grades', value: 58 },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Connected: 'default',
  Drift: 'warning',
  Sandbox: 'secondary',
  Success: 'default',
  Warning: 'warning',
}

export function LMSIntegration() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900">LMS integration</h1>
          <p className="text-sm text-gray-600">Keep courses, assignments, and grades in sync across classroom platforms.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync now
          </Button>
          <Button>
            <BookOpen className="h-4 w-4 mr-2" /> Launch course hub
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Connectors live</p>
            <p className="text-3xl font-semibold text-gray-900">3</p>
            <p className="text-xs text-gray-500">+2 staged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sync coverage</p>
            <p className="text-3xl font-semibold text-emerald-600">84%</p>
            <p className="text-xs text-gray-500">Classroom & Canvas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Grade drift</p>
            <p className="text-3xl font-semibold text-amber-600">0.7%</p>
            <p className="text-xs text-gray-500">Monitor daily</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Assignments queued</p>
            <p className="text-3xl font-semibold text-gray-900">126</p>
            <p className="text-xs text-gray-500">Auto-publish @ 5 PM</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connector catalog</CardTitle>
          <CardDescription>Review sync intervals, course counts, and health.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sync cadence</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Last sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connectorCatalog.map((connector) => (
                <TableRow key={connector.id}>
                  <TableCell className="font-medium text-gray-900">{connector.id}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[connector.status] || 'secondary'}>{connector.status}</Badge>
                  </TableCell>
                  <TableCell>{connector.sync}</TableCell>
                  <TableCell>{connector.courses}</TableCell>
                  <TableCell>{connector.lastSync}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sync feed</CardTitle>
            <CardDescription>Assignment pushes and roster roll-ups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {syncFeed.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{item.surface}</p>
                  <p className="text-sm text-gray-500">{item.connector} • {item.duration}</p>
                  <p className="text-xs text-gray-400">Ref {item.id}</p>
                </div>
                <Badge variant={statusVariant[item.status] || 'secondary'}>{item.status}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Radio className="h-4 w-4 mr-2" /> View sync logs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade mappings</CardTitle>
            <CardDescription>Alignment between LMS rubrics and school grading.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gradeMappings.map((mapping) => (
              <div key={mapping.subject} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{mapping.subject}</p>
                    <p className="text-sm text-gray-500">{mapping.sourceScale} → {mapping.targetScale}</p>
                  </div>
                  <Badge variant={mapping.drift === 'Stable' ? 'default' : 'warning'}>
                    {mapping.drift}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1">Owner: {mapping.owner}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Shield className="h-4 w-4 mr-2" /> Edit policies
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adoption metrics</CardTitle>
          <CardDescription>Monitor rollout per department.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {adoptionStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-100 p-4">
              <p className="font-medium text-gray-900">{stat.label}</p>
              <div className="mt-2">
                <Progress value={stat.value} />
                <p className="text-xs text-gray-500 mt-1">{stat.value}%</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Canvas connector showing rubric drift. Re-run grade alignment wizard before publishing week 6 scores.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Link2 className="h-4 w-4 mr-2" /> Open connector
          </Button>
          <Button size="sm">
            <Wand2 className="h-4 w-4 mr-2" /> Auto-fix mapping
          </Button>
        </div>
      </div>
    </div>
  )
}
export default LMSIntegration;
