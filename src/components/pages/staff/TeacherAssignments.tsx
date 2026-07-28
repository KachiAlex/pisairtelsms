import React, { useState, useEffect } from 'react'
import { ClipboardList, Plus, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog'
import { getAuthFromStorage } from '../../../lib/auth'

interface Assignment {
  title: string
  description: string
  subject: string
  dueDate: string
  maxScore: number
  type: string
  instructions: string
  createdAt: string
  studentCount: number
}

interface ClassInfo {
  id: string
  name: string
  arm: string
  studentCount: number
}

export function TeacherAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    className: '',
    arm: '',
    dueDate: '',
    type: 'homework',
    maxScore: 100,
    instructions: '',
  })

  const token = getAuthFromStorage()?.token

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/staff/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch assignments')
      const data = await res.json()
      setAssignments(data.assignments || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/staff/classes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch classes')
      const data = await res.json()
      setClasses(data.classes || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (token) {
      fetchAssignments()
      fetchClasses()
    }
  }, [token])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.subject || !form.className || !form.dueDate) {
      setError('Please fill in all required fields')
      return
    }
    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/staff/assignments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          subject: form.subject,
          className: form.className,
          arm: form.arm || undefined,
          dueDate: form.dueDate,
          type: form.type,
          maxScore: Number(form.maxScore),
          instructions: form.instructions,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create assignment')
      }
      const data = await res.json()
      setSuccessMessage(data.message)
      setIsDialogOpen(false)
      setForm({
        title: '',
        description: '',
        subject: '',
        className: '',
        arm: '',
        dueDate: '',
        type: 'homework',
        maxScore: 100,
        instructions: '',
      })
      fetchAssignments()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment')
    } finally {
      setCreating(false)
    }
  }

  const typeColors: Record<string, string> = {
    homework: 'bg-blue-100 text-blue-700',
    project: 'bg-purple-100 text-purple-700',
    essay: 'bg-green-100 text-green-700',
    quiz: 'bg-orange-100 text-orange-700',
    reading: 'bg-pink-100 text-pink-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-4 text-green-700 bg-green-50 rounded-lg">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && !isDialogOpen && (
        <div className="flex items-center gap-2 p-4 text-red-700 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No assignments created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((a, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[a.type] || 'bg-gray-100 text-gray-700'}`}>
                        {a.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{a.subject} · {a.studentCount} students</p>
                    <p className="text-sm text-gray-600">{a.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      Due {new Date(a.dueDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Max score: {a.maxScore}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {error && isDialogOpen && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="className">Class *</Label>
                <select
                  id="className"
                  className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.className}
                  onChange={e => setForm({ ...form, className: e.target.value })}
                  required
                >
                  <option value="">Select class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="arm">Arm</Label>
                <Input id="arm" value={form.arm} onChange={e => setForm({ ...form, arm: e.target.value })} placeholder="e.g. A" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input id="dueDate" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="homework">Homework</option>
                  <option value="project">Project</option>
                  <option value="essay">Essay</option>
                  <option value="quiz">Quiz</option>
                  <option value="reading">Reading</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="maxScore">Max Score</Label>
              <Input id="maxScore" type="number" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: Number(e.target.value) })} min={1} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <textarea
                id="instructions"
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
                rows={3}
                value={form.instructions}
                onChange={e => setForm({ ...form, instructions: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Assignment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
