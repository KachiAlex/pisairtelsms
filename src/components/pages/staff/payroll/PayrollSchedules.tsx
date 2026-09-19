import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, RefreshCw, AlertCircle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { payrollApi, type PayrollSchedule, type PayrollRun } from '../../../../lib/payrollApi'

interface StaffOption { id: string; name: string; salary?: number | null; status?: string }

function authHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return auth.token ? { Authorization: `Bearer ${auth.token}` } : {}
  } catch { return {} }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function nextRunLabel(s: PayrollSchedule): string {
  const now = new Date()
  if (s.frequency === 'weekly' || s.frequency === 'bi_weekly') {
    const target = s.dayOfWeek ?? 5
    const next = new Date(now)
    next.setDate(now.getDate() + ((target - now.getDay() + 7) % 7))
    const dateStr = next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return s.frequency === 'weekly'
      ? `Next: ${WEEKDAYS[target]} ${dateStr}`
      : `Every other ${WEEKDAYS[target]} (next ~${dateStr})`
  }
  const day = s.dayOfMonth || 25
  const candidate = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  candidate.setDate(Math.min(day, lastDay))
  if (candidate <= now) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()
    nextMonth.setDate(Math.min(day, nextLastDay))
    return `Next: ${nextMonth.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return `Next: ${candidate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function PayrollSchedules() {
  const [schedules, setSchedules] = useState<PayrollSchedule[]>([])
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{
    name: string; frequency: 'weekly' | 'monthly' | 'bi_weekly' | 'custom';
    dayOfMonth: number; dayOfWeek: number; autoGenerate: boolean; autoDisburse: boolean;
    staffIds: string[]; templateRunId: string;
  }>({ name: '', frequency: 'monthly', dayOfMonth: 25, dayOfWeek: 5, autoGenerate: false, autoDisburse: false, staffIds: [], templateRunId: '' })

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const [data, runData] = await Promise.all([payrollApi.getSchedules(), payrollApi.getRuns()])
      setSchedules(data)
      setRuns(runData)
    } catch (err) {
      setError('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
    fetch('/api/tenant/staff', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setStaff((d.data || []).filter((s: StaffOption) => s.status === 'active' || !s.status)))
      .catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!form.name) return
    try {
      await payrollApi.createSchedule(form)
      setShowForm(false)
      setForm({ name: '', frequency: 'monthly', dayOfMonth: 25, dayOfWeek: 5, autoGenerate: false, autoDisburse: false, staffIds: [], templateRunId: '' })
      fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return
    try {
      await payrollApi.deleteSchedule(id)
      fetchSchedules()
    } catch (err) {
      setError('Failed to delete schedule')
    }
  }

  const handleToggle = async (schedule: PayrollSchedule, field: 'autoGenerate' | 'autoDisburse' | 'isActive') => {
    try {
      await payrollApi.updateSchedule(schedule.id, { [field]: !schedule[field] })
      fetchSchedules()
    } catch (err) {
      setError('Failed to update schedule')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Payroll Schedules</h3>
          <p className="text-sm text-gray-500">Configure automated payroll generation cycles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSchedules}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Schedule</Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading schedules...</CardContent></Card>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            No payroll schedules configured. Create one to automate payroll generation.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map(s => {
            const schedRuns = runs.filter(r => r.scheduleId === s.id).slice(0, 3)
            const groupSize = s.staffIds?.length || 0
            const tplRun = s.templateRunId ? runs.find(r => r.id === s.templateRunId) : null
            return (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{s.frequency.replace('_', '-')} · Day {s.frequency === 'monthly' ? s.dayOfMonth : s.dayOfWeek}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{s.isActive ? nextRunLabel(s) : 'Inactive — will not run'}</p>
                    <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {s.templateRunId
                        ? `Template: ${tplRun?.name || s.templateRunId}`
                        : `Pay group: ${groupSize ? `${groupSize} selected staff` : 'all active staff with salaries'}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.autoGenerate} onChange={() => handleToggle(s, 'autoGenerate')} className="rounded" />
                    <span>Auto-generate payroll</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.autoDisburse} onChange={() => handleToggle(s, 'autoDisburse')} className="rounded" />
                    <span>Auto-disburse after approval</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.isActive} onChange={() => handleToggle(s, 'isActive')} className="rounded" />
                    <span>Active</span>
                  </label>
                </div>
                {schedRuns.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Runs under this schedule</p>
                    {schedRuns.map(r => (
                      <div key={r.id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-700 truncate mr-2">{r.name}</span>
                        <Badge>{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Payroll Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Schedule Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly Salary Run" />
            </div>
            <div>
              <Label>Frequency</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as 'weekly' | 'monthly' | 'bi_weekly' | 'custom' }))}>
                <option value="monthly">Monthly</option>
                <option value="bi_weekly">Bi-Weekly</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {form.frequency === 'monthly' ? (
              <div>
                <Label>Day of Month</Label>
                <Input type="number" min={1} max={31} value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))} />
              </div>
            ) : (
              <div>
                <Label>Day of Week (0=Sun, 6=Sat)</Label>
                <Input type="number" min={0} max={6} value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))} />
              </div>
            )}
            <div>
              <Label>Template payroll run (optional)</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.templateRunId}
                onChange={e => setForm(f => ({ ...f, templateRunId: e.target.value }))}>
                <option value="">None — generate from staff salaries + rules</option>
                {runs.map(r => <option key={r.id} value={r.id}>{r.name} ({r.totalStaff} staff)</option>)}
              </select>
              {form.templateRunId && (
                <p className="text-xs text-blue-600 mt-1">Each run will clone this run's staff and pay lines — tax, pension and advance repayments are recalculated fresh each period.</p>
              )}
            </div>
            <div>
              <Label>Pay group — staff included in this payroll (empty = all staff)</Label>
              <div className={`max-h-44 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1 mt-1 ${form.templateRunId ? 'opacity-50 pointer-events-none' : ''}`}>
                {staff.length === 0 && <p className="text-xs text-gray-400 p-1">Loading staff…</p>}
                {staff.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" checked={form.staffIds.includes(s.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        staffIds: e.target.checked ? [...f.staffIds, s.id] : f.staffIds.filter(id => id !== s.id),
                      }))} />
                    <span className="flex-1">{s.name}</span>
                    {!s.salary && <span className="text-xs text-amber-600">no salary set</span>}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {form.templateRunId
                  ? 'Pay group comes from the template run'
                  : form.staffIds.length ? `${form.staffIds.length} staff selected` : 'All active staff with salaries will be included'}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.autoGenerate} onChange={e => setForm(f => ({ ...f, autoGenerate: e.target.checked }))} className="rounded" />
              <span>Auto-generate payroll on schedule</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.autoDisburse} onChange={e => setForm(f => ({ ...f, autoDisburse: e.target.checked }))} className="rounded" />
              <span>Auto-disburse after approval</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayrollSchedules
