import React, { useState, useEffect } from 'react'
import { FileText, Download, Copy, PenSquare, Layers, Share2, Eye, Palette, Loader, AlertCircle, CheckCircle, Plus, X } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog'
import { useToast } from '../ui/use-toast'

const statusVariant: Record<string, 'default' | 'secondary'> = {
  live: 'default',
  Live: 'default',
  draft: 'secondary',
  Draft: 'secondary',
}

function getHeaders() {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`
  return headers
}

const AUDIENCE_OPTIONS = ['parents', 'students', 'staff', 'management']
const FORMAT_OPTIONS = ['PDF', 'Word', 'HTML', 'Excel']

export function ReportTemplates() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    audience: 'parents',
    format: 'PDF',
    description: '',
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/tenant/report-templates', { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed to load templates')
      const json = await res.json()
      setTemplates(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setForm({ name: '', audience: 'parents', format: 'PDF', description: '' })

  const handleCreateTemplate = async () => {
    if (!form.name.trim()) return
    try {
      setCreating(true)
      const res = await fetch('/api/tenant/report-templates', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create template')
      const json = await res.json()
      setTemplates(prev => [json.data, ...prev])
      setModalOpen(false)
      resetForm()
      toast({ title: 'Template created', description: `"${json.data?.name || form.name}" was added as a draft.` })
    } catch (err) {
      toast({ title: 'Failed to create template', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleExportList = () => {
    const headers = ['Name', 'Audience', 'Format', 'Version', 'Status', 'Created At']
    const rows = templates.map(t => [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      t.audience || '',
      t.format || '',
      `v${t.version || 1}`,
      t.status || '',
      t.created_at || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `report-templates-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({ title: 'Export ready', description: `${templates.length} templates exported as CSV.` })
  }

  const handlePublish = async (templateId: string, templateName: string) => {
    try {
      const res = await fetch(`/api/tenant/report-templates?id=${templateId}&action=publish`, {
        method: 'POST', headers: getHeaders(),
      })
      if (!res.ok) throw new Error('Failed to publish template')
      await loadTemplates()
      toast({ title: 'Template published', description: `"${templateName}" is now live.` })
    } catch (err) {
      toast({ title: 'Publish failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleDownloadTemplate = (template: any) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safeName = (template.name || 'template').replace(/[^a-z0-9]/gi, '-').toLowerCase()
    link.download = `${safeName}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({ title: 'Template exported', description: `"${template.name}" downloaded as JSON.` })
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    try {
      const res = await fetch(`/api/tenant/report-templates?id=${templateId}`, {
        method: 'DELETE', headers: getHeaders(),
      })
      if (!res.ok) throw new Error('Failed to delete template')
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      toast({ title: 'Template deleted', description: `"${templateName}" was removed.` })
    } catch (err) {
      toast({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900">Report templates</h1>
          <p className="text-sm text-gray-600">Design, version, and deploy academic report layouts to every channel.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" /> Duplicate template
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create template
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Create Template Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create report template</DialogTitle>
            <DialogDescription>Set up the basics — you can customise fields and layout after creation.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template name <span className="text-red-500">*</span></Label>
              <Input
                id="tpl-name"
                placeholder="e.g. End of Term Report — JSS3"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreateTemplate()}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-audience">Audience</Label>
                <select
                  id="tpl-audience"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.audience}
                  onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                >
                  {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-format">Output format</Label>
                <select
                  id="tpl-format"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.format}
                  onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                >
                  {FORMAT_OPTIONS.map(fmt => <option key={fmt} value={fmt}>{fmt}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <textarea
                id="tpl-desc"
                rows={3}
                placeholder="Brief notes about this template's purpose..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" disabled={creating}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateTemplate} disabled={creating || !form.name.trim()}>
              {creating ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Active templates</p>
            <p className="text-3xl font-semibold text-gray-900">{templates.filter(t => t.status === 'live').length}</p>
            <p className="text-xs text-gray-500">Grouped by audience</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <Share2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Total templates</p>
            <p className="text-3xl font-semibold text-gray-900">{templates.length}</p>
            <p className="text-xs text-gray-500">All versions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <PenSquare className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Draft templates</p>
            <p className="text-3xl font-semibold text-gray-900">{templates.filter(t => t.status === 'draft').length}</p>
            <p className="text-xs text-gray-500">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <Palette className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Theme sync</p>
            <p className="text-3xl font-semibold text-gray-900">Enabled</p>
            <p className="text-xs text-gray-500">Brand kit auto-applied</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Template catalog</CardTitle>
            <CardDescription>Version history and audience coverage.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExportList} disabled={templates.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export list
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium text-gray-900">{template.name}</TableCell>
                      <TableCell>{template.audience}</TableCell>
                      <TableCell>{template.format}</TableCell>
                      <TableCell>v{template.version}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[template.status] || 'secondary'}>{template.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {template.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => handlePublish(template.id, template.name)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Publish
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadTemplate(template)}>
                            <Download className="h-3 w-3 mr-1" /> Export
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id, template.name)}>
                            <X className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-gray-700">No templates yet</p>
              <p className="text-sm mt-1">Click <strong>Create template</strong> to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5" />
          <p>Create and manage report templates to customize academic reports for different audiences.</p>
        </div>
      </div>
    </div>
  )
}
export default ReportTemplates;
