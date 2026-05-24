import React, { useState, useEffect } from 'react'
import { FileText, Download, Copy, PenSquare, Layers, Share2, Eye, Palette, Loader, AlertCircle, CheckCircle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'

const statusVariant: Record<string, 'default' | 'secondary'> = {
  live: 'default',
  Live: 'default',
  draft: 'secondary',
  Draft: 'secondary',
}

const TENANT_ID = localStorage.getItem('tenantId') || 'default-tenant'
const HEADERS = { 'x-tenant-id': TENANT_ID, 'Content-Type': 'application/json' }

export function ReportTemplates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/tenant/report-templates', { headers: HEADERS })
      if (!res.ok) throw new Error('Failed to load templates')
      const json = await res.json()
      setTemplates(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return
    try {
      setCreating(true)
      setError(null)
      const res = await fetch('/api/tenant/report-templates', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ name: newTemplateName, audience: 'parents', format: 'PDF' }),
      })
      if (!res.ok) throw new Error('Failed to create template')
      const json = await res.json()
      setTemplates([json.data, ...templates])
      setNewTemplateName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async (templateId: string) => {
    try {
      const res = await fetch(`/api/tenant/report-templates?id=${templateId}&action=publish`, {
        method: 'POST', headers: HEADERS,
      })
      if (!res.ok) throw new Error('Failed to publish template')
      await loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
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
          <Button>
            <FileText className="h-4 w-4 mr-2" /> Create template
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

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
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4 mr-2" /> Export list
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New template name..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTemplate()}
            />
            <Button onClick={handleCreateTemplate} disabled={creating || !newTemplateName.trim()}>
              {creating ? <Loader className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            </Button>
          </div>
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
                        {template.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handlePublish(template.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Publish
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No templates yet. Create one to get started.</p>
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
