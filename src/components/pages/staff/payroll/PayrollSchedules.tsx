import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { payrollApi, type PayrollSchedule } from '../../../../lib/payrollApi'

export function PayrollSchedules() {
  const [schedules, setSchedules] = useState<PayrollSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', frequency: 'monthly', dayOfMonth: 25, dayOfWeek: 5, autoGenerate: false, autoDisburse: false })

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const data = await payrollApi.getSchedules()
      setSchedules(data)
    } catch (err) {
      setError('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSchedules() }, [])

  const handleCreate = async () => {
    if (!form.name) return
    try {
      await payrollApi.createSchedule(form)
      setShowForm(false)
      setForm({ name: '', frequency: 'monthly', dayOfMonth: 25, dayOfWeek: 5, autoGenerate: false, autoDisburse: false })
      fetchSchedules()
    } catch (err) {
      setError('Failed to create schedule')
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
          {schedules.map(s => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{s.frequency.replace('_', '-')} · Day {s.frequency === 'monthly' ? s.dayOfMonth : s.dayOfWeek}</p>
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
              </CardContent>
            </Card>
          ))}
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
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
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
