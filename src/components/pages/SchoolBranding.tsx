import { useState, useEffect } from 'react'
import { Paintbrush, Upload, ImageIcon, Palette, Layers, Wand2, AlertCircle, Loader } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'


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

  const loadBranding = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/tenant/branding', {
        headers: { 'x-tenant-id': 'default-tenant', 'x-user-id': 'current-user' },
      })
      if (!response.ok) throw new Error('Failed to load branding')
      const result = await response.json()
      const config = result.data
      setBranding(config)
      setFormData({
        schoolName: config.school_name || config.schoolName || '',
        schoolMotto: config.school_motto || config.schoolMotto || '',
        primaryColor: config.primary_color || config.primaryColor || '#1E3A8A',
        secondaryColor: config.secondary_color || config.secondaryColor || '#10B981',
        accentColor: config.accent_color || config.accentColor || '#F59E0B',
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
      const response = await fetch('/api/tenant/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-tenant',
          'x-user-id': 'current-user',
        },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error('Failed to save branding')
      const result = await response.json()
      setBranding(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (branding) {
      setFormData({
        schoolName: branding.school_name || branding.schoolName || '',
        schoolMotto: branding.school_motto || branding.schoolMotto || '',
        primaryColor: branding.primary_color || branding.primaryColor || '#1E3A8A',
        secondaryColor: branding.secondary_color || branding.secondaryColor || '#10B981',
        accentColor: branding.accent_color || branding.accentColor || '#F59E0B',
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
            <p className="text-xs text-gray-500">Updated {branding?.updated_at || branding?.updatedAt ? new Date(branding.updated_at || branding.updatedAt).toLocaleDateString() : 'Not yet saved'}</p>
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
            <p className="text-3xl font-semibold text-gray-900">v{branding?.version ?? 1}</p>
            <p className="text-xs text-gray-500">Current active version</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <Wand2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Status</p>
            <p className="text-3xl font-semibold text-gray-900">{branding?.is_published || branding?.isActive ? 'Published' : 'Draft'}</p>
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


      <Card>
        <CardHeader>
          <CardTitle>Brand assets</CardTitle>
          <CardDescription>Logos and crests synced across apps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(branding?.logo_url || branding?.logoUrl) ? (
            <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">Primary logo</p>
                <p className="text-sm text-gray-500">File: {branding.logo_file_name || branding.logoFileName || 'logo.png'}</p>
                <p className="text-xs text-gray-400">Updated {new Date(branding.updated_at || branding.updatedAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          ) : (
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

    </div>
  )
}
export default SchoolBranding;
