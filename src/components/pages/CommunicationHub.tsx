import React, { useState, useEffect } from 'react'
import {
  Megaphone, Send, Clock4, BellRing,
  Filter, Mail, AlertCircle, CheckCircle2,
  Clock, X, Plus, RefreshCw, Search, MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
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
  readCount?: number
}

interface AnnouncementReader {
  id: string
  readerId: string
  readerType: 'student' | 'parent' | 'staff'
  readerName: string
  readAt: string
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

interface AudienceSegment {
  id: string
  label: string
  reach: string
  count: number
}

function tenantHeaders(): Record<string, string> {
  const auth = typeof window !== 'undefined' ? localStorage.getItem('auth') : null
  const token = auth ? JSON.parse(auth).token : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const CHANNELS = ['email', 'sms', 'push', 'in-app']

export function CommunicationHub({ initialTab = 'announcements' }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Audience segments
  const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>([])

  // Announcements state
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [subject, setSubject] = useState('')
  const [schedule, setSchedule] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [viewingReaders, setViewingReaders] = useState<string | null>(null)
  const [readersList, setReadersList] = useState<AnnouncementReader[]>([])
  const [readersLoading, setReadersLoading] = useState(false)

  // Bulk Notifications state
  const [bulkNotifications, setBulkNotifications] = useState<BulkNotification[]>([])
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkTitle, setBulkTitle] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkChannels, setBulkChannels] = useState<string[]>(['email'])
  const [bulkRecipients, setBulkRecipients] = useState('')
  const [bulkSchedule, setBulkSchedule] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  // Parent Messages state
  const [parentMessages, setParentMessages] = useState<ParentMessage[]>([])
  const [showParentForm, setShowParentForm] = useState(false)
  const [pmParentName, setPmParentName] = useState('')
  const [pmStudentName, setPmStudentName] = useState('')
  const [pmMessage, setPmMessage] = useState('')
  const [pmType, setPmType] = useState<'alert' | 'update' | 'request'>('update')
  const [pmPriority, setPmPriority] = useState<'normal' | 'urgent'>('normal')
  const [pmSearch, setPmSearch] = useState('')
  const [pmStatusFilter, setPmStatusFilter] = useState('')
  const [pmSubmitting, setPmSubmitting] = useState(false)

  // Communication Logs state
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([])
  const [showLogFilters, setShowLogFilters] = useState(false)
  const [logTypeFilter, setLogTypeFilter] = useState('')
  const [logChannelFilter, setLogChannelFilter] = useState('')
  const [logStatusFilter, setLogStatusFilter] = useState('')
  const [logRecipientFilter, setLogRecipientFilter] = useState('')
  const [logStartDate, setLogStartDate] = useState('')
  const [logEndDate, setLogEndDate] = useState('')

