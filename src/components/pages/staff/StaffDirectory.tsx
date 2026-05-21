import React, { useState, useEffect } from 'react'
import { UserPlus, Search, Edit, Trash2, AlertCircle, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Badge } from '../../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog'
import { Label } from '../../ui/label'

interface Staff {
  id: string
  staffId: string
  name: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'on_leave'
  email: string
  phone: string
  hireDate: string
  salary?: number
  qualification?: string
  gender?: string
}

const DEPARTMENTS = ['Teaching', 'Administration', 'Finance', 'Security', 'Maintenance', 'ICT', 'Library', 'Health']
const ROLES = ['Teacher', 'Head Teacher', 'Principal', 'Vice Principal', 'Accountant', 'Secretary', 'Librarian', 'Nurse', 'Security Officer', 'IT Officer', 'Cleaner']

export function StaffDirectory() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', role: ROLES[0], department: DEPARTMENTS[0], email: '', phone: '',
    hireDate: '', salary: '', qualification: '', gender: 'male', status: 'active', defaultPassword: ''
  })

  useEffect(() => { fetchStaff() }, [])

  const fetchStaff = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/staff', { headers: { 'x-tenant-id': 'default-tenant' } })
      if (!res.ok) throw new Error('Failed to fetch staff')
      const data = await res.json()
      setStaff(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingStaff(null)
    setForm({ name: '', role: ROLES[0], department: DEPARTMENTS[0], email: '', phone: '', hireDate: '', salary: '', qualification: '', gender: 'male', status: 'active', defaultPassword: '' })
    setShowForm(true)
  }

  const openEdit = (s: Staff) => {
    setEditingStaff(s)
    setForm({
      name: s.name, role: s.role, department: s.department,
      email: s.email, phone: s.phone, hireDate: s.hireDate,
      salary: s.salary?.toString() || '', qualification: s.qualification || '',
      gender: s.gender || '', status: s.status, defaultPassword: ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.role || !form.department || !form.hireDate) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { ...form, salary: form.salary ? Number(form.salary) : undefined }
      if (editingStaff) delete payload.defaultPassword
      const url = editingStaff ? `/api/tenant/staff?id=${editingStaff.id}` : '/api/tenant/staff'
      const method = editingStaff ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'default-tenant' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save staff member')
      setShowForm(false)
      fetchStaff()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this staff member?')) return
    try {
      await fetch(`/api/tenant/staff?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': 'default-tenant' }
      })
      fetchStaff()
    } catch (err) {
      alert('Failed to delete')
    }
  }

  const filtered = staff
    .filter(s => filterDept === 'all' || s.department === filterDept)
    .filter(s => filterStatus === 'all' || s.status === filterStatus)
    .filter(s => {
      const q = searchTerm.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    })

  const statusColor = (s: string) => s === 'active' ? 'bg-green-100 text-green-800' : s === 'on_leave' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
  const statusLabel = (s: string) => s === 'on_leave' ? 'On Leave' : s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <Input placeholder="Search by name, role, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="all">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
            <Button onClick={openAdd}>
              <UserPlus className="w-4 h-4 mr-2" /> Add Staff
            </Button>
          </div>
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
        <Card><CardContent className="p-8 text-center animate-pulse">Loading staff...</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Staff Directory ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No staff members found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Hire Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.staffId}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.role}</TableCell>
                        <TableCell>{s.department}</TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{s.phone}</TableCell>
                        <TableCell>{new Date(s.hireDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(s.status)}>{statusLabel(s.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <Label>Role *</Label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label>Department *</Label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label>Hire Date *</Label>
              <Input type="date" value={form.hireDate} onChange={e => setForm(f => ({ ...f, hireDate: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@school.edu" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234..." />
            </div>
            <div>
              <Label>Salary (₦)</Label>
              <Input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Gender</Label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Qualification</Label>
              <Input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="B.Ed, M.Sc, etc." />
            </div>
            {!editingStaff && (
              <div className="col-span-2">
                <Label>Default Password</Label>
                <Input
                  type="text"
                  value={form.defaultPassword}
                  onChange={e => setForm(f => ({ ...f, defaultPassword: e.target.value }))}
                  placeholder="Leave blank to auto-generate (e.g. firstname@1234)"
                />
                <p className="text-xs text-gray-500 mt-1">Staff will use this to log in to their portal. They can change it later.</p>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.role || !form.department || !form.hireDate}>
              {saving ? 'Saving...' : editingStaff ? 'Update' : 'Add Staff'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StaffDirectory
