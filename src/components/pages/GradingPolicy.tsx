import React, { useState, useEffect } from 'react'
import { Scale, Save, CheckCircle, AlertCircle, BookOpen, Users, Award, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Alert, AlertDescription } from '../ui/alert'
import { useTenant } from '../../contexts/TenantContext'

const defaultGradeBands = [
  { grade: 'A1', min: 80, max: 100, remark: 'Distinction', descriptor: 'Exemplary mastery of outcomes' },
  { grade: 'B2', min: 70, max: 79, remark: 'Very Good', descriptor: 'Above grade-level expectations' },
  { grade: 'B3', min: 65, max: 69, remark: 'Good', descriptor: 'Secure understanding with polish needed' },
  { grade: 'C4', min: 60, max: 64, remark: 'Credit', descriptor: 'Meets core outcomes' },
  { grade: 'C5', min: 55, max: 59, remark: 'Credit', descriptor: 'Requires targeted reinforcement' },
  { grade: 'C6', min: 50, max: 54, remark: 'Satisfactory', descriptor: 'Basic proficiency demonstrated' },
  { grade: 'D7', min: 45, max: 49, remark: 'Pass', descriptor: 'Below mastery; remediation recommended' },
  { grade: 'E8', min: 40, max: 44, remark: 'Marginal', descriptor: 'Significant reinforcement required' },
  { grade: 'F9', min: 0, max: 39, remark: 'Fail', descriptor: 'Does not meet minimum outcomes' },
]

const defaultPromotionRules = {
  minimumAverage: 50,
  maxFailedSubjects: 2,
  remediationWeeks: 4,
  electiveDropLimit: 1,
}

