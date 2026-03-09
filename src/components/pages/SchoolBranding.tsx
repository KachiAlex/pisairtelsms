import React from 'react'
import { Paintbrush, Upload, ImageIcon, Palette, Layers, Wand2, AlertCircle, Globe, Download } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'

const colorPalette = [
  { label: 'Primary', hex: '#1E3A8A', usage: 'Buttons, links, active states' },
  { label: 'Accent', hex: '#10B981', usage: 'Success states, highlight cards' },
  { label: 'Support', hex: '#F59E0B', usage: 'Warnings, analytics badges' },
]

const typographyStack = [
  { layer: 'Headings', font: 'Space Grotesk', weights: '500-700', usage: 'Page titles, widget headers' },
  { layer: 'Body', font: 'Inter', weights: '400-500', usage: 'Paragraph copy, table cells' },
  { layer: 'Accent', font: 'Libre Baskerville', weights: '400', usage: 'Certificates, transcripts' },
]

const brandAssets = [
  { id: 'logo-primary', label: 'Primary logo', file: 'scholix-mark-full.svg', owner: 'Design', updated: 'Today 09:20', status: 'Active' },
  { id: 'logo-monochrome', label: 'Monochrome logo', file: 'scholix-mark-mono.svg', owner: 'Design', updated: 'Yesterday', status: 'Active' },
  { id: 'crest', label: 'School crest', file: 'crest.png', owner: 'Heritage Desk', updated: 'Mon', status: 'Review' },
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900">School branding</h1>
          <p className="text-sm text-gray-600">Control logos, colors, typography, and portal themes from one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Upload asset
          </Button>
          <Button>
            <Paintbrush className="h-4 w-4 mr-2" /> Publish theme
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center">
              <Palette className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Active color palette</p>
            <p className="text-3xl font-semibold text-gray-900">3 swatches</p>
            <p className="text-xs text-gray-500">Updated this week</p>
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
            <p className="text-xs text-gray-500 mt-3">Brand assets</p>
            <p className="text-3xl font-semibold text-gray-900">12 files</p>
            <p className="text-xs text-gray-500">Syncs to marketing site</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="rounded-full bg-purple-50 text-purple-600 w-10 h-10 flex items-center justify-center">
              <Wand2 className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 mt-3">Auto theming</p>
            <p className="text-3xl font-semibold text-gray-900">Enabled</p>
            <p className="text-xs text-gray-500">New modules inherit instantly</p>
          </CardContent>
        </Card>
      </div>

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
              <div className="rounded-xl h-16 mb-3" style={{ backgroundColor: color.hex }} />
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
          {brandAssets.map((asset) => (
            <div key={asset.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{asset.label}</p>
                <p className="text-sm text-gray-500">File: {asset.file}</p>
                <p className="text-xs text-gray-400">Owner: {asset.owner} • Updated {asset.updated}</p>
              </div>
              <Badge variant={statusVariant[asset.status] || 'secondary'}>{asset.status}</Badge>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full">
            <Download className="h-4 w-4 mr-2" /> Export brand kit
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
