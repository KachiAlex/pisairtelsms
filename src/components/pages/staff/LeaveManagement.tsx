import React, { useState, useEffect } from 'react'
import { Plus, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Label } from '../../ui/label'

interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  createdAt: string
}

interface Staff {
  id: string
  name: string
}

const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Study Leave', 'Emergency Leave', 'Unpaid Leave']

export function LeaveManagement() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    staffId: '', leaveType: '', startDate: '', endDate: '', reason: ''
  })

  useEffect(() => {
    fetchLeaves()
    fetchStaff()
  }, [])

  const fetchLeaves = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/staff?resource=leave', { headers: { 'x-tenant-id': 'default-tenant' } })
      if (!res.ok) throw new Error('Failed to fetch leave requests')
      const data = await res.json()
      setLeaves(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leave requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/tenant/staff', { headers: { 'x-tenant-id': 'default-tenant' } })
      const data = await res.json()
      setStaff(data.data || [])
    } catch (err) {
      console.error('Failed to fetch staff')
    }
  }

  const calcDays = (start: string, end: string) => {
    if (!start || !end) return 0
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1)
  }

  const handleSubmit = async () => {
    if (!form.staffId || !form.leaveType || !form.startDate || !form.endDate) return
    setSaving(true)
    try {
      const selectedStaff = staff.find(s => s.id === form.staffId)
      const days = calcDays(form.startDate, form.endDate)
      await fetch('/api/tenant/staff?resource=leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default-tenant' },
        body: JSON.stringify({
          staffId: form.staffId,
          staffName: selectedStaff?.name || '',
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          days,
          reason: form.reason,
          status: 'pending',
        }),
      })
      setShowForm(false)
      setForm({ staffId: '', leaveType: '', startDate: '', endDate: '', reason: '' })
      fetchLeaves()
    } catch (err) {
      alert('Failed to submit leave request')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await fetch(`/api/tenant/staff?resource=leave&id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default-tenant' },
        body: JSON.stringify({ status, approvedBy: 'Admin' }),
      })
      fetchLeaves()
    } catch (err) {
      alert('Failed to update leave status')
    }
  }

  const filtered = filterStatus === 'all' ? leaves : leaves.filter(l => l.status === filterStatus)

  const pendingCount = leaves.filter(l => l.status === 'pending').length
  const approvedCount = leaves.filter(l => l.status === 'approved').length
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length

  const statusColor = (s: string) => s === 'approved' ? 'bg-green-100 text-green-800' : s === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Add */}
      <Card>
        <CardContent className="p-4 flex gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Request
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading leave requests...</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Leave Requests ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No leave requests found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.staffName}</TableCell>
                        <TableCell>{l.leaveType}</TableCell>
                        <TableCell>{new Date(l.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(l.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>{l.days}</TableCell>
                        <TableCell className="max-w-32 truncate">{l.reason}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(l.status)}>
                            {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {l.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(l.id, 'approved')}>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(l.id, 'rejected')}>
                                <XCircle className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                          {l.status !== 'pending' && <span className="text-xs text-gray-500">{l.approvedBy || '—'}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Leave Request Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Staff Member *</Label>
              <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Select staff member</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Leave Type *</Label>
              <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Select leave type</option>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            {form.startDate && form.endDate && (
              <p className="text-sm text-blue-600">{calcDays(form.startDate, form.endDate)} day(s)</p>
            )}
            <div>
              <Label>Reason</Label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                placeholder="Reason for leave..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.staffId || !form.leaveType || !form.startDate || !form.endDate}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LeaveManagement
