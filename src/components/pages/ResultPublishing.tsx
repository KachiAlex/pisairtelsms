import React, { useState, useEffect } from 'react'
import { Rocket, Share2, Bell, Upload, AlertTriangle, CalendarClock, CheckCircle2, Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'
import { useToast } from '../ui/use-toast'

function tenantHeaders(): Record<string, string> {
  const tenantId =
    (typeof window !== 'undefined' && localStorage.getItem('tenantId')) || 'default-tenant'
  return { 'Content-Type': 'application/json', 'x-tenant-id': tenantId }
}

interface ReleasePlanItem {
  id: string
  cohort: string
  channel: string
  window: string
  owner: string
  status: string
}

interface ChecklistItem {
  id: string
  label: string
  status: string
  detail: string
}

interface ChannelItem {
  id: string
  label: string
  status: string
  usage: number
}

interface IncidentItem {
  id: string
  label: string
  severity: string
  owner: string
  eta: string
}

interface AdoptionStat {
  label: string
  value: number
}

interface PublishingStats {
  cohortsStaged: number
  guardiansToNotify: number
  channelsHealthy: string
  nextReleaseWindow: string
}

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Scheduled: 'default',
  Staged: 'secondary',
  Blocked: 'destructive',
  Complete: 'default',
  'Pending edits': 'warning',
  'In progress': 'secondary',
}

const severityVariant: Record<string, 'warning' | 'destructive' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

