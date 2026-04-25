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
  AlertCircle,
  CheckCircle2,
  Clock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

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

interface BulkNotification {
  id: string
  title: string
  message: string
  channels: string[]
  recipientCount: number
  scheduledFor: string
  sentAt: string | null
  status: 'scheduled' | 'sent' | 'failed'
  deliveryStatus: { pending: number; delivered: number; failed: number }
  createdAt: string
}

interface ParentMessage {
  id: string
  parentName: string
  studentName: string
  message: string
  messageType: 'alert' | 'update' | 'request'
  priority: 'normal' | 'urgent'
  sentAt: string
  status: 'sent' | 'read' | 'replied'
  replies: Array<{ id: string; message: string; sentAt: string; sentBy: string }>
  createdAt: string
}

interface CommunicationLog {
  id: string
  type: 'announcement' | 'notification' | 'message'
  recipient: string
  channel: 'email' | 'sms' | 'in-app' | 'push'
  sentAt: string
  deliveredAt: string | null
  readAt: string | null
  status: 'sent' | 'delivered' | 'read' | 'failed'
  errorMessage: string | null
  createdAt: string
}

const audienceSegments = [
  { id: 'all', label: 'All guardians', reach: '2,140 recipients' },
  { id: 'senior', label: 'Senior school', reach: '860 recipients' },
  { id: 'boarding', label: 'Boarding houses', reach: '420 recipients' },
  { id: 'transport', label: 'Bus routes', reach: '510 recipients' },
]

