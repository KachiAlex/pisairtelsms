import React, { useState } from 'react'
import { Calculator, Activity, AlertTriangle, PlayCircle, Cpu, Database, ShieldCheck, RefreshCcw, Gauge } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const pipelineStages = [
  { id: 'stage-1', label: 'Aggregate CA scores', status: 'Done', duration: '4 min', owner: 'Engine' },
  { id: 'stage-2', label: 'Apply grading policy', status: 'Processing', duration: '—', owner: 'Rules Engine' },
  { id: 'stage-3', label: 'Compute rank & position', status: 'Queued', duration: '—', owner: 'Analytics' },
  { id: 'stage-4', label: 'Sync to broadsheets', status: 'Pending', duration: '—', owner: 'Data Lake' },
]

const computeQueue = [
  { id: 'RUN-9824', cohort: 'JSS 2', scope: 'All subjects', initiatedBy: 'Academics Bot', status: 'Running', started: '08:22 AM' },
  { id: 'RUN-9825', cohort: 'SS 1 Science', scope: 'Math & Physics only', initiatedBy: 'Mrs. Aminat', status: 'Queued', started: '—' },
  { id: 'RUN-9826', cohort: 'Primary 5', scope: 'Selective recompute', initiatedBy: 'Data QA', status: 'Blocked', started: '—' },
]

const recomputeScenarios = [
  { id: 'scenario-1', label: 'What-if: +5% CA weight for STEM', impact: '+0.6 GPA shift for 42 students', status: 'Draft' },
  { id: 'scenario-2', label: 'Corrected Biology practical scores', impact: 'Reprocess 6 subjects', status: 'Ready to run' },
  { id: 'scenario-3', label: 'Merge twin arms (SS 3A/B)', impact: 'Broadsheet alignment & ranks', status: 'Needs dependency' },
]

const guardrails = [
  { id: 'guard-1', label: 'Score drift monitor', detail: 'Flags >12% variance vs last term', status: 'No alert' },
  { id: 'guard-2', label: 'Missing CA handler', detail: 'Auto uses class mean when CA absent', status: '12 substitutions' },
  { id: 'guard-3', label: 'Double entry detector', detail: 'Stops duplicate uploads before compute', status: '2 quarantined' },
]

const statusBadges: Record<string, { text: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' }> = {
  Done: { text: 'Done', variant: 'default' },
  Processing: { text: 'Running', variant: 'default' },
  Queued: { text: 'Queued', variant: 'secondary' },
  Pending: { text: 'Pending', variant: 'secondary' },
  Running: { text: 'Running', variant: 'default' },
  Blocked: { text: 'Blocked', variant: 'destructive' },
  Draft: { text: 'Draft', variant: 'secondary' },
  'Ready to run': { text: 'Ready', variant: 'default' },
  'Needs dependency': { text: 'Dependency', variant: 'warning' },
}

export function ResultComputation() {
  const [isComputing, setIsComputing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleTriggerRecompute = async () => {
    setIsComputing(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Full recompute triggered successfully! Processing will begin in the background.')
    } catch (error) {
      alert('Failed to trigger recompute. Please try again.')
    } finally {
      setIsComputing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Pipeline status refreshed!')
    } finally {
      setRefreshing(false)
    }
  }

  const handleGuardrailSettings = () => {
    alert('Opening guardrail settings...\n\nYou can configure:\n- Score drift thresholds\n- Missing CA handlers\n- Double entry detection rules')
  }

  const handleBuildScenario = () => {
    alert('Opening scenario builder...\n\nCreate what-if scenarios to model:\n- CA weight changes\n- Score corrections\n- Cohort merges')
  }

  const handleGuardrailCatalog = () => {
    alert('Guardrail Catalog:\n\n1. Score drift monitor - Flags >12% variance\n2. Missing CA handler - Uses class mean\n3. Double entry detector - Stops duplicates\n\nAll guardrails are currently active.')
  }

  const handleAllocateCompute = () => {
    alert('Allocating additional compute resources...\n\nThis will increase processing speed for the current queue.')
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Computation control tower</p>
          <h1 className="text-2xl font-bold text-gray-900">Result computation</h1>
          <p className="text-sm text-gray-600">Orchestrate score aggregation, detect anomalies, and run what-if simulations safely.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleGuardrailSettings}>
            <Gauge className="h-4 w-4 mr-2" /> Guardrail settings
          </Button>
          <Button onClick={handleTriggerRecompute} disabled={isComputing}>
            <PlayCircle className="h-4 w-4 mr-2" /> {isComputing ? 'Computing...' : 'Trigger full recompute'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Cohorts computed</p>
            <p className="text-3xl font-semibold text-gray-900">11</p>
            <p className="text-xs text-gray-500">Out of 14 active this term</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Average compute time</p>
            <p className="text-3xl font-semibold text-gray-900">5m 12s</p>
            <p className="text-xs text-gray-500">-37s vs last term</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Guardrail breaches</p>
            <p className="text-3xl font-semibold text-rose-600">2</p>
            <p className="text-xs text-gray-500">Auto-paused until review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Last full compute</p>
            <p className="text-3xl font-semibold text-gray-900">47 mins ago</p>
            <p className="text-xs text-gray-500">Triggered by Academics Bot</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Compute pipeline</CardTitle>
              <CardDescription>Live status across the orchestration layers.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipelineStages.map((stage) => (
              <div key={stage.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{stage.label}</p>
                  <p className="text-xs text-gray-500">Owner: {stage.owner}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div>Runtime: {stage.duration}</div>
                  <Badge variant={statusBadges[stage.status].variant}>{statusBadges[stage.status].text}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario lab</CardTitle>
            <CardDescription>Model change requests without touching production data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recomputeScenarios.map((scenario) => (
              <div key={scenario.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{scenario.label}</p>
                  <Badge variant={statusBadges[scenario.status].variant}>{statusBadges[scenario.status].text}</Badge>
                </div>
                <p className="text-sm text-gray-500">{scenario.impact}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={handleBuildScenario}>
              <Calculator className="h-4 w-4 mr-2" /> Build new scenario
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compute queue</CardTitle>
          <CardDescription>Prioritize batches and know which runs are blocking publishing.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Initiated by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computeQueue.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium text-gray-900">{run.id}</TableCell>
                  <TableCell>{run.cohort}</TableCell>
                  <TableCell>{run.scope}</TableCell>
                  <TableCell>{run.initiatedBy}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadges[run.status].variant}>{statusBadges[run.status].text}</Badge>
                  </TableCell>
                  <TableCell>{run.started}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Guardrails & anomaly watch</CardTitle>
            <CardDescription>Automatic interrupts before incorrect results propagate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {guardrails.map((guard) => (
              <div key={guard.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{guard.label}</p>
                  <p className="text-sm text-gray-500">{guard.detail}</p>
                </div>
                <Badge variant={guard.status === 'No alert' ? 'secondary' : 'warning'}>{guard.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" onClick={handleGuardrailCatalog}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Guardrail catalog
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Throughput monitor</CardTitle>
            <CardDescription>Track how close we are to publishing readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Subjects processed</span>
                <span>78%</span>
              </div>
              <Progress value={78} />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Broadsheet sync</span>
                <span>52%</span>
              </div>
              <Progress value={52} />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Publishing readiness</span>
                <span>41%</span>
              </div>
              <Progress value={41} />
            </div>
            <Button className="w-full" onClick={handleAllocateCompute}>
              <Cpu className="h-4 w-4 mr-2" /> Allocate more compute
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default ResultComputation;
