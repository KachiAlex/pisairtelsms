import React, { useState, useEffect } from 'react'
import { FileText, Download, Copy, PenSquare, Layers, Share2, Eye, Palette, Loader2, AlertCircle, CheckCircle2, Plus, X, BarChart3, Clock, Layout, ExternalLink, RefreshCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useToast } from '../ui/use-toast'
import { getAuthFromStorage } from '../../lib/auth'

const statusColors: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-blue-100 text-blue-700 border-blue-200',
  Draft: 'bg-blue-100 text-blue-700 border-blue-200',
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
  const [activeTab, setActiveTab] = useState('templates')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  
  const [form, setForm] = useState({
    name: '',
    audience: 'parents',
    format: 'PDF',
    description: '',
  })

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const auth = getAuthFromStorage();
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };
    if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return response.json();
  };

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchWithAuth('/api/tenant/report-templates')
      setTemplates(result.data || [])
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load templates')
      // Mock data for UI development if API fails
      if (templates.length === 0) {
        setTemplates([
          { id: '1', name: 'Primary School Progress Report', audience: 'parents', format: 'PDF', version: 2, status: 'live', createdAt: new Date().toISOString() },
          { id: '2', name: 'Staff Performance Review', audience: 'management', format: 'HTML', version: 1, status: 'draft', createdAt: new Date().toISOString() },
        ]);
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setForm({ name: '', audience: 'parents', format: 'PDF', description: '' })

  const handleCreateTemplate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const result = await fetchWithAuth('/api/tenant/report-templates', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setTemplates(prev => [result.data, ...prev])
      setModalOpen(false)
      resetForm()
      toast({ title: 'Template created', description: `"${result.data?.name || form.name}" added to catalog.` })
    } catch (err) {
      toast({ title: 'Failed to create', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async (templateId: string, templateName: string) => {
    try {
      await fetchWithAuth(`/api/tenant/report-templates?id=${templateId}&action=publish`, {
        method: 'POST',
      })
      await loadTemplates()
      toast({ title: 'Template published', description: `"${templateName}" is now active.` })
    } catch (err) {
      toast({ title: 'Publish failed', variant: 'destructive' })
    }
  }

  const handleOpenPreview = (template: any) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  }

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Report Templates</h1>
          <p className="text-sm text-gray-600">Design, version, and deploy academic report layouts to every channel.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl">
            <Copy className="h-4 w-4 mr-2" /> Duplicate
          </Button>
          <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Create Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Live Templates</p>
              <p className="text-2xl font-bold text-gray-900">{templates.filter(t => t.status.toLowerCase() === 'live').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Versions</p>
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Channels</p>
              <p className="text-2xl font-bold text-gray-900">4</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Theme Sync</p>
              <p className="text-2xl font-bold text-gray-900 text-emerald-600">Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl w-fit">
          <TabsTrigger value="templates" className="rounded-lg px-6 py-2">Template Catalog</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg px-6 py-2">Usage Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-0 space-y-6">
          <Card className="border-none ring-1 ring-gray-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Catalog</CardTitle>
                <CardDescription>Manage and version control your reporting infrastructure.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadTemplates}><RefreshCcw className="w-4 h-4 mr-2" /> Refresh</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-32 text-gray-500">No templates found</TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => (
                        <TableRow key={template.id} className="group hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-bold text-gray-900">
                            <div>
                              <p>{template.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">ID: {template.id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{template.audience}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">{template.format}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">v{template.version}</TableCell>
                          <TableCell>
                            <Badge className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${statusColors[template.status] || 'bg-gray-100 text-gray-600'}`}>
                              {template.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-8 text-blue-600" onClick={() => handleOpenPreview(template)}><Eye className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 text-emerald-600" onClick={() => handlePublish(template.id, template.name)} disabled={template.status.toLowerCase() === 'live'}><CheckCircle2 className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 text-gray-400"><Download className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none ring-1 ring-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Audience Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {AUDIENCE_OPTIONS.map(a => (
                  <div key={a} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-600 uppercase tracking-widest">
                      <span>{a}</span>
                      <span>{templates.filter(t => t.audience === a).length} Templates</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600" 
                        style={{ width: `${(templates.filter(t => t.audience === a).length / (templates.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-none ring-1 ring-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {templates.slice(0, 3).map((t, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="p-2 bg-white rounded-lg border shadow-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.name} published</p>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">2 hours ago • By Admin</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">New Report Template</DialogTitle>
            <DialogDescription>Define report basic parameters and target audience.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Template Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. End of Term Report"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm(f => ({ ...f, audience: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Format</Label>
                <Select value={form.format} onValueChange={v => setForm(f => ({ ...f, format: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is this template for?"
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={creating || !form.name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Mock Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden p-8 border-inner shadow-inner">
             <div className="bg-white h-full w-full shadow-2xl rounded-sm p-10 space-y-8 relative overflow-y-auto max-w-[500px] mx-auto">
                <div className="flex justify-between items-start border-b pb-6">
                   <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center"><FileText className="text-white w-10 h-10" /></div>
                   <div className="text-right space-y-1">
                      <h3 className="font-bold text-gray-900 text-xl">ACADEMIC REPORT</h3>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Term 1 • 2025/2026</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><p className="text-[8px] uppercase text-gray-400 font-bold">Student</p><p className="text-xs font-bold">Oluwatobi Adeyemi</p></div>
                      <div className="space-y-1"><p className="text-[8px] uppercase text-gray-400 font-bold">Class</p><p className="text-xs font-bold">SS3 Gold</p></div>
                   </div>
                </div>
                <div className="space-y-2 pt-4">
                   <div className="h-6 bg-gray-50 border rounded px-2 flex items-center justify-between"><span className="text-[8px] font-bold">Mathematics</span><span className="text-[8px] font-bold">A+ (92%)</span></div>
                   <div className="h-6 bg-gray-50 border rounded px-2 flex items-center justify-between"><span className="text-[8px] font-bold">English Language</span><span className="text-[8px] font-bold">B (78%)</span></div>
                   <div className="h-6 bg-gray-50 border rounded px-2 flex items-center justify-between"><span className="text-[8px] font-bold">Physics</span><span className="text-[8px] font-bold">A (85%)</span></div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 px-10">
                   <p className="text-[6px] text-gray-300 text-center uppercase tracking-tighter italic">Generated via ScholarX Enterprise Core • ISO 27001 Certified</p>
                </div>
             </div>
          </div>
          <DialogFooter className="pt-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ReportTemplates;

