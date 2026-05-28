import React, { useState, useEffect } from 'react'
import { DollarSign, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Label } from '../../ui/label'
import { Input } from '../../ui/input'

interface PayrollRecord {
  id: string
  staffId: string
  staffName: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  status: 'pending' | 'processed' | 'paid'
  paymentDate?: string
}

interface Staff {
  id: string
  name: string
  salary?: number
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getAuthHeaders() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': auth.tenantId || 'default-tenant',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json', 'x-tenant-id': 'default-tenant' }
  }
}

export function PayrollManagement() {
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ staffId: '', basicSalary: '', allowances: '0', deductions: '0' })

  useEffect(() => { fetchStaff() }, [])
  useEffect(() => { fetchPayroll() }, [selectedMonth, selectedYear])

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/tenant/staff', { headers: getAuthHeaders() })
      const data = await res.json()
      const members: Staff[] = data.data || []
      setStaff(members)
      if (members.length > 0) {
        setForm(f => f.staffId ? f : { ...f, staffId: members[0].id, basicSalary: members[0].salary?.toString() || '' })
      }
    } catch (err) {
      console.error('Failed to fetch staff')
    }
  }

  const fetchPayroll = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenant/staff?resource=payroll&month=${selectedMonth}&year=${selectedYear}`, {
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error('Failed to fetch payroll')
      const data = await res.json()
      setRecords(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payroll')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!form.staffId || !form.basicSalary) return
    setSaving(true)
    try {
      const selectedStaff = staff.find(s => s.id === form.staffId)
      await fetch('/api/tenant/staff?resource=payroll', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staffId: form.staffId,
          staffName: selectedStaff?.name || '',
          month: selectedMonth,
          year: selectedYear,
          basicSalary: Number(form.basicSalary),
          allowances: Number(form.allowances),
          deductions: Number(form.deductions),
        }),
      })
      setShowForm(false)
      setForm({ staffId: '', basicSalary: '', allowances: '0', deductions: '0' })
      fetchPayroll()
    } catch (err) {
      alert('Failed to generate payroll')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const paymentDate = status === 'paid' ? new Date().toISOString().split('T')[0] : undefined
      await fetch(`/api/tenant/staff?resource=payroll&id=${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, paymentDate }),
      })
      fetchPayroll()
    } catch (err) {
      alert('Failed to update payroll status')
    }
  }

  const generateAllPayroll = async () => {
    const staffWithSalary = staff.filter(s => s.salary)
    for (const s of staffWithSalary) {
      await fetch('/api/tenant/staff?resource=payroll', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          staffId: s.id, staffName: s.name, month: selectedMonth, year: selectedYear,
          basicSalary: s.salary, allowances: 0, deductions: 0,
        }),
      })
    }
    fetchPayroll()
  }

  const totalPayroll = records.reduce((sum, r) => sum + r.netSalary, 0)
  const paidCount = records.filter(r => r.status === 'paid').length
  const pendingCount = records.filter(r => r.status === 'pending').length

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`
  const statusColor = (s: string) => s === 'paid' ? 'bg-green-100 text-green-800' : s === 'processed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Payroll</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPayroll)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">{paidCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Month</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Year</label>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={generateAllPayroll}>
            <RefreshCw className="w-4 h-4 mr-2" /> Auto-Generate All
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <DollarSign className="w-4 h-4 mr-2" /> Add Entry
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
        <Card><CardContent className="p-8 text-center animate-pulse">Loading payroll...</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payroll — {selectedMonth} {selectedYear} ({records.length} records)</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No payroll records for this period. Click "Auto-Generate All" to create entries for staff with salaries.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.staffName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.basicSalary)}</TableCell>
                        <TableCell className="text-right text-green-600">+{formatCurrency(r.allowances)}</TableCell>
                        <TableCell className="text-right text-red-600">-{formatCurrency(r.deductions)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(r.netSalary)}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(r.status)}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.status === 'pending' && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'processed')}>Process</Button>
                            )}
                            {r.status === 'processed' && (
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, 'paid')}>Mark Paid</Button>
                            )}
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
      )}

      {/* Add Payroll Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Payroll Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Staff Member *</Label>
              <select value={form.staffId} onChange={e => {
                const s = staff.find(st => st.id === e.target.value)
                setForm(f => ({ ...f, staffId: e.target.value, basicSalary: s?.salary?.toString() || '' }))
              }} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                {staff.length === 0 && <option value="">No staff available</option>}
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Basic Salary (₦) *</Label>
              <Input type="number" value={form.basicSalary} onChange={e => setForm(f => ({ ...f, basicSalary: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Allowances (₦)</Label>
              <Input type="number" value={form.allowances} onChange={e => setForm(f => ({ ...f, allowances: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Deductions (₦)</Label>
              <Input type="number" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} placeholder="0" />
            </div>
            {form.basicSalary && (
              <p className="text-sm font-medium text-blue-600">
                Net: ₦{(Number(form.basicSalary) + Number(form.allowances) - Number(form.deductions)).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={saving || !form.staffId || !form.basicSalary}>
              {saving ? 'Saving...' : 'Generate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayrollManagement
