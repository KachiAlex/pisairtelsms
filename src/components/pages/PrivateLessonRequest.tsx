import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, Clock, Users, BookOpen, CheckCircle, XCircle, AlertCircle,
  Calendar, DollarSign, ArrowLeft, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select'
import { getAuthFromStorage } from '../../lib/auth'
import { tenantApiGet, tenantApiPost, tenantApiPut } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'

interface LessonRequest {
  id: string
  teacher_id: string
  teacher_name: string | null
  student_ids: string[]
  subject_name: string | null
  purpose: string
  proposed_schedule: string
  duration_minutes: number
  num_sessions: number
  fee_amount: number | null
  fee_currency: string
  payment_mode: string
  admin_status: string
  parent_status: string
  status: string
  admin_notes: string | null
  parent_notes: string | null
  created_at: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_admin: { label: 'Pending Admin', color: 'secondary' },
  pending_parent: { label: 'Pending Parent', color: 'secondary' },
  approved: { label: 'Approved', color: 'default' },
  scheduled: { label: 'Scheduled', color: 'default' },
  completed: { label: 'Completed', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'secondary' },
  rejected: { label: 'Rejected', color: 'destructive' },
  declined: { label: 'Declined by Parent', color: 'destructive' },
}

export function PrivateLessonRequest() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<LessonRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tenantApiGet('/api/tenant/private-lesson-requests')
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
      }
    } catch (err) {
      toast({ title: 'Failed to load requests', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleCreate = async (data: any) => {
    try {
      const res = await tenantApiPost('/api/tenant/private-lesson-requests', data)
      if (res.ok) {
        setShowCreateDialog(false)
        fetchRequests()
        toast({ title: 'Request submitted', description: 'Private lesson request submitted successfully.' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to create request', description: err.error || 'Please try again.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to create request', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this private lesson request?')) return
    try {
      const res = await tenantApiPut('/api/tenant/private-lesson-requests', { id, action: 'cancel' })
      if (res.ok) {
        fetchRequests()
        toast({ title: 'Request cancelled', description: 'Private lesson request cancelled.' })
      } else {
        toast({ title: 'Failed to cancel', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Failed to cancel', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return r.status === 'pending_admin' || r.status === 'pending_parent'
    if (activeTab === 'approved') return r.status === 'approved' || r.status === 'scheduled'
    if (activeTab === 'closed') return r.status === 'completed' || r.status === 'rejected' || r.status === 'declined' || r.status === 'cancelled'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Digital Learning</p>
          <h1 className="text-2xl font-bold text-gray-900">Private Lesson Requests</h1>
          <p className="text-sm text-gray-600">Request private tutoring sessions. Admin and parent approvals required.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Requests</p>
            <p className="text-2xl font-semibold">{requests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Admin</p>
            <p className="text-2xl font-semibold text-amber-600">
              {requests.filter(r => r.status === 'pending_admin').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending Parent</p>
            <p className="text-2xl font-semibold text-blue-600">
              {requests.filter(r => r.status === 'pending_parent').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Approved</p>
            <p className="text-2xl font-semibold text-emerald-600">
              {requests.filter(r => r.status === 'approved' || r.status === 'scheduled').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No private lesson requests yet.</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map(req => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{req.purpose}</h3>
                        <Badge variant={(statusConfig[req.status]?.color as any) || 'secondary'}>
                          {statusConfig[req.status]?.label || req.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {req.student_ids?.length || 0} student(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(req.proposed_schedule).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {req.duration_minutes} min × {req.num_sessions} session(s)
                        </span>
                        {req.fee_amount !== null && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> {req.fee_amount} {req.fee_currency}
                          </span>
                        )}
                      </div>
                      {/* Approval chain */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-xs">
                          {req.admin_status === 'approved' ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : req.admin_status === 'rejected' ? (
                            <XCircle className="h-3 w-3 text-red-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className={req.admin_status === 'approved' ? 'text-emerald-600' : req.admin_status === 'rejected' ? 'text-red-600' : 'text-amber-600'}>
                            Admin: {req.admin_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {req.parent_status === 'approved' ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          ) : req.parent_status === 'declined' ? (
                            <XCircle className="h-3 w-3 text-red-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className={req.parent_status === 'approved' ? 'text-emerald-600' : req.parent_status === 'declined' ? 'text-red-600' : 'text-amber-600'}>
                            Parent: {req.parent_status}
                          </span>
                        </div>
                      </div>
                      {req.admin_notes && (
                        <p className="text-xs text-gray-400">Admin notes: {req.admin_notes}</p>
                      )}
                      {req.parent_notes && (
                        <p className="text-xs text-gray-400">Parent notes: {req.parent_notes}</p>
                      )}
                    </div>
                    {(req.status === 'pending_admin' || req.status === 'pending_parent') && (
                      <Button size="sm" variant="outline" onClick={() => handleCancel(req.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <CreateRequestDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreate={handleCreate} />
    </div>
  )
}

function CreateRequestDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: any) => void }) {
  const [studentIds, setStudentIds] = useState('')
  const [purpose, setPurpose] = useState('')
  const [proposedSchedule, setProposedSchedule] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [numSessions, setNumSessions] = useState(1)
  const [subjectId, setSubjectId] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Private Lesson</DialogTitle>
          <DialogDescription>
            Submit a private tutoring request. The admin will review and set the fee, then the parent must approve.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="studentIds">Student ID(s) * (comma-separated)</Label>
            <Input
              id="studentIds"
              value={studentIds}
              onChange={e => setStudentIds(e.target.value)}
              placeholder="e.g. stu-001, stu-002"
            />
            <p className="text-xs text-gray-400">Enter the student IDs who need private tutoring</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose / Description *</Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. Extra coaching on Algebra for upcoming WAEC exam"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schedule">Proposed Schedule *</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={proposedSchedule}
                onChange={e => setProposedSchedule(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessions">Number of Sessions</Label>
              <Input
                id="sessions"
                type="number"
                value={numSessions}
                onChange={e => setNumSessions(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject (optional)</Label>
              <Input
                id="subject"
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                placeholder="Subject ID"
              />
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            <p>The fee will be calculated automatically based on the admin's rate card. You cannot set the fee.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            const ids = studentIds.split(',').map(s => s.trim()).filter(Boolean)
            onCreate({
              studentIds: ids,
              purpose,
              proposedSchedule: proposedSchedule ? new Date(proposedSchedule).toISOString() : null,
              durationMinutes,
              numSessions,
              subjectId: subjectId || undefined,
            })
            setStudentIds(''); setPurpose(''); setProposedSchedule(''); setSubjectId('')
          }}>
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PrivateLessonRequest
