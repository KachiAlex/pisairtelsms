import React, { useState } from 'react'
import {
  MessageSquare,
  Megaphone,
  Send,
  Clock4,
  Users,
  BellRing,
  Inbox,
  Sparkles,
  Download,
  Filter,
  Radio,
  Mail,
  Smartphone,
  Share2,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Progress } from '../ui/progress'

const summaryStats = [
  { label: 'Broadcasts scheduled', value: '18', detail: '4 due today', tone: 'text-blue-600', icon: Megaphone },
  { label: 'Avg. open rate', value: '62%', detail: '+5% vs last week', tone: 'text-emerald-600', icon: Mail },
  { label: 'Parent response SLA', value: '1h 42m', detail: 'Goal: < 2h', tone: 'text-purple-600', icon: Clock4 },
  { label: 'Alerts escalated', value: '7', detail: '2 transport, 3 health', tone: 'text-rose-600', icon: BellRing },
]

const audienceSegments = [
  { id: 'all', label: 'All guardians', reach: '2,140 recipients' },
  { id: 'senior', label: 'Senior school', reach: '860 recipients' },
  { id: 'boarding', label: 'Boarding houses', reach: '420 recipients' },
  { id: 'transport', label: 'Bus routes', reach: '510 recipients' },
]

const channelPerformance = [
  { channel: 'Email', metric: '65% open • 9% click', value: 65, icon: Mail },
  { channel: 'SMS', metric: '98% delivered • 42s median response', value: 82, icon: Smartphone },
  { channel: 'In-app', metric: '76% seen • 14 replies', value: 58, icon: MessageSquare },
  { channel: 'Voice', metric: '12 campaigns', value: 34, icon: Radio },
]

const automationFlows = [
  { name: 'Attendance breach alert', detail: 'Trigger SMS + email if homeroom dips below 85%', status: 'Active' },
  { name: 'Fee reminder cadence', detail: 'Sequence: SMS → Email → Counselor follow-up', status: 'Active' },
  { name: 'Health screening broadcast', detail: 'Auto-schedule guardians 48h pre-screening', status: 'Paused' },
]

const inboxMessages = [
  { id: 'MSG-9812', type: 'Parent reply', subject: 'Clarification on excursion fee', sender: 'Mrs. Bello', time: '12m ago', status: 'Needs response' },
  { id: 'MSG-9804', type: 'Transport alert', subject: 'Route 4 delay notice sent', sender: 'Automation', time: '38m ago', status: 'Delivered' },
  { id: 'MSG-9797', type: 'Broadcast approval', subject: 'SS 3 mock exam briefing', sender: 'Academics', time: '1h 12m ago', status: 'Awaiting sign-off' },
]

const communicationLogs = [
  { id: 'BR-230', title: 'JSS PTA reminder', channel: 'Email + SMS', owner: 'Principal office', sent: 'Feb 21, 7:30am', reach: '1,120', status: 'Completed' },
  { id: 'AL-118', title: 'Heat advisory (Boarding)', channel: 'SMS + Voice', owner: 'Health team', sent: 'Feb 20, 9:05pm', reach: '420', status: 'Escalated' },
  { id: 'NT-404', title: 'School bus reroute', channel: 'In-app', owner: 'Transport', sent: 'Feb 20, 6:15am', reach: '510', status: 'Completed' },
]

const statusStyles: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Escalated: 'bg-rose-100 text-rose-700',
  'Needs response': 'bg-amber-100 text-amber-700',
  Delivered: 'bg-blue-100 text-blue-700',
  'Awaiting sign-off': 'bg-purple-100 text-purple-700',
}

export function CommunicationHub() {
  const [selectedSegment, setSelectedSegment] = useState('senior')
  const [subject, setSubject] = useState('SS 3 mock exam briefing')
  const [schedule, setSchedule] = useState('2026-02-23T07:30')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Engagement</p>
          <h1 className="text-2xl font-bold text-gray-900">Communication control center</h1>
          <p className="text-sm text-gray-600">Compose multi-channel broadcasts, monitor replies, and automate escalation playbooks.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" /> Filter logs
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" /> Share snapshot
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" /> Export analytics
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
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              Broadcast composer
            </CardTitle>
            <CardDescription>Draft and schedule outbound campaigns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Audience segment</label>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {audienceSegments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.label} ({segment.reach})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Schedule</label>
                <Input
                  type="datetime-local"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Subject line</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Message body</label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={`Dear guardians,\n\nPlease note that SS 3 mock examinations commence on Monday. Ensure students arrive by 7:30am with full materials. Detailed schedule attached.\n\nRegards,\nAcademics Team`}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Channels</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'sms', label: 'SMS', icon: Smartphone },
                  { id: 'inapp', label: 'In-app', icon: MessageSquare },
                  { id: 'voice', label: 'Voice', icon: Radio },
                ].map((channel) => {
                  const Icon = channel.icon
                  return (
                    <Button key={channel.id} variant="outline" className="gap-2">
                      <Icon className="h-4 w-4" />
                      {channel.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button>
                <Send className="h-4 w-4 mr-2" /> Send broadcast
              </Button>
              <Button variant="outline">
                <Sparkles className="h-4 w-4 mr-2" /> Generate draft
              </Button>
              <Button variant="ghost">Save as template</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel performance</CardTitle>
            <CardDescription>Engagement lift over last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channelPerformance.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.channel}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-slate-100 p-2">
                        <Icon className="h-4 w-4 text-slate-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.channel}</p>
                        <p className="text-xs text-gray-500">{item.metric}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{item.value}%</span>
                  </div>
                  <Progress value={item.value} className="mt-2" />
                </div>
              )
            })}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
              <p className="font-semibold">Suggestion</p>
              <p className="text-xs mt-1">Pair SMS nudges with in-app confirmations for faster guardian acknowledgements.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-blue-600" />
              Unified inbox
            </CardTitle>
            <CardDescription>Replies, approvals, and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inboxMessages.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{msg.subject}</p>
                  <Badge className={statusStyles[msg.status] ?? 'bg-gray-100 text-gray-700'}>
                    {msg.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{msg.type} • {msg.sender}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>ID: {msg.id}</span>
                  <span>{msg.time}</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full text-sm">
              Open inbox workspace
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Automation flows
            </CardTitle>
            <CardDescription>Hand off repetitive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {automationFlows.map((flow) => (
              <div key={flow.name} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{flow.name}</p>
                  <Badge className={flow.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                    {flow.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{flow.detail}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full text-sm">
              Manage recipes
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Communication logs
          </CardTitle>
          <CardDescription>Recent broadcasts and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {communicationLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-gray-900">{log.id}</TableCell>
                    <TableCell>{log.title}</TableCell>
                    <TableCell>{log.channel}</TableCell>
                    <TableCell>{log.owner}</TableCell>
                    <TableCell>{log.sent}</TableCell>
                    <TableCell className="text-right">{log.reach}</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusStyles[log.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default CommunicationHub;
