import React, { useState, useEffect } from 'react'
import { Scale, Edit3, Save, ShieldCheck, Calculator, AlertTriangle, FileText, ArrowUpWideNarrow, Loader } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'
import { Input } from '../ui/input'

const equivalencySets = [
  { id: 'WAEC', status: 'Live', description: 'Nigeria senior secondary examinations equivalence', coverage: 100 },
  { id: 'Cambridge', status: 'Draft', description: 'IGCSE/A-Level translation for transcripts', coverage: 72 },
  { id: 'Local Primary', status: 'Live', description: 'Primary bands for term reports', coverage: 94 },
]

const statusVariant: Record<string, 'default' | 'secondary'> = {
  Live: 'default',
  Draft: 'secondary',
}

export function GradingScale() {
  const [scales, setScales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newScaleName, setNewScaleName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadScales()
  }, [])

  const loadScales = () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const result = gradingScalesApi.list('tenant-1')
      const result = {
        data: [
          {
            id: 'GS-01',
            name: 'Primary Grading Scale',
            type: 'primary',
            version: 1,
            status: 'live',
            bands: [],
            createdAt: new Date(),
          },
        ],
        total: 1,
      }
      setScales(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grading scales')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateScale = async () => {
    if (!newScaleName.trim()) return
    try {
      setCreating(true)
      // TODO: Replace with actual API call
      // const scale = gradingScalesApi.create('tenant-1', 'user-1', { name: newScaleName, type: 'primary', bands: [] })
      const scale = {
        id: `GS-${Date.now()}`,
        name: newScaleName,
        type: 'primary',
        version: 1,
        status: 'draft',
        bands: [],
        createdAt: new Date(),
      }
      setScales([scale, ...scales])
      setNewScaleName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scale')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const liveScales = scales.filter(s => s.status === 'live')
  const draftScales = scales.filter(s => s.status === 'draft')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900">Grading scale</h1>
          <p className="text-sm text-gray-600">Control grade bands, GPA weights, and equivalency mappings for every division.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Edit3 className="h-4 w-4 mr-2" /> Edit ranges
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" /> Publish update
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Grading scales</p>
            <p className="text-3xl font-semibold text-gray-900">{scales.length}</p>
            <p className="text-xs text-gray-500">Primary + Secondary</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <Calculator className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Live scales</p>
            <p className="text-3xl font-semibold text-gray-900">{liveScales.length}</p>
            <p className="text-xs text-gray-500">Active in use</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Draft scales</p>
            <p className="text-3xl font-semibold text-gray-900">{draftScales.length}</p>
            <p className="text-xs text-gray-500">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Open alerts</p>
            <p className="text-3xl font-semibold text-rose-600">0</p>
            <p className="text-xs text-gray-500">All systems normal</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grading scales</CardTitle>
          <CardDescription>Manage all grading scales and versions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New scale name..."
              value={newScaleName}
              onChange={(e) => setNewScaleName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateScale()}
            />
            <Button onClick={handleCreateScale} disabled={creating || !newScaleName.trim()}>
              {creating ? <Loader className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            </Button>
          </div>
          {scales.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scales.map((scale) => (
                    <TableRow key={scale.id}>
                      <TableCell className="font-medium text-gray-900">{scale.name}</TableCell>
                      <TableCell>{scale.type}</TableCell>
                      <TableCell>v{scale.version}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[scale.status] || 'secondary'}>{scale.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(scale.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No grading scales yet. Create one to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equivalency sets</CardTitle>
            <CardDescription>Map Scholix scores to regional reporting standards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {equivalencySets.map((set) => (
              <div key={set.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{set.id}</p>
                  <p className="text-sm text-gray-600">{set.description}</p>
                  <p className="text-xs text-gray-400">Coverage: {set.coverage}% of subjects</p>
                </div>
                <Badge variant={statusVariant[set.status] || 'secondary'}>{set.status}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <ArrowUpWideNarrow className="h-4 w-4 mr-2" /> Import mapping
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy rules</CardTitle>
            <CardDescription>Guardrails consumed by result computation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Minimum pass mark</p>
                <p className="text-sm text-gray-500">45%</p>
              </div>
              <Badge variant="secondary">Owner: Academics</Badge>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Distinction threshold</p>
                <p className="text-sm text-gray-500">80%</p>
              </div>
              <Badge variant="secondary">Owner: Academic Board</Badge>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Remediation trigger</p>
                <p className="text-sm text-gray-500">Average &lt; 50%</p>
              </div>
              <Badge variant="secondary">Owner: Student Support</Badge>
            </div>
            <Button variant="ghost" size="sm" className="w-full">
              <Scale className="h-4 w-4 mr-2" /> Edit policy
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit feed</CardTitle>
          <CardDescription>Every grading scale change is logged with actor context.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">System</p>
              <p className="text-sm text-gray-500">Grading scales initialized</p>
            </div>
            <p className="text-xs text-gray-400">Today</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full">
            <FileText className="h-4 w-4 mr-2" /> Export change log
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Create and configure grading scales to manage academic performance standards.</p>
        </div>
        <Button size="sm">
          <ShieldCheck className="h-4 w-4 mr-2" /> Learn more
        </Button>
      </div>
    </div>
  )
}
export default GradingScale;