export function GradingPolicy() {
  const { tenantId } = useTenant()
  const [gradeBands, setGradeBands] = useState(defaultGradeBands)
  const [promotionRules, setPromotionRules] = useState(defaultPromotionRules)
  const [hasChanges, setHasChanges] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(true)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)

  // Load grading policy from backend
  useEffect(() => {
    const loadGradingPolicy = async () => {
      if (!tenantId) return

      try {
        const response = await fetch(`/api/tenant/ca-config?tenantId=${tenantId}&type=grading-policy`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.gradeBands) {
            setGradeBands(data.gradeBands)
            setPromotionRules(data.promotionRules || defaultPromotionRules)
          }
        }
      } catch (error) {
        console.error('Failed to load grading policy:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGradingPolicy()
  }, [tenantId])

  const updateGradeBand = (index: number, field: keyof typeof gradeBands[0], value: string | number) => {
    setGradeBands(prev => prev.map((band, i) =>
      i === index ? { ...band, [field]: value } : band
    ))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const updatePromotionRule = (field: keyof typeof promotionRules, value: number) => {
    setPromotionRules(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const validateGradeBands = () => {
    for (let i = 0; i < gradeBands.length - 1; i++) {
      if (gradeBands[i].min <= gradeBands[i + 1].max) {
        return false // Overlapping ranges
      }
    }
    return true
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/tenant/ca-config?tenantId=${tenantId}&type=grading-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeBands, promotionRules }),
      })

      if (!response.ok) {
        throw new Error('Failed to save grading policy')
      }

      setSaveStatus('saved')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving grading policy:', error)
      setSaveStatus('error')
    }
  }

  const handlePublish = async () => {
    await handleSave()
    setPublishDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Result governance</p>
            <h1 className="text-2xl font-bold text-gray-900">Grading policy</h1>
            <p className="text-sm text-gray-600">Configure grade bands and promotion rules.</p>
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

  const isValid = validateGradeBands()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Result governance</p>
          <h1 className="text-2xl font-bold text-gray-900">Grading policy</h1>
          <p className="text-sm text-gray-600">Configure grade bands and promotion rules for result computation.</p>
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
                <DialogTitle>Publish Grading Policy</DialogTitle>
                <DialogDescription>
                  This will apply the new grade bands and promotion rules to all result computations.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <Award className="h-5 w-5 mx-auto mb-1 text-red-600" />
                    <p className="font-semibold">9 Grades</p>
                    <p className="text-xs text-gray-600">Configured</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <p className="font-semibold">Immediate</p>
                    <p className="text-xs text-gray-600">Takes effect</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Scale className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <p className="font-semibold">Auto-apply</p>
                    <p className="text-xs text-gray-600">Result computation</p>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">⚠️ This action will immediately update grade calculations and promotion decisions for all students.</p>
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
                    alert('Grading Policy published successfully! New grade bands and promotion rules are now active.');
                    setTimeout(() => {
                      setPublishDialogOpen(false);
                      setPublishStatus('idle');
                    }, 2000);
                  } catch (error) {
                    setPublishStatus('error');
                    alert('Failed to publish Grading Policy. Please try again.');
                    setPublishStatus('idle');
                  }
                }} disabled={publishStatus === 'publishing'}>
                  {publishStatus === 'publishing' ? 'Publishing...' : 'Publish Policy'}
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
            <p className="text-xs text-gray-500 mt-3">Policy status</p>
            <p className="text-lg font-semibold text-gray-900">Published</p>
            <p className="text-xs text-gray-500">Last updated Jan 16</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-red-50 text-red-600 w-10 h-10 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Grade bands</p>
            <p className="text-lg font-semibold text-gray-900">{gradeBands.length}</p>
            <p className="text-xs text-gray-500">A1 - F9 configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`rounded-full w-10 h-10 flex items-center justify-center ${isValid ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Validation status</p>
            <p className="text-lg font-semibold text-gray-900">
              {isValid ? 'Valid' : 'Needs fixing'}
            </p>
            <p className="text-xs text-gray-500">Grade ranges overlap</p>
          </CardContent>
        </Card>
      </div>

      {/* Grade Bands Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Grade Bands Configuration
            {!isValid && <AlertCircle className="h-4 w-4 text-amber-500" />}
          </CardTitle>
          <CardDescription>
            Define score ranges and remarks for each grade level (A1-F9).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isValid && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Grade band ranges are overlapping. Each grade must have a unique score range.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {gradeBands.map((band, index) => (
              <div key={band.grade} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="w-12">
                  <Badge variant="secondary">{band.grade}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={band.min}
                    onChange={(e) => updateGradeBand(index, 'min', parseInt(e.target.value) || 0)}
                    className="w-16 text-center"
                  />
                  <span className="text-gray-500">-</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={band.max}
                    onChange={(e) => updateGradeBand(index, 'max', parseInt(e.target.value) || 0)}
                    className="w-16 text-center"
                  />
                </div>
                <Select value={band.remark} onValueChange={(value) => updateGradeBand(index, 'remark', value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Distinction">Distinction</SelectItem>
                    <SelectItem value="Very Good">Very Good</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                    <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Marginal">Marginal</SelectItem>
                    <SelectItem value="Fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={band.descriptor}
                  onChange={(e) => updateGradeBand(index, 'descriptor', e.target.value)}
                  placeholder="Grade descriptor"
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Promotion Rules Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Promotion Rules
          </CardTitle>
          <CardDescription>
            Set thresholds for student promotion and remediation requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-average">Minimum Average for Promotion (%)</Label>
              <Input
                id="min-average"
                type="number"
                min="0"
                max="100"
                value={promotionRules.minimumAverage}
                onChange={(e) => updatePromotionRule('minimumAverage', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-failed">Maximum Failed Subjects Allowed</Label>
              <Input
                id="max-failed"
                type="number"
                min="0"
                max="10"
                value={promotionRules.maxFailedSubjects}
                onChange={(e) => updatePromotionRule('maxFailedSubjects', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remediation">Remediation Period (weeks)</Label>
              <Input
                id="remediation"
                type="number"
                min="1"
                max="12"
                value={promotionRules.remediationWeeks}
                onChange={(e) => updatePromotionRule('remediationWeeks', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elective-drop">Elective Drop Limit (per year)</Label>
              <Input
                id="elective-drop"
                type="number"
                min="0"
                max="5"
                value={promotionRules.electiveDropLimit}
                onChange={(e) => updatePromotionRule('electiveDropLimit', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Need to customize further?</h3>
              <p className="text-sm text-gray-600">Set up subject-specific grading rules or import from external standards.</p>
            </div>
            <Button variant="outline" onClick={() => alert('Advanced grading rules functionality - would open advanced configuration dialog')}>
              <Scale className="h-4 w-4 mr-2" />
              Advanced rules
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GradingPolicy;
