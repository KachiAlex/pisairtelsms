import React, { useState, useEffect } from 'react'
import { Paintbrush, Upload, ImageIcon, Palette, Layers, Wand2, AlertCircle, Globe, Download, Loader } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'

const typographyStack = [
  { layer: 'Headings', font: 'Space Grotesk', weights: '500-700', usage: 'Page titles, widget headers' },
  { layer: 'Body', font: 'Inter', weights: '400-500', usage: 'Paragraph copy, table cells' },
  { layer: 'Accent', font: 'Libre Baskerville', weights: '400', usage: 'Certificates, transcripts' },
]

const portalThemes = [
  { id: 'guardian', label: 'Guardian portal', preview: 'Deep blue hero + accent gradient', status: 'Live' },
  { id: 'teacher', label: 'Teacher workspace', preview: 'Slate base + emerald highlights', status: 'Configured' },
  { id: 'student', label: 'Student portal', preview: 'Minimal light mode', status: 'Draft' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  Active: 'default',
  Review: 'warning',
  Live: 'default',
  Configured: 'secondary',
  Draft: 'secondary',
}

export function SchoolBranding() {
  const [branding, setBranding] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolMotto: '',
    primaryColor: '#1E3A8A',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
  })

  useEffect(() => {
    loadBranding()
  }, [])

  const loadBranding = () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const config = brandingApi.get('tenant-1')
      const config = {
        id: '1',
        tenantId: 'tenant-1',
        schoolName: 'Your School',
        schoolMotto: 'Excellence in Education',
        primaryColor: '#1E3A8A',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        logoUrl: null,
        logoFileName: null,
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system',
      }
      setBranding(config)
      setFormData({
        schoolName: config.schoolName,
        schoolMotto: config.schoolMotto || '',
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branding')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      // TODO: Replace with actual API call
      // const updated = brandingApi.upsert('tenant-1', 'user-1', formData)
      const updated = { ...branding, ...formData, updatedAt: new Date() }
      setBranding(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (branding) {
      setFormData({
        schoolName: branding.schoolName,
        schoolMotto: branding.schoolMotto || '',
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const colorPalette = [
    { label: 'Primary', hex: formData.primaryColor, usage: 'Buttons, links, active states' },
    { label: 'Secondary', hex: formData.secondaryColor, usage: 'Success states, highlight cards' },
    { label: 'Accent', hex: formData.accentColor, usage: 'Warnings, analytics badges' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900">School branding</h1>
          <p className="text-sm text-gray-600">Control logos, colors, typography, and portal themes from one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <Upload className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <Paintbrush className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save changes'}
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
              <Palette className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Active color palette</p>
            <p className="text-3xl font-semibold text-gray-900">3 swatches</p>
            <p className="text-xs text-gray-500">Updated {branding?.updatedAt ? new Date(branding.updatedAt).toLocaleDateString() : 'today'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-emerald-50 text-emerald-600 w-10 h-10 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Portal themes</p>
            <p className="text-3xl font-semibold text-gray-900">3</p>
            <p className="text-xs text-gray-500">Guardian • Staff • Student</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-amber-50 text-amber-600 w-10 h-10 flex items-center justify-center">
              <ImageIcon className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Version</p>
            <p className="text-3xl font-semibold text-gray-900">v{branding?.version || 1}</p>
            <p className="text-xs text-gray-500">Current active version</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <Wand2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Status</p>
            <p className="text-3xl font-semibold text-gray-900">{branding?.isActive ? 'Active' : 'Inactive'}</p>
            <p className="text-xs text-gray-500">Configuration status</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
          <CardDescription>Update your school name and motto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
            <Input
              value={formData.schoolName}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              placeholder="Enter school name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School Motto</label>
            <Input
              value={formData.schoolMotto}
              onChange={(e) => setFormData({ ...formData, schoolMotto: e.target.value })}
              placeholder="Enter school motto"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand colors</CardTitle>
          <CardDescription>Adjust palette values and usage rules.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {colorPalette.map((color) => (
            <div key={color.label} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">{color.label}</p>
                <Badge variant="secondary">{color.hex}</Badge>
              </div>
              <div className="rounded-xl h-16 mb-3 flex items-center justify-center" style={{ backgroundColor: color.hex }}>
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => {
                    const newColor = e.target.value
                    if (color.label === 'Primary') {
                      setFormData({ ...formData, primaryColor: newColor })
                    } else if (color.label === 'Secondary') {
                      setFormData({ ...formData, secondaryColor: newColor })
                    } else {
                      setFormData({ ...formData, accentColor: newColor })
                    }
                  }}
                  className="opacity-0 w-full h-full cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-500">{color.usage}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Typography stack</CardTitle>
            <CardDescription>Headings, body copy, and special documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {typographyStack.map((layer) => (
              <div key={layer.layer} className="rounded-2xl border border-gray-100 p-4">
                <p className="font-medium text-gray-900">{layer.layer}</p>
                <p className="text-sm text-gray-600">{layer.font} • {layer.weights}</p>
                <p className="text-xs text-gray-500">{layer.usage}</p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Wand2 className="h-4 w-4 mr-2" /> Sync from Figma
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portal themes</CardTitle>
            <CardDescription>Preview experience layers before publishing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {portalThemes.map((theme) => (
              <div key={theme.id} className="rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{theme.label}</p>
                  <p className="text-sm text-gray-600">{theme.preview}</p>
                </div>
                <Badge variant={statusVariant[theme.status]}> {theme.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Globe className="h-4 w-4 mr-2" /> Theme marketplace
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand assets</CardTitle>
          <CardDescription>Logos and crests synced across apps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {branding?.logoUrl && (
            <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">Primary logo</p>
                <p className="text-sm text-gray-500">File: {branding.logoFileName || 'logo.png'}</p>
                <p className="text-xs text-gray-400">Updated {new Date(branding.updatedAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          )}
          {!branding?.logoUrl && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No logo uploaded yet</p>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full">
            <Upload className="h-4 w-4 mr-2" /> Upload logo
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>Guardian portal shows outdated crest. Deploy refreshed assets before the next PTA announcement.</p>
        </div>
        <Button size="sm">
          <ImageIcon className="h-4 w-4 mr-2" /> Replace crest
        </Button>
      </div>
    </div>
  )
}
export default SchoolBranding;
