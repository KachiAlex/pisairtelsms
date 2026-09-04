import React, { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, AlertCircle, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Input } from '../../../ui/input'
import { Label } from '../../../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog'
import { payrollApi, type PayrollRule } from '../../../../lib/payrollApi'

interface Staff {
  id: string
  name: string
  salary?: number
}

const EARNING_CATEGORIES = ['housing_allowance', 'transport', 'hazard_pay', 'bonus', 'medical', 'entertainment', 'leave_allowance', 'other_earning']
const DEDUCTION_CATEGORIES = ['loan_repayment', 'salary_advance', 'union_dues', 'insurance', 'other_deduction']

export function PayrollRules() {
  const [rules, setRules] = useState<PayrollRule[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    staffId: '', staffName: '', ruleType: 'earning', category: 'housing_allowance',
    label: '', amount: '', calculationMethod: 'fixed', percentageOf: 'basic_salary',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rulesData, staffRes] = await Promise.all([
        payrollApi.getRules(),
        fetch('/api/tenant/staff', { headers: getAuthHeaders() }).then(r => r.json()),
      ])
      setRules(rulesData)
      const staffList: Staff[] = staffRes.data || []
      setStaff(staffList)
      if (staffList.length > 0) {
        setForm(f => f.staffId ? f : { ...f, staffId: staffList[0].id, staffName: staffList[0].name })
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async () => {
    if (!form.staffId || !form.label || !form.amount) return
    try {
      const selectedStaff = staff.find(s => s.id === form.staffId)
      await payrollApi.createRule({
        staffId: form.staffId,
        staffName: selectedStaff?.name || form.staffName,
        ruleType: form.ruleType,
        category: form.category,
        label: form.label,
        amount: Number(form.amount),
        calculationMethod: form.calculationMethod as 'fixed' | 'percentage',
        percentageOf: form.percentageOf as 'basic_salary' | 'gross',
      })
      setShowForm(false)
      setForm({ staffId: form.staffId, staffName: '', ruleType: 'earning', category: 'housing_allowance', label: '', amount: '', calculationMethod: 'fixed', percentageOf: 'basic_salary' })
      fetchData()
    } catch (err) {
      setError('Failed to create rule')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    try {
      await payrollApi.deleteRule(id)
      fetchData()
    } catch (err) {
      setError('Failed to delete rule')
    }
  }

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`
  const categories = form.ruleType === 'earning' ? EARNING_CATEGORIES : DEDUCTION_CATEGORIES

  // Group rules by staff
  const rulesByStaff = rules.reduce<Record<string, PayrollRule[]>>((acc, r) => {
    if (!acc[r.staffName || r.staffId]) acc[r.staffName || r.staffId] = []
    acc[r.staffName || r.staffId].push(r)
    return acc
  }, {} as Record<string, PayrollRule[]>)

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
          <h3 className="text-lg font-semibold">Earnings & Deductions Rules</h3>
          <p className="text-sm text-gray-500">Define recurring earnings and deductions that auto-apply on each payroll run</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Add Rule</Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center animate-pulse">Loading rules...</CardContent></Card>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            No payroll rules configured. Add recurring earnings or deductions for staff.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(rulesByStaff).map(([staffName, staffRules]) => (
            <Card key={staffName}>
              <CardHeader><CardTitle className="text-base">{staffName}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {staffRules.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge className={r.ruleType === 'earning' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {r.ruleType === 'earning' ? '+' : '-'}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{r.label}</p>
                          <p className="text-xs text-gray-500">{r.category.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${r.ruleType === 'earning' ? 'text-green-600' : 'text-red-600'}`}>
                          {r.ruleType === 'earning' ? '+' : '-'}{formatCurrency(r.amount)}
                          {r.calculationMethod === 'percentage' && ` (${r.percentageOf === 'gross' ? 'gross' : 'basic'})`}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Payroll Rule</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Staff Member *</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.staffId}
                onChange={e => {
                  const s = staff.find(st => st.id === e.target.value)
                  setForm(f => ({ ...f, staffId: e.target.value, staffName: s?.name || '' }))
                }}>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.ruleType}
                onChange={e => setForm(f => ({ ...f, ruleType: e.target.value, category: e.target.value === 'earning' ? EARNING_CATEGORIES[0] : DEDUCTION_CATEGORIES[0] }))}>
                <option value="earning">Earning</option>
                <option value="deduction">Deduction</option>
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label>Label *</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Housing Allowance" />
            </div>
            <div>
              <Label>Calculation Method</Label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.calculationMethod}
                onChange={e => setForm(f => ({ ...f, calculationMethod: e.target.value }))}>
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            {form.calculationMethod === 'percentage' && (
              <div>
                <Label>Percentage Of</Label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={form.percentageOf}
                  onChange={e => setForm(f => ({ ...f, percentageOf: e.target.value }))}>
                  <option value="basic_salary">Basic Salary</option>
                  <option value="gross">Gross Pay</option>
                </select>
              </div>
            )}
            <div>
              <Label>{form.calculationMethod === 'percentage' ? 'Percentage (%)' : 'Amount (₦)'} *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.staffId || !form.label || !form.amount}>Add Rule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getAuthHeaders(): Record<string, string> {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return { 'Content-Type': 'application/json', ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) }
  } catch { return { 'Content-Type': 'application/json' } }
}

export default PayrollRules
