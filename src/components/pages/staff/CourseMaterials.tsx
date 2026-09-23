import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Loader2, AlertCircle, CheckCircle2, Trash2, ExternalLink, FileText, Video, Music, Link2, Image } from 'lucide-react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog'
import { getAuthFromStorage } from '../../../lib/auth'

interface Material {
  id: string
  title: string
  description: string
  type: 'document' | 'video' | 'audio' | 'link' | 'image'
  url: string
  fileName: string
  fileSize: string
  isPublished: boolean
  subject: string
  className: string
  createdAt: string
}

interface ClassInfo {
  id: string
  name: string
  arm: string
  studentCount: number
  subjects: string[]
}

const TYPE_ICONS: Record<string, any> = {
  document: FileText,
  video: Video,
  audio: Music,
  link: Link2,
  image: Image,
}

export function CourseMaterials() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    className: '',
    arm: '',
    type: 'document',
    url: '',
    fileName: '',
  })

  const token = getAuthFromStorage()?.token

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/staff/materials', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch materials')
      const data = await res.json()
      setMaterials(data.materials || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchMaterials()
    fetch('/api/staff/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { classes: [] })
      .then(d => setClasses(d.classes || []))
      .catch(() => {})
  }, [token])

  const handleClassChange = (value: string) => {
    const cls = classes.find(c => `${c.name}|${c.arm}` === value)
    setForm(f => ({
      ...f,
      className: cls?.name || '',
      arm: cls?.arm || '',
      subject: cls?.subjects?.includes(f.subject) ? f.subject : '',
    }))
  }

  const availableSubjects = (() => {
    const cls = classes.find(c => c.name === form.className && c.arm === form.arm)
    if (cls?.subjects?.length) return cls.subjects
    return [...new Set(classes.flatMap(c => c.subjects || []))]
  })()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.subject || !form.className || !form.url) {
      setError('Title, subject, class, and a link to the material are required')
      return
    }
    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/staff/materials', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          subject: form.subject,
          className: form.className,
          arm: form.arm || undefined,
          type: form.type,
          url: form.url,
          fileName: form.fileName || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to upload material')
      setSuccessMessage(data.message || 'Material published')
      setIsDialogOpen(false)
      setForm({ title: '', description: '', subject: '', className: '', arm: '', type: 'document', url: '', fileName: '' })
      fetchMaterials()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to upload material')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id)
      const res = await fetch(`/api/staff/materials?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setError('Failed to delete material')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Materials</h1>
          <p className="text-gray-600 mt-1">Share documents, videos, and links with your classes. Students see them in their portal instantly.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Material
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No materials yet</p>
            <p className="text-sm text-gray-500 mt-1">Upload your first material — a link to a document, video, or resource — and students in the selected class will see it immediately.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {materials.map(m => {
            const Icon = TYPE_ICONS[m.type] || FileText
            return (
              <div key={m.id} className="p-4 flex items-start gap-3 hover:bg-gray-50">
                <div className="rounded-lg bg-blue-50 p-2.5 shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{m.title}</p>
                  <p className="text-sm text-gray-500">
                    {m.subject}{m.className ? ` · ${m.className}` : ''} · {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                  {m.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Open material"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deleting === m.id}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title="Delete material"
                  >
                    {deleting === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Course Material</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="mat-title">Title *</Label>
              <Input id="mat-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="mat-class">Class *</Label>
              <select
                id="mat-class"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
                value={`${form.className}|${form.arm}`}
                onChange={e => handleClassChange(e.target.value)}
                required
              >
                <option value="|">Select a class</option>
                {classes.map(c => (
                  <option key={`${c.name}|${c.arm}`} value={`${c.name}|${c.arm}`}>
                    {c.name}{c.arm ? ` ${c.arm}` : ''} ({c.studentCount} students)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="mat-subject">Subject *</Label>
              {availableSubjects.length > 0 ? (
                <select
                  id="mat-subject"
                  className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  required
                >
                  <option value="">Select a subject</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <Input id="mat-subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" required />
              )}
            </div>
            <div>
              <Label htmlFor="mat-type">Type</Label>
              <select
                id="mat-type"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as Material['type'] })}
              >
                <option value="document">Document</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="link">Link</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div>
              <Label htmlFor="mat-url">Link to material *</Label>
              <Input id="mat-url" type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…" required />
              <p className="text-xs text-gray-500 mt-1">Paste a link to the file or resource (e.g. Google Drive, school storage, YouTube).</p>
            </div>
            <div>
              <Label htmlFor="mat-desc">Description</Label>
              <textarea
                id="mat-desc"
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
                rows={2}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