export function CommunicationHub() {
  const [activeTab, setActiveTab] = useState('announcements')
  const [selectedSegment, setSelectedSegment] = useState('senior')
  const [subject, setSubject] = useState('SS 3 mock exam briefing')
  const [schedule, setSchedule] = useState('2026-02-23T07:30')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [bulkNotifications, setBulkNotifications] = useState<BulkNotification[]>([])
  const [parentMessages, setParentMessages] = useState<ParentMessage[]>([])
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageBody, setMessageBody] = useState(
    `Dear guardians,\n\nPlease note that SS 3 mock examinations commence on Monday. Ensure students arrive by 7:30am with full materials. Detailed schedule attached.\n\nRegards,\nAcademics Team`
  )

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch announcements
        const announcementsRes = await fetch('/api/tenant/communication')
        if (announcementsRes.ok) {
          const result = await announcementsRes.json()
          setAnnouncements(result.data || [])
        }

        // Fetch bulk notifications
        const notificationsRes = await fetch('/api/tenant/bulk-notifications')
        if (notificationsRes.ok) {
          const result = await notificationsRes.json()
          setBulkNotifications(result.data || [])
        }

        // Fetch parent messages
        const messagesRes = await fetch('/api/tenant/parent-messages')
        if (messagesRes.ok) {
          const result = await messagesRes.json()
          setParentMessages(result.data || [])
        }

        // Fetch communication logs
        const logsRes = await fetch('/api/tenant/communication-logs')
        if (logsRes.ok) {
          const result = await logsRes.json()
          setCommunicationLogs(result.data || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const handleSendBroadcast = async () => {
    if (!subject.trim() || !messageBody.trim()) {
      setError('Subject and message body are required')
      return
    }

    try {
      setError(null)

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

      setAnnouncements([optimisticAnnouncement, ...announcements])

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

      setAnnouncements((prev) =>
        prev.map((ann) => (ann.id === optimisticAnnouncement.id ? result.data : ann))
      )

      setSubject('')
      setMessageBody('')
    } catch (err) {
      console.error('Error sending announcement:', err)
      setError(err instanceof Error ? err.message : 'Failed to send announcement')
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="bulk-notifications">Bulk Notifications</TabsTrigger>
          <TabsTrigger value="parent-messaging">Parent Messaging</TabsTrigger>
          <TabsTrigger value="communication-logs">Communication Logs</TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total sent', value: announcements.filter(a => a.status === 'sent').length, icon: Megaphone, tone: 'text-blue-600' },
              { label: 'Pending (drafts)', value: announcements.filter(a => a.status === 'draft').length, icon: Clock4, tone: 'text-amber-600' },
              { label: 'Total announcements', value: announcements.length, icon: Mail, tone: 'text-emerald-600' },
              { label: 'Alerts escalated', value: '—', icon: BellRing, tone: 'text-rose-600' },
            ].map((stat, idx) => {
              const Icon = stat.icon
              return (
                <Card key={idx}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
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

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSendBroadcast}>
                    <Send className="h-4 w-4 mr-2" /> Send broadcast
                  </Button>
                  <Button variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" /> Generate draft
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channel performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8 text-center">
                  <div>
                    <Radio className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Analytics coming soon.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent announcements</CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No announcements yet</div>
              ) : (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Sent by</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {announcements.slice(0, 5).map((announcement) => (
                        <TableRow key={announcement.id}>
                          <TableCell className="font-medium">{announcement.title}</TableCell>
                          <TableCell className="capitalize">{announcement.audience}</TableCell>
                          <TableCell>{announcement.sentBy}</TableCell>
                          <TableCell>
                            {announcement.sentAt
                              ? new Date(announcement.sentAt).toLocaleDateString()
                              : 'Not sent'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={announcement.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                              {announcement.status === 'sent' ? 'Completed' : 'Draft'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Notifications Tab */}
        <TabsContent value="bulk-notifications" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Scheduled</p>
                  <p className="text-3xl font-bold text-gray-900">{bulkNotifications.filter(n => n.status === 'scheduled').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Sent</p>
                  <p className="text-3xl font-bold text-gray-900">{bulkNotifications.filter(n => n.status === 'sent').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-rose-50 p-3 text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Failed</p>
                  <p className="text-3xl font-bold text-gray-900">{bulkNotifications.filter(n => n.status === 'failed').length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {bulkNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No bulk notifications yet</div>
              ) : (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Channels</TableHead>
                        <TableHead>Scheduled For</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkNotifications.map((notif) => (
                        <TableRow key={notif.id}>
                          <TableCell className="font-medium">{notif.title}</TableCell>
                          <TableCell>{notif.recipientCount}</TableCell>
                          <TableCell>{notif.channels.join(', ')}</TableCell>
                          <TableCell>{new Date(notif.scheduledFor).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={notif.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : notif.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}>
                              {notif.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parent Messaging Tab */}
        <TabsContent value="parent-messaging" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Messages</p>
                  <p className="text-3xl font-bold text-gray-900">{parentMessages.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-amber-50 p-3 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Unread</p>
                  <p className="text-3xl font-bold text-gray-900">{parentMessages.filter(m => m.status === 'sent').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Replied</p>
                  <p className="text-3xl font-bold text-gray-900">{parentMessages.filter(m => m.status === 'replied').length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Parent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {parentMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No parent messages yet</div>
              ) : (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parent</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parentMessages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="font-medium">{msg.parentName}</TableCell>
                          <TableCell>{msg.studentName}</TableCell>
                          <TableCell className="capitalize">{msg.messageType}</TableCell>
                          <TableCell>
                            <Badge className={msg.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'}>
                              {msg.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(msg.sentAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={msg.status === 'replied' ? 'bg-emerald-100 text-emerald-700' : msg.status === 'read' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                              {msg.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Logs Tab */}
        <TabsContent value="communication-logs" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Sent</p>
                  <p className="text-3xl font-bold text-gray-900">{communicationLogs.filter(l => l.status === 'sent').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Delivered</p>
                  <p className="text-3xl font-bold text-gray-900">{communicationLogs.filter(l => l.status === 'delivered').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-purple-50 p-3 text-purple-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Read</p>
                  <p className="text-3xl font-bold text-gray-900">{communicationLogs.filter(l => l.status === 'read').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-rose-50 p-3 text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Failed</p>
                  <p className="text-3xl font-bold text-gray-900">{communicationLogs.filter(l => l.status === 'failed').length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Communication Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {communicationLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No communication logs yet</div>
              ) : (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communicationLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="capitalize">{log.type}</TableCell>
                          <TableCell>{log.recipient}</TableCell>
                          <TableCell className="capitalize">{log.channel}</TableCell>
                          <TableCell>{new Date(log.sentAt).toLocaleDateString()}</TableCell>
                          <TableCell>{log.deliveredAt ? new Date(log.deliveredAt).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>
                            <Badge className={log.status === 'read' ? 'bg-purple-100 text-purple-700' : log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : log.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}>
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CommunicationHub