  // Global state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllData()
    fetchAudienceSegments()
  }, [])

  const fetchAudienceSegments = async () => {
    try {
      const res = await fetch('/api/tenant/communication/audiences', { headers: tenantHeaders() })
      if (res.ok) {
        const r = await res.json()
        if (r.data && r.data.length > 0) {
          setAudienceSegments(r.data)
        }
      }
    } catch (err) {
      console.error('Error fetching audience segments:', err)
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [annRes, notifRes, msgRes, logRes] = await Promise.allSettled([
        fetch('/api/tenant/communication', { headers: tenantHeaders() }),
        fetch('/api/tenant/bulk-notifications', { headers: tenantHeaders() }),
        fetch('/api/tenant/parent-messages', { headers: tenantHeaders() }),
        fetch('/api/tenant/communication-logs', { headers: tenantHeaders() }),
      ])
      if (annRes.status === 'fulfilled' && annRes.value?.ok) {
        const r = await annRes.value.json(); setAnnouncements(Array.isArray(r.data) ? r.data : [])
      }
      if (notifRes.status === 'fulfilled' && notifRes.value?.ok) {
        const r = await notifRes.value.json(); setBulkNotifications(Array.isArray(r.data) ? r.data : [])
      }
      if (msgRes.status === 'fulfilled' && msgRes.value?.ok) {
        const r = await msgRes.value.json(); setParentMessages(Array.isArray(r.data) ? r.data : [])
      }
      if (logRes.status === 'fulfilled' && logRes.value?.ok) {
        const r = await logRes.value.json(); setCommunicationLogs(Array.isArray(r.data) ? r.data : [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const fetchFilteredLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (logTypeFilter) params.set('type', logTypeFilter)
      if (logChannelFilter) params.set('channel', logChannelFilter)
      if (logStatusFilter) params.set('status', logStatusFilter)
      if (logRecipientFilter) params.set('recipient', logRecipientFilter)
      if (logStartDate) params.set('startDate', logStartDate)
      if (logEndDate) params.set('endDate', logEndDate)
      const res = await fetch(`/api/tenant/communication-logs?${params}`, { headers: tenantHeaders() })
      if (res.ok) { const r = await res.json(); setCommunicationLogs(Array.isArray(r.data) ? r.data : []) }
    } catch { /* silent */ }
  }

  const fetchReaders = async (announcementId: string) => {
    try {
      setReadersLoading(true)
      const res = await fetch(`/api/tenant/communication?id=${announcementId}`, { headers: tenantHeaders() })
      if (res.ok) {
        const r = await res.json()
        setReadersList(r.data?.readers || [])
        setViewingReaders(announcementId)
      }
    } catch (err) {
      console.error('Error fetching readers:', err)
    } finally {
      setReadersLoading(false)
    }
  }

  const handleSendBroadcast = async () => {
    if (!subject.trim() || !messageBody.trim()) return
    const optimistic: Announcement = {
      id: `temp_${Date.now()}`, title: subject, body: messageBody,
      audience: selectedSegment as Announcement['audience'],
      sentBy: 'Admin', sentAt: new Date().toISOString(), status: 'sent',
      createdAt: new Date().toISOString(),
    }
    setAnnouncements(prev => [optimistic, ...prev])
    try {
      const res = await fetch('/api/tenant/communication', {
        method: 'POST', headers: tenantHeaders(),
        body: JSON.stringify({ title: subject, body: messageBody, audience: selectedSegment, status: 'sent', sentBy: 'Admin' }),
      })
      if (!res.ok) throw new Error('Failed')
      const result = await res.json()
      setAnnouncements(prev => prev.map(a => a.id === optimistic.id ? result.data : a))
      setSubject(''); setMessageBody('')
    } catch {
      setAnnouncements(prev => prev.filter(a => a.id !== optimistic.id))
      setError('Failed to send announcement')
    }
  }

  const handleCreateBulkNotification = async () => {
    if (!bulkTitle.trim() || !bulkMessage.trim() || !bulkRecipients) return
    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/tenant/bulk-notifications', {
        method: 'POST', headers: tenantHeaders(),
        body: JSON.stringify({
          title: bulkTitle, message: bulkMessage, channels: bulkChannels,
          recipientCount: parseInt(bulkRecipients), scheduledFor: bulkSchedule || new Date().toISOString(),
        }),
      })
      if (res.ok) {
        const result = await res.json()
        setBulkNotifications(prev => [result.data, ...prev])
        setBulkTitle(''); setBulkMessage(''); setBulkChannels(['email']); setBulkRecipients(''); setBulkSchedule('')
        setShowBulkForm(false)
      }
    } catch { setError('Failed to create notification') }
    finally { setBulkSubmitting(false) }
  }

  const handleSendParentMessage = async () => {
    if (!pmParentName.trim() || !pmStudentName.trim() || !pmMessage.trim()) return
    setPmSubmitting(true)
    try {
      const res = await fetch('/api/tenant/parent-messages', {
        method: 'POST', headers: tenantHeaders(),
        body: JSON.stringify({ parentName: pmParentName, studentName: pmStudentName, message: pmMessage, messageType: pmType, priority: pmPriority }),
      })
      if (res.ok) {
        const result = await res.json()
        setParentMessages(prev => [result.data, ...prev])
        setPmParentName(''); setPmStudentName(''); setPmMessage(''); setPmType('update'); setPmPriority('normal')
        setShowParentForm(false)
      }
    } catch { setError('Failed to send message') }
    finally { setPmSubmitting(false) }
  }

  const toggleChannel = (ch: string) => {
    setBulkChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  const filteredMessages = parentMessages.filter(m => {
    const matchSearch = !pmSearch || m.parentName.toLowerCase().includes(pmSearch.toLowerCase()) || m.studentName.toLowerCase().includes(pmSearch.toLowerCase())
    const matchStatus = !pmStatusFilter || m.status === pmStatusFilter
    return matchSearch && matchStatus
  })

  const clearLogFilters = () => {
    setLogTypeFilter(''); setLogChannelFilter(''); setLogStatusFilter('')
    setLogRecipientFilter(''); setLogStartDate(''); setLogEndDate('')
    fetchAllData()
  }

  const activeLogFilters = [logTypeFilter, logChannelFilter, logStatusFilter, logRecipientFilter, logStartDate, logEndDate].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Engagement</p>
          <h1 className="text-2xl font-bold text-gray-900">Communication control center</h1>
          <p className="text-sm text-gray-600">Compose multi-channel broadcasts, monitor replies, and track delivery.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="bulk-notifications">Bulk Notifications</TabsTrigger>
          <TabsTrigger value="parent-messaging">Parent Messaging</TabsTrigger>
          <TabsTrigger value="communication-logs">Comm Logs</TabsTrigger>
        </TabsList>

        {/* ── ANNOUNCEMENTS TAB ── */}
        <TabsContent value="announcements" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total sent', value: announcements.filter(a => a.status === 'sent').length, color: 'bg-blue-50 text-blue-600', icon: Megaphone },
              { label: 'Drafts', value: announcements.filter(a => a.status === 'draft').length, color: 'bg-amber-50 text-amber-600', icon: Clock4 },
              { label: 'Total', value: announcements.length, color: 'bg-emerald-50 text-emerald-600', icon: Mail },
              { label: 'Audiences', value: [...new Set(announcements.map(a => a.audience))].length, color: 'bg-purple-50 text-purple-600', icon: BellRing },
            ].map(({ label, value, color, icon: Icon }, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-full p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-blue-600" />Broadcast composer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Audience segment</label>
                    <select value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      {audienceSegments.map(s => <option key={s.id} value={s.id}>{s.label} ({s.reach})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Schedule (optional)</label>
                    <Input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Subject line</label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. SS3 mock exam briefing" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Message body</label>
                  <textarea rows={4} value={messageBody} onChange={e => setMessageBody(e.target.value)} placeholder="Write your announcement here..." className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSendBroadcast} disabled={!subject.trim() || !messageBody.trim()}>
                    <Send className="h-4 w-4 mr-2" /> Send broadcast
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Recent announcements</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No announcements yet. Send your first broadcast above.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead><TableHead>Audience</TableHead>
                        <TableHead>Sent by</TableHead><TableHead>Date</TableHead>
                        <TableHead>Seen</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {announcements.slice(0, 10).map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{a.title}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{a.audience}</Badge></TableCell>
                          <TableCell>{a.sentBy}</TableCell>
                          <TableCell className="text-gray-500 text-sm">{a.sentAt ? new Date(a.sentAt).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>
                            {a.status === 'sent' ? (
                              <button
                                onClick={() => fetchReaders(a.id)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                                title="Click to see who read this"
                              >
                                {a.readCount ?? 0} seen
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={a.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                              {a.status === 'sent' ? 'Sent' : 'Draft'}
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

        {/* ── BULK NOTIFICATIONS TAB ── */}
        <TabsContent value="bulk-notifications" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[
              { label: 'Scheduled', value: bulkNotifications.filter(n => n.status === 'scheduled').length, color: 'bg-blue-50 text-blue-600', icon: Clock },
              { label: 'Sent', value: bulkNotifications.filter(n => n.status === 'sent').length, color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
              { label: 'Failed', value: bulkNotifications.filter(n => n.status === 'failed').length, color: 'bg-rose-50 text-rose-600', icon: AlertCircle },
            ].map(({ label, value, color, icon: Icon }, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-full p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create form */}
          {showBulkForm ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-blue-600" />New bulk notification</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowBulkForm(false)}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Title</label>
                    <Input value={bulkTitle} onChange={e => setBulkTitle(e.target.value)} placeholder="e.g. Fee reminder — Term 2" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Recipient count</label>
                    <Input type="number" value={bulkRecipients} onChange={e => setBulkRecipients(e.target.value)} placeholder="e.g. 500" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Message</label>
                  <textarea rows={3} value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} placeholder="Write your notification message..." className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">Channels</label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map(ch => (
                      <button key={ch} onClick={() => toggleChannel(ch)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${bulkChannels.includes(ch) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Schedule for (optional)</label>
                  <Input type="datetime-local" value={bulkSchedule} onChange={e => setBulkSchedule(e.target.value)} className="mt-1 max-w-xs" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleCreateBulkNotification} disabled={bulkSubmitting || !bulkTitle.trim() || !bulkMessage.trim() || !bulkRecipients}>
                    {bulkSubmitting ? 'Scheduling...' : <><Send className="h-4 w-4 mr-2" />Schedule notification</>}
                  </Button>
                  <Button variant="outline" onClick={() => setShowBulkForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-end">
              <Button onClick={() => setShowBulkForm(true)}><Plus className="h-4 w-4 mr-2" />New notification</Button>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Notification history</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : bulkNotifications.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <BellRing className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No bulk notifications yet. Create one above.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead><TableHead>Recipients</TableHead>
                        <TableHead>Channels</TableHead><TableHead>Delivery</TableHead>
                        <TableHead>Scheduled</TableHead><TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkNotifications.map(n => (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium">{n.title}</TableCell>
                          <TableCell>{n.recipientCount.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {n.channels.map(ch => <Badge key={ch} variant="outline" className="text-xs capitalize">{ch}</Badge>)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {n.deliveryStatus ? (
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div className="text-emerald-600">{n.deliveryStatus.delivered} delivered</div>
                                <div className="text-amber-600">{n.deliveryStatus.pending} pending</div>
                                {n.deliveryStatus.failed > 0 && <div className="text-rose-600">{n.deliveryStatus.failed} failed</div>}
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{new Date(n.scheduledFor).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={n.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : n.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}>
                              {n.status}
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

        {/* ── PARENT MESSAGING TAB ── */}
        <TabsContent value="parent-messaging" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[
              { label: 'Total messages', value: parentMessages.length, color: 'bg-blue-50 text-blue-600', icon: Mail },
              { label: 'Unread', value: parentMessages.filter(m => m.status === 'sent').length, color: 'bg-amber-50 text-amber-600', icon: Clock },
              { label: 'Replied', value: parentMessages.filter(m => m.status === 'replied').length, color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
            ].map(({ label, value, color, icon: Icon }, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-full p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Compose form */}
          {showParentForm ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-blue-600" />New message to parent</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowParentForm(false)}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Parent name</label>
                    <Input value={pmParentName} onChange={e => setPmParentName(e.target.value)} placeholder="e.g. Mrs. Adeyemi" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Student name</label>
                    <Input value={pmStudentName} onChange={e => setPmStudentName(e.target.value)} placeholder="e.g. Tunde Adeyemi" className="mt-1" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Message type</label>
                    <select value={pmType} onChange={e => setPmType(e.target.value as typeof pmType)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <option value="update">Update</option>
                      <option value="alert">Alert</option>
                      <option value="request">Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Priority</label>
                    <select value={pmPriority} onChange={e => setPmPriority(e.target.value as typeof pmPriority)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Message</label>
                  <textarea rows={4} value={pmMessage} onChange={e => setPmMessage(e.target.value)} placeholder="Write your message to the parent..." className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSendParentMessage} disabled={pmSubmitting || !pmParentName.trim() || !pmStudentName.trim() || !pmMessage.trim()}>
                    {pmSubmitting ? 'Sending...' : <><Send className="h-4 w-4 mr-2" />Send message</>}
                  </Button>
                  <Button variant="outline" onClick={() => setShowParentForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 gap-3 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={pmSearch} onChange={e => setPmSearch(e.target.value)} placeholder="Search by parent or student name..." className="pl-9" />
                </div>
                <select value={pmStatusFilter} onChange={e => setPmStatusFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="">All statuses</option>
                  <option value="sent">Unread</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                </select>
              </div>
              <Button onClick={() => setShowParentForm(true)}><Plus className="h-4 w-4 mr-2" />New message</Button>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{pmSearch || pmStatusFilter ? 'No messages match your filters.' : 'No parent messages yet. Start a conversation above.'}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parent</TableHead><TableHead>Student</TableHead>
                        <TableHead>Type</TableHead><TableHead>Priority</TableHead>
                        <TableHead>Date</TableHead><TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map(m => (
                        <TableRow key={m.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{m.parentName}</TableCell>
                          <TableCell>{m.studentName}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{m.messageType}</Badge></TableCell>
                          <TableCell>
                            <Badge className={m.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}>
                              {m.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{new Date(m.sentAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={m.status === 'replied' ? 'bg-emerald-100 text-emerald-700' : m.status === 'read' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                              {m.status}
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

        {/* ── COMMUNICATION LOGS TAB ── */}
        <TabsContent value="communication-logs" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Sent', value: communicationLogs.filter(l => l.status === 'sent').length, color: 'bg-blue-50 text-blue-600', icon: Send },
              { label: 'Delivered', value: communicationLogs.filter(l => l.status === 'delivered').length, color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
              { label: 'Read', value: communicationLogs.filter(l => l.status === 'read').length, color: 'bg-purple-50 text-purple-600', icon: Mail },
              { label: 'Failed', value: communicationLogs.filter(l => l.status === 'failed').length, color: 'bg-rose-50 text-rose-600', icon: AlertCircle },
            ].map(({ label, value, color, icon: Icon }, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-full p-3 ${color}`}><Icon className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filter panel */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setShowLogFilters(v => !v)} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeLogFilters > 0 && <Badge className="bg-blue-600 text-white text-xs">{activeLogFilters}</Badge>}
                </button>
                <div className="flex gap-2">
                  {activeLogFilters > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearLogFilters} className="text-xs text-gray-500">
                      <X className="h-3 w-3 mr-1" />Clear filters
                    </Button>
                  )}
                  <Button size="sm" onClick={fetchFilteredLogs}>Apply</Button>
                </div>
              </div>

              {showLogFilters && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Type</label>
                    <select value={logTypeFilter} onChange={e => setLogTypeFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <option value="">All types</option>
                      <option value="announcement">Announcement</option>
                      <option value="notification">Notification</option>
                      <option value="message">Message</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Channel</label>
                    <select value={logChannelFilter} onChange={e => setLogChannelFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <option value="">All channels</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="in-app">In-app</option>
                      <option value="push">Push</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Status</label>
                    <select value={logStatusFilter} onChange={e => setLogStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <option value="">All statuses</option>
                      <option value="sent">Sent</option>
                      <option value="delivered">Delivered</option>
                      <option value="read">Read</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Recipient</label>
                    <Input value={logRecipientFilter} onChange={e => setLogRecipientFilter(e.target.value)} placeholder="Search recipient..." className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">From date</label>
                    <Input type="date" value={logStartDate} onChange={e => setLogStartDate(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">To date</label>
                    <Input type="date" value={logEndDate} onChange={e => setLogEndDate(e.target.value)} className="mt-1" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Log entries</CardTitle>
                <span className="text-sm text-gray-500">{communicationLogs.length} records</span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : communicationLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Filter className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{activeLogFilters > 0 ? 'No logs match your filters.' : 'No communication logs yet.'}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead><TableHead>Recipient</TableHead>
                        <TableHead>Channel</TableHead><TableHead>Sent</TableHead>
                        <TableHead>Delivered</TableHead><TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communicationLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell><Badge variant="outline" className="capitalize">{log.type}</Badge></TableCell>
                          <TableCell className="max-w-[160px] truncate">{log.recipient}</TableCell>
                          <TableCell className="capitalize text-sm text-gray-600">{log.channel}</TableCell>
                          <TableCell className="text-sm text-gray-500">{new Date(log.sentAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm text-gray-500">{log.deliveredAt ? new Date(log.deliveredAt).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <Badge className={log.status === 'read' ? 'bg-purple-100 text-purple-700' : log.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : log.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}>
                                {log.status}
                              </Badge>
                              {log.errorMessage && <span className="text-xs text-rose-500 truncate max-w-[120px]">{log.errorMessage}</span>}
                            </div>
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

      {/* Readers Modal */}
      {viewingReaders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingReaders(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {announcements.find(a => a.id === viewingReaders)?.title || 'Announcement'} — Readers
              </h3>
              <button onClick={() => setViewingReaders(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {readersLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : readersList.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No one has seen this announcement yet.</div>
              ) : (
                <div className="space-y-2">
                  {readersList.map(reader => (
                    <div key={reader.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">{reader.readerType}</Badge>
                        <span className="text-sm font-medium text-gray-900">{reader.readerName}</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(reader.readAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600 flex justify-between">
              <span>Total readers:</span>
              <span className="font-semibold text-gray-900">{readersList.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunicationHub
