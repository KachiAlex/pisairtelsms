import React, { useState, useEffect, useCallback } from 'react'
import { Settings, Save, CheckCircle, AlertCircle, Percent, BookOpen, Users, Clock, FileText, Trash2, Plus, History, Layers } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Slider } from '../ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useTenant } from '../../contexts/TenantContext'
import { useToast } from '../ui/use-toast'
import { tenantApiGet, tenantApiPut, tenantApiPost, tenantApiDelete } from '../../lib/tenantApi'

const defaultWeights = {
  primary: { tests: 30, assignments: 20, projects: 10, exams: 40 },
  jss: { tests: 25, assignments: 15, projects: 10, exams: 50 },
  sss: { tests: 20, assignments: 15, projects: 15, exams: 50 },
}

interface AuditEntry {
  id: number
  action: 'save' | 'publish' | 'override'
  summary: string
  actor_name: string
  created_at: string
}

interface OverrideEntry {
  id: number
  class_name: string
  subject_name: string | null
  config: typeof defaultWeights
  updated_at: string
}

export function CAConfiguration() {
  const { toast } = useToast()
  const { tenantId } = useTenant()
  const [weights, setWeights] = useState(defaultWeights)
  const [publishedWeights, setPublishedWeights] = useState(defaultWeights)
  const [hasChanges, setHasChanges] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(true)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [overrides, setOverrides] = useState<OverrideEntry[]>([])
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [overrideForm, setOverrideForm] = useState({ class_name: '', subject_name: '', config: { ...defaultWeights } })
  const [classes, setClasses] = useState<string[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'config' | 'overrides' | 'audit'>('config')

  // Load CA config, audit log, overrides, and class/subject lists
  const loadAll = useCallback(async () => {
    if (!tenantId) return
    try {
      setLoading(true)
      const [configRes, auditRes, overridesRes, classesRes, subjectsRes] = await Promise.all([
        tenantApiGet(`/api/tenant/ca-config?tenantId=${tenantId}`),
        tenantApiGet(`/api/tenant/ca-config?tenantId=${tenantId}&action=audit`),
        tenantApiGet(`/api/tenant/ca-config?tenantId=${tenantId}&action=overrides`),
        tenantApiGet('/api/tenant/cbt/classes'),
        tenantApiGet('/api/tenant/academics/subjects'),
      ])

      if (configRes.ok) {
        const data = await configRes.json()
        const configData = data.data
        if (configData) {
          const draftOrPublished = configData.draft || configData.published
          if (draftOrPublished) setWeights(draftOrPublished)
          if (configData.published) setPublishedWeights(configData.published)
          setHasDraft(configData.status === 'has_draft')
          setHasChanges(configData.status === 'has_draft')
        }
      }

      if (auditRes.ok) {
        const data = await auditRes.json()
        if (data.data) setAuditLog(data.data)
      }

      if (overridesRes.ok) {
        const data = await overridesRes.json()
        if (data.data) setOverrides(data.data)
      }

      if (classesRes.ok) {
        const data = await classesRes.json()
        if (data.data) {
          const names = [...new Set(data.data.map((c: any) => c.name).filter(Boolean))] as string[]
          setClasses(names)
        }
      }

      if (subjectsRes.ok) {
        const data = await subjectsRes.json()
        if (data.data) {
          const names = data.data.map((s: any) => s.name).filter(Boolean) as string[]
          setSubjects(names)
        }
      }
    } catch (error) {
      console.error('Failed to load CA config:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const updateWeight = (level: keyof typeof weights, type: keyof typeof weights.primary, value: number) => {
    setWeights(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [type]: value
      }
    }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const validateWeights = (levelWeights: typeof weights.primary) => {
    if (!levelWeights) return false
    const total = Object.values(levelWeights).reduce((sum, val) => sum + val, 0)
    return total === 100
  }

  const allValid = Object.values(weights).every(w => validateWeights(w))

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      const response = await tenantApiPut(`/api/tenant/ca-config?tenantId=${tenantId}`, weights)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save CA config')
      }
      setSaveStatus('saved')
      setHasChanges(false)
      setHasDraft(true)
      toast({ title: 'Draft saved', description: 'Configuration saved as draft. Publish to apply to all classes.' })
      loadAll()
    } catch (error) {
      console.error('Error saving CA config:', error)
      setSaveStatus('error')
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const handlePublish = async () => {
    setPublishStatus('publishing')
    try {
      if (hasChanges) {
        await handleSave()
      }
      const response = await tenantApiPost(`/api/tenant/ca-config?tenantId=${tenantId}&action=publish`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to publish')
      }
      const data = await response.json()
      if (data.data) {
        setPublishedWeights(data.data)
        setWeights(data.data)
      }
      setPublishStatus('published')
      setHasChanges(false)
      setHasDraft(false)
      toast({ title: 'CA Configuration published', description: 'Assessment weights are now live for all classes.' })
      setTimeout(() => {
        setPublishDialogOpen(false)
        setPublishStatus('idle')
      }, 1500)
      loadAll()
    } catch (error) {
      setPublishStatus('error')
      toast({ title: 'Publish failed', description: error instanceof Error ? error.message : 'Failed to publish', variant: 'destructive' })
      setPublishStatus('idle')
    }
  }

  const handleSaveOverride = async () => {
    if (!overrideForm.class_name.trim()) {
      toast({ title: 'Validation error', description: 'Class name is required.', variant: 'destructive' })
      return
    }
    if (!allValid) {
      toast({ title: 'Validation error', description: 'All weight levels must total 100%.', variant: 'destructive' })
      return
    }
    try {
      const response = await tenantApiPost(
        `/api/tenant/ca-config?tenantId=${tenantId}&action=override`,
        {
          class_name: overrideForm.class_name,
          subject_name: overrideForm.subject_name || null,
          config: overrideForm.config,
        }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save override')
      }
      toast({ title: 'Override saved', description: `Weights overridden for ${overrideForm.class_name}${overrideForm.subject_name ? ' / ' + overrideForm.subject_name : ''}.` })
      setOverrideDialogOpen(false)
      setOverrideForm({ class_name: '', subject_name: '', config: { ...defaultWeights } })
      loadAll()
    } catch (error) {
      toast({ title: 'Override failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const handleDeleteOverride = async (overrideId: number) => {
    try {
      const response = await tenantApiDelete(`/api/tenant/ca-config?tenantId=${tenantId}&action=override&id=${overrideId}`)
      if (!response.ok) {
        throw new Error('Failed to delete override')
      }
      toast({ title: 'Override removed', description: 'Class override has been deleted.' })
      loadAll()
    } catch (error) {
      toast({ title: 'Delete failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    }
  }

  // Impact preview: compare draft vs published weights
  const changedLevels = Object.keys(weights).filter(level =>
    JSON.stringify(weights[level as keyof typeof weights]) !== JSON.stringify(publishedWeights[level as keyof typeof weights])
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Assessment setup</p>
            <h1 className="text-2xl font-bold text-gray-900">CA configuration</h1>
            <p className="text-sm text-gray-600">Configure assessment weights for each class level.</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const WeightConfigurator = ({ level, levelName }: { level: keyof typeof weights, levelName: string }) => {
    const levelWeights = weights[level] || defaultWeights[level]
    const publishedLevelWeights = publishedWeights[level] || defaultWeights[level]
    const isValid = validateWeights(levelWeights)
    const isChanged = JSON.stringify(levelWeights) !== JSON.stringify(publishedLevelWeights)

    return (
      <Card className={!isValid ? 'border-amber-200 bg-amber-50/30' : isChanged ? 'border-red-200' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {levelName}
            {!isValid && <AlertCircle className="h-4 w-4 text-amber-500" />}
            {isChanged && isValid && <Badge variant="secondary" className="text-[10px]">Modified</Badge>}
          </CardTitle>
          <CardDescription>
            Set assessment weights for {levelName.toLowerCase()} level classes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isValid && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Weights must total 100%. Current total: {Object.values(levelWeights || {}).reduce((sum, val) => sum + val, 0)}%
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {Object.entries(levelWeights || {}).map(([type, value]) => {
              const publishedValue = (publishedLevelWeights as any)?.[type] ?? value
              const isValueChanged = value !== publishedValue
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium capitalize flex items-center gap-2">
                      {type === 'tests' ? 'Tests' :
                       type === 'assignments' ? 'Assignments' :
                       type === 'projects' ? 'Projects' : 'Final Exams'}
                      {isValueChanged && (
                        <span className="text-[10px] text-gray-400 line-through">{publishedValue}%</span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => updateWeight(level, type as keyof typeof levelWeights, parseInt(e.target.value) || 0)}
                        className={`w-16 h-8 text-center ${isValueChanged ? 'border-red-300 text-red-600 font-semibold' : ''}`}
                      />
                      <Percent className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([val]) => updateWeight(level, type as keyof typeof levelWeights, val)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Weight:</span>
              <span className={`font-semibold ${isValid ? 'text-green-600' : 'text-amber-600'}`}>
                {Object.values(levelWeights || {}).reduce((sum, val) => sum + val, 0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Assessment setup</p>
          <h1 className="text-2xl font-bold text-gray-900">CA configuration</h1>
          <p className="text-sm text-gray-600">Configure assessment weights for each class level.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasChanges && (
            <Button onClick={handleSave} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Saving...' :
               saveStatus === 'saved' ? <><CheckCircle className="h-4 w-4 mr-2" /> Saved</> :
               saveStatus === 'error' ? 'Error saving' :
               <><Save className="h-4 w-4 mr-2" /> Save draft</>}
            </Button>
          )}
          <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={hasChanges || !allValid}>
                <Users className="h-4 w-4 mr-2" /> Publish to classes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Publish CA Configuration</DialogTitle>
                <DialogDescription>
                  This will apply the current configuration to all classes. Review the impact below before publishing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Impact Preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-red-600" /> Impact Preview
                  </h4>
                  {changedLevels.length === 0 ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                      No changes detected — draft matches the currently published configuration.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {changedLevels.map(level => {
                        const levelKey = level as keyof typeof weights
                        const oldW = publishedWeights[levelKey]
                        const newW = weights[levelKey]
                        return (
                          <div key={level} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-semibold text-gray-900 capitalize mb-2">{level}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-gray-500 mb-1">Current (published)</p>
                                {Object.entries(oldW).map(([k, v]) => (
                                  <div key={k} className="flex justify-between">
                                    <span className="capitalize">{k}</span>
                                    <span className="font-medium">{v}%</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <p className="text-red-600 mb-1">New (draft)</p>
                                {Object.entries(newW).map(([k, v]) => (
                                  <div key={k} className="flex justify-between">
                                    <span className="capitalize">{k}</span>
                                    <span className="font-semibold text-red-600">{v}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <p className="font-semibold">Immediate</p>
                    <p className="text-xs text-gray-600">Takes effect</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Settings className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <p className="font-semibold">Auto-sync</p>
                    <p className="text-xs text-gray-600">Results updated</p>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">This action will immediately update assessment calculations for all active classes.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePublish} disabled={publishStatus === 'publishing'}>
                  {publishStatus === 'publishing' ? 'Publishing...' :
                   publishStatus === 'published' ? <><CheckCircle className="h-4 w-4 mr-2" /> Published</> :
                   'Publish Configuration'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className={`rounded-full w-10 h-10 flex items-center justify-center ${hasDraft ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Current status</p>
            <p className="text-lg font-semibold text-gray-900">
              {hasDraft ? 'Draft pending' : 'Published'}
            </p>
            <p className="text-xs text-gray-500">
              {hasDraft ? 'Publish to apply changes' : 'No pending changes'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-red-50 text-red-600 w-10 h-10 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Validation status</p>
            <p className="text-lg font-semibold text-gray-900">
              {allValid ? 'Valid' : 'Needs fixing'}
            </p>
            <p className="text-xs text-gray-500">All weights must = 100%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Active overrides</p>
            <p className="text-lg font-semibold text-gray-900">{overrides.length}</p>
            <p className="text-xs text-gray-500">Per-class custom configs</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'config' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          <Settings className="h-4 w-4 inline mr-2" /> Weight Configuration
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overrides' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          <Layers className="h-4 w-4 inline mr-2" /> Class Overrides ({overrides.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'audit' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          <History className="h-4 w-4 inline mr-2" /> Audit Trail
        </button>
      </div>

      {/* Tab: Config */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {hasDraft && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have an unpublished draft. Changes will not affect classes until you publish.
              </AlertDescription>
            </Alert>
          )}
          <WeightConfigurator level="primary" levelName="Primary School" />
          <WeightConfigurator level="jss" levelName="Junior Secondary" />
          <WeightConfigurator level="sss" levelName="Senior Secondary" />
        </div>
      )}

      {/* Tab: Overrides */}
      {activeTab === 'overrides' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Per-class overrides</CardTitle>
                <CardDescription>Customize assessment weights for specific classes or subjects.</CardDescription>
              </div>
              <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Add override
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Class Override</DialogTitle>
                    <DialogDescription>Set custom assessment weights for a specific class or subject.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Class</Label>
                      <Select
                        value={overrideForm.class_name}
                        onValueChange={(v) => setOverrideForm(prev => ({ ...prev, class_name: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subject (optional — leave empty for all subjects in class)</Label>
                      <Select
                        value={overrideForm.subject_name}
                        onValueChange={(v) => setOverrideForm(prev => ({ ...prev, subject_name: v === '__all__' ? '' : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All subjects</SelectItem>
                          {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-sm font-medium text-gray-900">Weight Configuration</p>
                      {(['primary', 'jss', 'sss'] as const).map(level => (
                        <div key={level} className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-gray-500">{level}</p>
                          <div className="grid grid-cols-4 gap-2">
                            {(['tests', 'assignments', 'projects', 'exams'] as const).map(type => (
                              <div key={type}>
                                <Label className="text-[10px] capitalize">{type}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={overrideForm.config[level][type]}
                                  onChange={(e) => setOverrideForm(prev => ({
                                    ...prev,
                                    config: {
                                      ...prev.config,
                                      [level]: {
                                        ...prev.config[level],
                                        [type]: parseInt(e.target.value) || 0
                                      }
                                    }
                                  }))}
                                  className="w-full h-8 text-center text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveOverride}>Save Override</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {overrides.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No overrides configured. All classes use the default weights.</p>
              </div>
            ) : (
              overrides.map(ov => (
                <div key={ov.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {ov.class_name}
                      {ov.subject_name && <span className="text-gray-500 font-normal"> / {ov.subject_name}</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated {new Date(ov.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      {Object.entries(ov.config).map(([level, w]) =>
                        `${level}: ${Object.values(w).reduce((s, v) => s + v, 0)}%`
                      ).join(' | ')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOverride(ov.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration history</CardTitle>
            <CardDescription>Every save, publish, and override is logged with actor context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No changes logged yet.</p>
              </div>
            ) : (
              auditLog.map(entry => (
                <div key={entry.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      entry.action === 'publish' ? 'bg-green-50 text-green-600' :
                      entry.action === 'override' ? 'bg-purple-50 text-purple-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {entry.action === 'publish' ? <CheckCircle className="h-4 w-4" /> :
                       entry.action === 'override' ? <Layers className="h-4 w-4" /> :
                       <Save className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.summary}</p>
                      <p className="text-xs text-gray-500">by {entry.actor_name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CAConfiguration
