import React, { useState, useEffect } from 'react'
import { Megaphone, Send, Clock4, BellRing, Mail, Smartphone, MessageSquare, Plus, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useCommunications } from '../../hooks/useCommunications'

const CHANNELS = [
  { id: 'in-app', label: 'In-App', icon: MessageSquare },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: Smartphone },
  { id: 'push', label: 'Push', icon: BellRing },
]

const AUDIENCE_OPTIONS = ['all', 'students', 'staff', 'parents']

export function CommunicationsHub({ initialTab = 'send' }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const { communications, logs, loading, createCommunication, sendNow, fetchCommunications } = useCommunications()
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'announcement',
    audience: 'all' as any,
    channels: ['in-app'] as string[],
    scheduledFor: '',
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const toggleChannel = (channel: string) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await createCommunication(form)
      setForm({ title: '', body: '', type: 'announcement', audience: 'all', channels: ['in-app'], scheduledFor: '' })
      await fetchCommunications()
      setActiveTab('history')
    } finally {
      setSending(false)
    }
  }

  const handleSendNow = async (id: string) => {
    await sendNow(id)
    await fetchCommunications()
  }

  const statusBadge = (status: string) => {
    const variant =
      status === 'sent' ? 'bg-green-100 text-green-800' :
      status === 'sending' ? 'bg-blue-100 text-blue-800' :
      status === 'failed' ? 'bg-red-100 text-red-800' :
      status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
      'bg-gray-100 text-gray-800'
    return <Badge className={variant}>{status}</Badge>
  }

  const totalRecipients = (stats?: Record<string, number>) =>
    stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Communications Center
          </h1>
          <p className="text-muted-foreground">Compose, schedule, and track all messages in one place.</p>
        </div>
        <Button onClick={fetchCommunications} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                New Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Mid-term break reminder"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="announcement">Announcement</option>
                      <option value="notification">Notification</option>
                      <option value="message">Message</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Body</label>
                  <Textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    rows={5}
                    placeholder="Write your message here..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audience</label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={form.audience}
                      onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    >
                      {AUDIENCE_OPTIONS.map((a) => (
                        <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Schedule</label>
                    <Input
                      type="datetime-local"
                      value={form.scheduledFor}
                      onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Channels</label>
                  <div className="flex gap-2 flex-wrap">
                    {CHANNELS.map((c) => {
                      const Icon = c.icon
                      const active = form.channels.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleChannel(c.id)}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                            active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button type="submit" disabled={sending}>
                  <Plus className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : form.scheduledFor ? 'Schedule' : 'Send Now'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock4 className="h-5 w-5" />
                Sent Communications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : communications.length === 0 ? (
                <p className="text-muted-foreground">No communications yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communications.map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell className="font-medium">{comm.title}</TableCell>
                        <TableCell>{comm.type}</TableCell>
                        <TableCell>{statusBadge(comm.status)}</TableCell>
                        <TableCell>{comm.sentAt ? new Date(comm.sentAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>{totalRecipients(comm.stats)}</TableCell>
                        <TableCell>
                          {comm.status === 'draft' || comm.status === 'scheduled' ? (
                            <Button size="sm" variant="outline" onClick={() => handleSendNow(comm.id)}>
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Delivery Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No delivery logs yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.recipientName}</TableCell>
                        <TableCell>{log.channel}</TableCell>
                        <TableCell>{log.address}</TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell>{log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-red-600 text-xs">{log.errorMessage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CommunicationsHub
