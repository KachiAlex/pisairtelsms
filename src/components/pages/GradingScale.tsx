import React, { useState, useEffect } from 'react'
import { Scale, Save, ShieldCheck, Calculator, FileText, ArrowUpWideNarrow, Loader2, AlertCircle, Plus, Trash2, CheckCircle2, History, RefreshCcw, Settings2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useToast } from '../ui/use-toast'
import { getAuthFromStorage } from '../../lib/auth'

interface GradeBand {
  id: string
  grade: string
  min_score: number
  max_score: number
  grade_point: number
  remark: string
}

interface GradingScaleData {
  id: string
  name: string
  type: 'primary' | 'secondary' | 'equivalency'
  version: number
  status: 'live' | 'draft'
  minimum_pass_mark?: number
  distinction_threshold?: number
  remediation_trigger?: number
  created_at: string
  bands?: GradeBand[]
}

const statusColors: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-blue-100 text-blue-700 border-blue-200',
}

export function GradingScale() {
  const { toast } = useToast()
  const [scales, setScales] = useState<GradingScaleData[]>([])
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('list')
  
  const [newScaleName, setNewScaleName] = useState('')
  const [creating, setCreating] = useState(false)

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

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [scalesRes, auditRes] = await Promise.all([
        fetchWithAuth('/api/tenant/grading-scales'),
        fetchWithAuth('/api/tenant/grading-scales?id=audit'),
      ])
      setScales(scalesRes.data || [])
      setAuditLog(auditRes.data || [])
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load grading system')
      // Mock data for UI development
      if (scales.length === 0) {
        setScales([
          { 
            id: '1', name: 'Standard WAEC Scale', type: 'secondary', version: 1, status: 'live', created_at: new Date().toISOString(),
            minimum_pass_mark: 40, distinction_threshold: 75, remediation_trigger: 30,
            bands: [
              { id: 'b1', grade: 'A1', min_score: 75, max_score: 100, grade_point: 5.0, remark: 'Excellent' },
              { id: 'b2', grade: 'B2', min_score: 70, max_score: 74, grade_point: 4.0, remark: 'Very Good' },
              { id: 'b3', grade: 'C6', min_score: 50, max_score: 64, grade_point: 3.0, remark: 'Credit' },
              { id: 'b4', grade: 'F9', min_score: 0, max_score: 39, grade_point: 0.0, remark: 'Fail' },
            ]
          },
          { id: '2', name: 'Primary Discovery Scale', type: 'primary', version: 2, status: 'draft', created_at: new Date().toISOString() },
        ]);
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateScale = async () => {
    if (!newScaleName.trim()) return
    setCreating(true)
    try {
      const result = await fetchWithAuth('/api/tenant/grading-scales', {
        method: 'POST',
        body: JSON.stringify({ name: newScaleName, type: 'primary' }),
      })
      setScales(prev => [result.data, ...prev])
      setNewScaleName('')
      toast({ title: 'Scale created', description: `"${newScaleName}" added as a draft.` })
    } catch (err) {
      toast({ title: 'Creation failed', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async (scaleId: string) => {
    try {
      await fetchWithAuth(`/api/tenant/grading-scales?id=${scaleId}&action=publish`, {
        method: 'POST',
      })
      await loadData()
      toast({ title: 'Scale published', description: 'Now active for result computation.' })
    } catch (err) {
      toast({ title: 'Publish failed', variant: 'destructive' })
    }
  }

  if (loading && scales.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Grading Scale</h1>
          <p className="text-sm text-gray-600">Control grade bands, GPA weights, and equivalency mappings for every division.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md">
            <ArrowUpWideNarrow className="h-4 w-4 mr-2" /> Export Scales
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Scales</p>
              <p className="text-2xl font-bold text-gray-900">{scales.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Live Scales</p>
              <p className="text-2xl font-bold text-gray-900">{scales.filter(s => s.status === 'live').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">GPA Formula</p>
              <p className="text-2xl font-bold text-gray-900">Standard 5.0</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Last Audit</p>
              <p className="text-2xl font-bold text-gray-900">Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl w-fit">
          <TabsTrigger value="list" className="rounded-lg px-6 py-2">Grading Scales</TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg px-6 py-2">Policy Rules</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg px-6 py-2">Audit Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0 space-y-6">
          <Card className="border-none ring-1 ring-gray-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Catalog</CardTitle>
                <CardDescription>Manage your school's grading definitions and score boundaries.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Quick Search..." 
                  className="h-8 w-48 text-xs rounded-lg"
                />
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('rules')}><Settings2 className="w-4 h-4 mr-2" /> Global Rules</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <Input
                  placeholder="Create new scale (e.g. Cambridge IGCSE)..."
                  value={newScaleName}
                  onChange={(e) => setNewScaleName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateScale()}
                  className="bg-white rounded-xl border-none shadow-sm"
                />
                <Button onClick={handleCreateScale} disabled={creating || !newScaleName.trim()} className="bg-red-600 hover:bg-red-700 text-white rounded-xl shrink-0">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Scale
                </Button>
              </div>

              <div className="space-y-6">
                {scales.map((scale) => (
                  <Card key={scale.id} className="border-none ring-1 ring-gray-100 overflow-hidden group">
                    <div className="bg-gray-50/50 px-6 py-4 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border shadow-sm group-hover:scale-110 transition-transform">
                          <Calculator className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{scale.name}</h4>
                          <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">
                            <span>{scale.type}</span>
                            <span>•</span>
                            <span>Version {scale.version}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${statusColors[scale.status] || 'bg-gray-100'}`}>
                          {scale.status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-white hover:bg-white border-b border-gray-50">
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10 px-6">Grade</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10">Score Range</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10 text-center">Grade Point</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest h-10 px-6">Remark</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scale.bands?.map((band) => (
                            <TableRow key={band.id} className="hover:bg-gray-50/30 border-b border-gray-50/50">
                              <TableCell className="font-bold text-gray-900 px-6 py-3">{band.grade}</TableCell>
                              <TableCell className="text-sm text-gray-600">
                                <Badge variant="outline" className="font-mono text-[10px] rounded-md">{band.min_score}% - {band.max_score}%</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm font-bold text-blue-600">{band.grade_point.toFixed(1)}</span>
                              </TableCell>
                              <TableCell className="px-6 text-sm text-gray-500 italic">{band.remark}</TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-gray-400 text-xs italic">No bands configured. Click to add bands.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <div className="p-4 flex justify-between items-center bg-gray-50/20">
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-gray-500 hover:text-blue-600">
                          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Grade Band
                        </Button>
                        {scale.status === 'draft' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 px-4" onClick={() => handlePublish(scale.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Publish Version
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-0 grid gap-6 md:grid-cols-2">
           <Card className="border-none ring-1 ring-gray-100 shadow-sm">
             <CardHeader>
               <CardTitle className="text-lg">Equivalency Sets</CardTitle>
               <CardDescription>Map scores to regional reporting standards.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {scales.filter(s => s.type === 'equivalency').length === 0 ? (
                 <div className="text-center py-10 text-gray-400">
                    <ArrowUpWideNarrow className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No sets configured.</p>
                    <Button variant="link" className="text-blue-600 mt-2 text-xs">Configure Standards</Button>
                 </div>
               ) : (
                 scales.filter(s => s.type === 'equivalency').map(s => (
                   <div key={s.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                     <p className="font-bold text-gray-900">{s.name}</p>
                     <Badge variant="secondary">Active</Badge>
                   </div>
                 ))
               )}
             </CardContent>
           </Card>

           <Card className="border-none ring-1 ring-gray-100 shadow-sm">
             <CardHeader>
               <CardTitle className="text-lg">Operational Thresholds</CardTitle>
               <CardDescription>Rules derived from active grading scales.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {scales.filter(s => s.status === 'live').map(scale => (
                 <div key={scale.id} className="space-y-3 p-4 rounded-2xl bg-blue-50/30 border border-blue-100">
                    <p className="text-xs font-bold text-blue-900 uppercase tracking-widest">{scale.name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-blue-50 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Min Pass</p>
                        <p className="text-lg font-extrabold text-gray-900">{scale.minimum_pass_mark || 40}%</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-blue-50 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Distinction</p>
                        <p className="text-lg font-extrabold text-emerald-600">{scale.distinction_threshold || 75}%</p>
                      </div>
                    </div>
                 </div>
               ))}
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
           <Card className="border-none ring-1 ring-gray-100 shadow-sm">
             <CardHeader>
               <CardTitle>Audit History</CardTitle>
               <CardDescription>Regulatory log of all grading policy changes.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               {auditLog.length === 0 ? (
                 <div className="text-center py-20">
                    <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500">No regulatory events recorded yet.</p>
                 </div>
               ) : (
                 auditLog.map((entry, idx) => (
                   <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <div className="p-2.5 bg-white border shadow-sm rounded-xl">
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-gray-900">{entry.performed_by || 'Admin Hub'}</p>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(entry.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{entry.description || entry.action}</p>
                        <Badge variant="outline" className="mt-2 text-[8px] font-bold uppercase py-0">{entry.context || 'System'}</Badge>
                      </div>
                   </div>
                 ))
               )}
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <div className="rounded-3xl border border-red-100 bg-red-50/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-red-100 rounded-2xl text-red-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-red-900 text-lg leading-tight">Academic Integrity Guardrails</h3>
            <p className="text-red-700/80 text-sm max-w-md mt-1">
              Grading scale changes require two-factor authorization and are locked 24 hours before report generation.
            </p>
          </div>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6">
          View Integrity Logs
        </Button>
      </div>
    </div>
  )
}
export default GradingScale;

