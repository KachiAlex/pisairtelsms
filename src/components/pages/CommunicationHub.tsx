import React, { useState, useEffect } from 'react'
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

interface Announcement {
  id: string
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents'
  sentBy: string
  sentAt: string | null
  status: 'draft' | 'sent'
  createdAt: string
}

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageBody, setMessageBody] = useState(
    `Dear guardians,\n\nPlease note that SS 3 mock examinations commence on Monday. Ensure students arrive by 7:30am with full materials. Detailed schedule attached.\n\nRegards,\nAcademics Team`
  )

  // Fetch announcements on mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/tenant/communication')
        if (!response.ok) {
          throw new Error('Failed to fetch announcements')
        }
        const result = await response.json()
        setAnnouncements(result.data || [])
      } catch (err) {
        console.error('Error fetching announcements:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch announcements')
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [])

  // Compute summary stats from fetched announcements
  const totalSent = announcements.filter(a => a.status === 'sent').length
  const pending = announcements.filter(a => a.status === 'draft').length

  const computedSummaryStats = [
    { label: 'Total sent', value: totalSent.toString(), detail: 'From database', tone: 'text-blue-600', icon: Megaphone },
    { label: 'Pending (drafts)', value: pending.toString(), detail: 'Awaiting send', tone: 'text-amber-600', icon: Clock4 },
    { label: 'Total announcements', value: announcements.length.toString(), detail: 'All time', tone: 'text-emerald-600', icon: Mail },
    { label: 'Alerts escalated', value: '—', detail: 'Coming soon', tone: 'text-rose-600', icon: BellRing },
  ]
  const handleSendBroadcast = async () => {
    if (!subject.trim() || !messageBody.trim()) {
      setError('Subject and message body are required')
      return
    }

    try {
      setError(null)
      
      // Create optimistic announcement
      const optimisticAnnouncement: Announcement = {
        id: `temp_${Date.now()}`,
        title: subject,
        body: messageBody,
        audience: selectedSegment as 'all' | 'students' | 'staff' | 'parents',
        sentBy: 'Admin',
        sentAt: new Date().toISOString(),
        status: 'sent',
        createdAt: new Date().toISOString(),
      }

      // Add optimistically to the list
      setAnnouncements([optimisticAnnouncement, ...announcements])

      // Send to API
      const response = await fetch('/api/tenant/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subject,
          body: messageBody,
          audience: selectedSegment,
          status: 'sent',
          sentBy: 'Admin',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send announcement')
      }

      const result = await response.json()
      
      // Replace optimistic announcement with real one
      setAnnouncements((prev) =>
        prev.map((ann) => (ann.id === optimisticAnnouncement.id ? result.data : ann))
      )

      // Reset form
      setSubject('')
      setMessageBody('')
    } catch (err) {
      console.error('Error sending announcement:', err)
      setError(err instanceof Error ? err.message : 'Failed to send announcement')
      // Remove optimistic announcement on error
      setAnnouncements((prev) => prev.slice(1))
    }
  }

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
        {computedSummaryStats.map((stat) => {
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
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <Button onClick={handleSendBroadcast}>
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
            <CardDescription>Engagement analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <Radio className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Analytics coming soon.</p>
              </div>
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
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <Inbox className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No data yet.</p>
              </div>
            </div>
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
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <Sparkles className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Coming soon.</p>
              </div>
            </div>
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No announcements yet</div>
          ) : (
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Sent by</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell className="font-medium text-gray-900">{announcement.id}</TableCell>
                      <TableCell>{announcement.title}</TableCell>
                      <TableCell className="capitalize">{announcement.audience}</TableCell>
                      <TableCell>{announcement.sentBy}</TableCell>
                      <TableCell>
                        {announcement.sentAt
                          ? new Date(announcement.sentAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Not sent'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            announcement.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {announcement.status === 'sent' ? 'Completed' : 'Draft'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default CommunicationHub;
