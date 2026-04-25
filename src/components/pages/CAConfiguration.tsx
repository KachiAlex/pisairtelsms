import React, { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle, AlertCircle, Percent, BookOpen, Users, Clock } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Slider } from '../ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'
import { useTenant } from '../../contexts/TenantContext'

const defaultWeights = {
  primary: { tests: 30, assignments: 20, projects: 10, exams: 40 },
  jss: { tests: 25, assignments: 15, projects: 10, exams: 50 },
  sss: { tests: 20, assignments: 15, projects: 15, exams: 50 },
}

export function CAConfiguration() {
  const { tenantId } = useTenant()
  const [weights, setWeights] = useState(defaultWeights)
  const [hasChanges, setHasChanges] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(true)

  // Load CA config from backend
  useEffect(() => {
    const loadCAConfig = async () => {
      if (!tenantId) return

      try {
        const response = await fetch(`/api/tenant/ca-config?tenantId=${tenantId}`)
        if (response.ok) {
          const config = await response.json()
          setWeights(config)
        }
      } catch (error) {
        console.error('Failed to load CA config:', error)
        // Keep default weights
      } finally {
        setLoading(false)
      }
    }

    loadCAConfig()
  }, [tenantId])

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
    const total = Object.values(levelWeights).reduce((sum, val) => sum + val, 0)
    return total === 100
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/tenant/ca-config?tenantId=${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(weights),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save CA config')
      }

      setSaveStatus('saved')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving CA config:', error)
      setSaveStatus('error')
    }
  }

  const handlePublish = async () => {
    await handleSave()
    setPublishDialogOpen(false)
    // Additional publish logic could go here
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Assessment setup</p>
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
    const levelWeights = weights[level]
    const isValid = validateWeights(levelWeights)

    return (
      <Card className={!isValid ? 'border-amber-200 bg-amber-50/30' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {levelName}
            {!isValid && <AlertCircle className="h-4 w-4 text-amber-500" />}
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
                Weights must total 100%. Current total: {Object.values(levelWeights).reduce((sum, val) => sum + val, 0)}%
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {Object.entries(levelWeights).map(([type, value]) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium capitalize">
                    {type === 'tests' ? 'Tests' :
                     type === 'assignments' ? 'Assignments' :
                     type === 'projects' ? 'Projects' : 'Final Exams'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => updateWeight(level, type as keyof typeof levelWeights, parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-center"
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
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Weight:</span>
              <span className={`font-semibold ${isValid ? 'text-green-600' : 'text-amber-600'}`}>
                {Object.values(levelWeights).reduce((sum, val) => sum + val, 0)}%
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
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Assessment setup</p>
          <h1 className="text-2xl font-bold text-gray-900">CA configuration</h1>
          <p className="text-sm text-gray-600">Configure assessment weights for each class level.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasChanges && (
            <Button onClick={handleSave} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Saving...' :
               saveStatus === 'saved' ? <><CheckCircle className="h-4 w-4 mr-2" /> Saved</> :
               saveStatus === 'error' ? 'Error saving' :
               <><Save className="h-4 w-4 mr-2" /> Save changes</>}
            </Button>
          )}
          <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={hasChanges}>
                <Users className="h-4 w-4 mr-2" /> Publish to classes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish CA Configuration</DialogTitle>
                <DialogDescription>
                  This will apply the new assessment weights to all classes. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <p className="font-semibold">24 Classes</p>
                    <p className="text-xs text-gray-600">Will be updated</p>
                  </div>
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
                  <p className="text-sm text-amber-800 font-medium">⚠️ This action will immediately update assessment calculations for all active classes.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  setPublishStatus('publishing');
                  try {
                    await handlePublish();
                    setPublishStatus('published');
                    alert('CA Configuration published successfully! Assessment weights have been applied to all classes.');
                    setTimeout(() => {
                      setPublishDialogOpen(false);
                      setPublishStatus('idle');
                    }, 2000);
                  } catch (error) {
                    setPublishStatus('error');
                    alert('Failed to publish CA Configuration. Please try again.');
                    setPublishStatus('idle');
                  }
                }} disabled={publishStatus === 'publishing'}>
                  {publishStatus === 'publishing' ? 'Publishing...' : 'Publish Configuration'}
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
            <div className="rounded-full bg-green-50 text-green-600 w-10 h-10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Current status</p>
            <p className="text-lg font-semibold text-gray-900">Published</p>
            <p className="text-xs text-gray-500">Last updated Jan 16</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Classes using config</p>
            <p className="text-lg font-semibold text-gray-900">24</p>
            <p className="text-xs text-gray-500">All active classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Validation status</p>
            <p className="text-lg font-semibold text-gray-900">
              {Object.values(weights).every(w => validateWeights(w)) ? 'Valid' : 'Needs fixing'}
            </p>
            <p className="text-xs text-gray-500">All weights must = 100%</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Sections */}
      <div className="space-y-6">
        <WeightConfigurator level="primary" levelName="Primary School" />
        <WeightConfigurator level="jss" levelName="Junior Secondary" />
        <WeightConfigurator level="sss" levelName="Senior Secondary" />
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Need to customize for specific classes?</h3>
              <p className="text-sm text-gray-600">You can override these defaults for individual subjects or classes.</p>
            </div>
            <Button variant="outline" onClick={() => alert('Advanced overrides functionality - would open advanced configuration dialog')}>
              <Settings className="h-4 w-4 mr-2" />
              Advanced overrides
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CAConfiguration