export function ResultPublishing() {
  const { toast } = useToast()
  const [launching, setLaunching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [releasePlan, setReleasePlan] = useState<ReleasePlanItem[]>([])
  const [readinessChecklist, setReadinessChecklist] = useState<ChecklistItem[]>([])
  const [channelHealth, setChannelHealth] = useState<ChannelItem[]>([])
  const [incidentFeed, setIncidentFeed] = useState<IncidentItem[]>([])
  const [adoptionStats, setAdoptionStats] = useState<AdoptionStat[]>([])
  const [publishingStats, setPublishingStats] = useState<PublishingStats | null>(null)

  useEffect(() => {
    const headers = tenantHeaders()
    Promise.all([
      fetch('/api/tenant/result-publishing/release-plan', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/result-publishing/checklist', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/result-publishing/channel-health', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/result-publishing/incidents', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/result-publishing/adoption-stats', { headers }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/result-publishing/stats', { headers }).then((r) => r.json()).catch(() => ({})),
    ]).then(([planRes, checkRes, chanRes, incRes, adoptRes, statsRes]) => {
      if (planRes.data) setReleasePlan(planRes.data)
      if (checkRes.data) setReadinessChecklist(checkRes.data)
      if (chanRes.data) setChannelHealth(chanRes.data)
      if (incRes.data) setIncidentFeed(incRes.data)
      if (adoptRes.data) setAdoptionStats(adoptRes.data)
      if (statsRes.data) setPublishingStats(statsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const handlePublishingCalendar = () => {
    toast({ title: 'Publishing Calendar', description: 'View and reschedule releases in the release plan below.' })
  }

  const handleLaunchRelease = async () => {
    setLaunching(true)
    try {
      const res = await fetch('/api/tenant/result-publishing/launch', {
        method: 'POST',
        headers: tenantHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Release launched', description: data.message ?? 'Guardians are being notified.' })
      } else {
        toast({ title: 'Launch failed', description: data.error ?? 'Please try again.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' })
    } finally {
      setLaunching(false)
    }
  }

  const handleUpdateAssets = () => {
    toast({ title: 'Asset manager', description: 'Upload notification templates, banners and FAQ documents.' })
  }

  const handleAdjustRouting = () => {
    toast({ title: 'Notification routing', description: 'Enable/disable channels and set delivery priorities.' })
  }

  const handleLogIncident = async () => {
    try {
      const res = await fetch('/api/tenant/result-publishing/incidents', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ label: 'New incident', severity: 'medium', owner: 'Ops', eta: 'TBD' }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.data) setIncidentFeed((prev) => [data.data, ...prev])
        toast({ title: 'Incident logged', description: 'Incident has been recorded.' })
      } else {
        toast({ title: 'Failed to log incident', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  const handlePreviewNotice = () => {
    toast({ title: 'Early Access Notice', description: 'Guidance counselors can preview results 1 hour before guardians.' })
  }

  const handleEnablePreRelease = async () => {
    try {
      const res = await fetch('/api/tenant/result-publishing/pre-release', {
        method: 'POST',
        headers: tenantHeaders(),
      })
      if (res.ok) {
        toast({ title: 'Pre-release enabled', description: 'Guidance counselors now have early access.' })
      } else {
        toast({ title: 'Failed', description: 'Could not enable pre-release.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Release operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Result publishing</h1>
          <p className="text-sm text-gray-600">Coordinate portal pushes, guardian communications, and contingency workflows per cohort.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handlePublishingCalendar}>
            <CalendarClock className="h-4 w-4 mr-2" /> Publishing calendar
          </Button>
          <Button onClick={handleLaunchRelease} disabled={launching}>
            <Rocket className="h-4 w-4 mr-2" /> {launching ? 'Launching...' : 'Launch next release'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Cohorts staged</p>
            <p className="text-3xl font-semibold text-gray-900">{publishingStats?.cohortsStaged ?? releasePlan.length}</p>
            <p className="text-xs text-gray-500">Awaiting final trigger</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Guardians to notify</p>
            <p className="text-3xl font-semibold text-gray-900">{publishingStats?.guardiansToNotify?.toLocaleString() ?? '—'}</p>
            <p className="text-xs text-gray-500">Segmentation synced</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Channels healthy</p>
            <p className="text-3xl font-semibold text-emerald-600">{publishingStats?.channelsHealthy ?? `${channelHealth.filter(c => c.status === 'Operational').length} / ${channelHealth.length}`}</p>
            <p className="text-xs text-gray-500">Operational channels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Next release window</p>
            <p className="text-3xl font-semibold text-gray-900">{publishingStats?.nextReleaseWindow ?? '—'}</p>
            <p className="text-xs text-gray-500">Prep assets in advance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Release plan</CardTitle>
          <CardDescription>Centralized schedule with status, owners, and delivery channels.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Release window</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releasePlan.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-gray-500">No releases scheduled</TableCell></TableRow>
          ) : releasePlan.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium text-gray-900">{plan.id}</TableCell>
                  <TableCell>{plan.cohort}</TableCell>
                  <TableCell>{plan.channel}</TableCell>
                  <TableCell>{plan.window}</TableCell>
                  <TableCell>{plan.owner}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Readiness checklist</CardTitle>
            <CardDescription>Everything required before pressing publish.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readinessChecklist.length === 0 ? (
              <p className="text-sm text-gray-500">No checklist items</p>
            ) : readinessChecklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.detail}</p>
                </div>
                <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" onClick={handleUpdateAssets}>
              <Upload className="h-4 w-4 mr-2" /> Update assets
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel health</CardTitle>
            <CardDescription>Know which notification rails are safe to use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {channelHealth.length === 0 ? (
              <p className="text-sm text-gray-500">No channel data</p>
            ) : channelHealth.map((channel) => (
              <div key={channel.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{channel.label}</p>
                  <Badge variant={channel.status.includes('Delayed') ? 'warning' : channel.status === 'Queued' ? 'secondary' : 'default'}>
                    {channel.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">Utilization {channel.usage}%</p>
                <Progress value={channel.usage} className="mt-2" />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={handleAdjustRouting}>
              <Share2 className="h-4 w-4 mr-2" /> Adjust routing
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident feed</CardTitle>
          <CardDescription>Mitigate issues that could delay guardian access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {incidentFeed.length === 0 ? (
            <p className="text-sm text-gray-500">No active incidents</p>
          ) : incidentFeed.map((incident) => (
            <div key={incident.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900">{incident.label}</p>
                <Badge variant={severityVariant[incident.severity]}>Severity: {incident.severity}</Badge>
              </div>
              <p className="text-sm text-gray-500">Owner: {incident.owner}</p>
              <p className="text-xs text-gray-400">ETA: {incident.eta}</p>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogIncident}>
            <AlertTriangle className="h-4 w-4 mr-2" /> Log incident
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {adoptionStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm text-gray-500">{stat.label}</CardTitle>
              <CardDescription className="text-3xl font-semibold text-gray-900">{stat.value}%</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={stat.value} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5" />
          <p>Set early-access notifications so guidance counselors preview results 1 hour before guardians.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviewNotice}>Preview notice</Button>
          <Button size="sm" onClick={handleEnablePreRelease}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Enable pre-release
          </Button>
        </div>
      </div>
    </div>
  )
}
export default ResultPublishing;
