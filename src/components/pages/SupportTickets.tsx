import React from 'react'
import { Ticket, UserCircle2, Clock3, CheckCircle2, RefreshCcw, MessageCircle, AlertTriangle, Inbox, Workflow, Plane } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const ticketQueue = [
  { id: 'SUP-2216', requester: 'Chinenye I.', topic: 'Payment reconciliation', priority: 'High', sla: '2h remaining', channel: 'Portal' },
  { id: 'SUP-2214', requester: 'Opeyemi A.', topic: 'CBT sync issue', priority: 'Medium', sla: '6h remaining', channel: 'Email' },
  { id: 'SUP-2210', requester: 'Tosin F.', topic: 'Guardian login reset', priority: 'Low', sla: '10h remaining', channel: 'Whatsapp' },
]

const slaStats = [
  { label: 'Open tickets', value: 18, tone: 'text-gray-900' },
  { label: 'Within SLA', value: '89%', tone: 'text-emerald-600' },
  { label: 'Breaches today', value: 2, tone: 'text-rose-600' },
  { label: 'Avg handle time', value: '28m', tone: 'text-gray-900' },
]

const agentRoster = [
  { name: 'Dami', queue: 'Integrations', load: 4, status: 'Online' },
  { name: 'Halima', queue: 'Finance', load: 3, status: 'Assist' },
  { name: 'Ike', queue: 'General', load: 5, status: 'Offline' },
]

const automationRules = [
  { name: 'Escalate high priority', coverage: '100%', state: 'Active' },
  { name: 'Auto-close duplicates', coverage: '76%', state: 'Training' },
  { name: 'Parent SMS updates', coverage: '54%', state: 'Paused' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  High: 'destructive',
  Medium: 'warning',
  Low: 'secondary',
  Online: 'default',
  Assist: 'warning',
  Offline: 'secondary',
  Active: 'default',
  Training: 'warning',
  Paused: 'secondary',
}

export function SupportTickets() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Help & Support</p>
          <h1 className="text-2xl font-bold text-gray-900">Support tickets</h1>
          <p className="text-sm text-gray-600">Monitor queues, SLA risk, and automation coverage across all channels.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync queue
          </Button>
          <Button>
            <Ticket className="h-4 w-4 mr-2" /> Create ticket
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {slaStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className={`text-3xl font-semibold ${stat.tone}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">Updated just now</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active queue</CardTitle>
          <CardDescription>Priority view with SLA countdown and channel context.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Channel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketQueue.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium text-gray-900">{ticket.id}</TableCell>
                  <TableCell>{ticket.requester}</TableCell>
                  <TableCell className="text-sm text-gray-600">{ticket.topic}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[ticket.priority] || 'secondary'}>{ticket.priority}</Badge>
                  </TableCell>
                  <TableCell>{ticket.sla}</TableCell>
                  <TableCell>{ticket.channel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent roster</CardTitle>
            <CardDescription>Load balancing per queue with status visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentRoster.map((agent) => (
              <div key={agent.name} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCircle2 className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">Queue {agent.queue}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[agent.status] || 'secondary'}>{agent.status}</Badge>
                  <p className="text-xs text-gray-500 mt-1">Load {agent.load}</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" /> Reassign tickets
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation rules</CardTitle>
            <CardDescription>Coverage for auto-routing and proactive nudges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {automationRules.map((rule) => (
              <div key={rule.name} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{rule.name}</p>
                  <p className="text-sm text-gray-500">Coverage {rule.coverage}</p>
                </div>
                <Badge variant={statusVariant[rule.state] || 'secondary'}>{rule.state}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Workflow className="h-4 w-4 mr-2" /> Tune automations
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>SUP-2216 trending towards SLA breach. Notify finance stakeholder and pin to dashboard.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Clock3 className="h-4 w-4 mr-2" /> Extend SLA
          </Button>
          <Button size="sm">
            <Inbox className="h-4 w-4 mr-2" /> Assign to self
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-slate-500" />
          <p>Ready to close bulk tickets? Download the closure summary with transcript trails.</p>
        </div>
        <Button variant="outline" size="sm">
          <Plane className="h-4 w-4 mr-2" /> Send summary
        </Button>
      </div>
    </div>
  )
}
export default SupportTickets;
