import { useState, useEffect, useRef, useCallback } from 'react'
import { Paintbrush, Upload, ImageIcon, Palette, Layers, Wand2, AlertCircle, Loader2, X, CheckCircle2, Monitor, Smartphone, RefreshCcw, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { useToast } from '../ui/use-toast'
import { useBranding } from '../../contexts/BrandingContext'
import { getAuthFromStorage } from '../../lib/auth'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_SIZE_MB = 2
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function SchoolBranding() {
  const { toast } = useToast()
  const { refresh: refreshBranding, branding: currentBranding } = useBranding()
  const [branding, setBranding] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolMotto: '',
    schoolAddress: '',
    schoolEmail: '',
    schoolPhone: '',
    primaryColor: '#1E3A8A',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const loadBranding = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchWithAuth('/api/tenant/branding')
      const config = result.data
      setBranding(config)
      setFormData({
        schoolName:    config.school_name    || config.schoolName    || '',
        schoolMotto:   config.school_motto   || config.schoolMotto   || '',
        schoolAddress: config.school_address || config.schoolAddress || '',
        schoolEmail:   config.school_email   || config.schoolEmail   || '',
        schoolPhone:   config.school_phone   || config.schoolPhone   || '',
        primaryColor:   config.primary_color   || config.primaryColor   || '#1E3A8A',
        secondaryColor: config.secondary_color || config.secondaryColor || '#10B981',
        accentColor:    config.accent_color    || config.accentColor    || '#F59E0B',
      })
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load branding')
      // Fallback to context branding if API fails
      if (currentBranding) {
        setFormData({
          schoolName: currentBranding.schoolName || '',
          schoolMotto: '',
          schoolAddress: '',
          schoolEmail: '',
          schoolPhone: '',
          primaryColor: currentBranding.primaryColor || '#1E3A8A',
          secondaryColor: currentBranding.secondaryColor || '#10B981',
          accentColor: '#F59E0B',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBranding()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      const result = await fetchWithAuth('/api/tenant/branding', {
        method: 'PUT',
        body: JSON.stringify(formData),
      })
      setBranding(result.data)
      await refreshBranding()
      toast({ title: 'Branding saved', description: 'Your changes have been applied across the portal.' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding')
      toast({ title: 'Save failed', description: 'Could not apply branding changes.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (branding) {
      setFormData({
        schoolName:    branding.school_name    || branding.schoolName    || '',
        schoolMotto:   branding.school_motto   || branding.schoolMotto   || '',
        schoolAddress: branding.school_address || branding.schoolAddress || '',
        schoolEmail:   branding.school_email   || branding.schoolEmail   || '',
        schoolPhone:   branding.school_phone   || branding.schoolPhone   || '',
        primaryColor:   branding.primary_color   || branding.primaryColor   || '#1E3A8A',
        secondaryColor: branding.secondary_color || branding.secondaryColor || '#10B981',
        accentColor:    branding.accent_color    || branding.accentColor    || '#F59E0B',
      })
      toast({ title: 'Changes reset', description: 'Form restored to last saved state.' })
    }
  }

  const validateAndStageFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `Accepted formats: PNG, JPG, WebP, SVG`,
        variant: 'destructive',
      })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: `Maximum size is ${MAX_SIZE_MB} MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
        variant: 'destructive',
      })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
      setLogoFile(file)
    }
    reader.readAsDataURL(file)
  }, [toast])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndStageFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndStageFile(file)
  }

  const handleUploadConfirm = async () => {
    if (!logoFile || !logoPreview) return
    setUploadingLogo(true)
    try {
      const result = await fetchWithAuth('/api/tenant/branding/logo', {
        method: 'POST',
        body: JSON.stringify({ logoUrl: logoPreview, fileName: logoFile.name }),
      })
      setBranding(result.data)
      setLogoPreview(null)
      setLogoFile(null)
      await refreshBranding()
      toast({ title: 'Logo uploaded', description: `${logoFile.name} is now your active logo.` })
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      const result = await fetchWithAuth('/api/tenant/branding/logo', {
        method: 'POST',
        body: JSON.stringify({ logoUrl: null, fileName: null }),
      })
      setBranding(result.data)
      await refreshBranding()
      toast({ title: 'Logo removed' })
    } catch (err) {
      toast({ title: 'Remove failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const colorPalette = [
    { label: 'Primary', key: 'primaryColor', hex: formData.primaryColor, usage: 'Buttons, links, active states' },
    { label: 'Secondary', key: 'secondaryColor', hex: formData.secondaryColor, usage: 'Success states, highlight cards' },
    { label: 'Accent', key: 'accentColor', hex: formData.accentColor, usage: 'Warnings, analytics badges' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Customization</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">School Branding</h1>
          <p className="text-sm text-gray-600">Control logos, colors, typography, and portal themes from one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleReset} disabled={saving} className="rounded-xl">
            <RefreshCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Applying...' : 'Apply Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none ring-1 ring-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">School Information</CardTitle>
              <CardDescription>Update your school name, contact details and motto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-tighter">School Name</label>
                  <Input
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="Enter school name"
                    className="rounded-xl"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-tighter">Address</label>
                  <Input
                    value={formData.schoolAddress}
                    onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                    placeholder="e.g. 12 Education Road, Lagos, Nigeria"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-tighter">Email</label>
                  <Input
                    type="email"
                    value={formData.schoolEmail}
                    onChange={(e) => setFormData({ ...formData, schoolEmail: e.target.value })}
                    placeholder="info@yourschool.edu.ng"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-tighter">Phone</label>
                  <Input
                    type="tel"
                    value={formData.schoolPhone}
                    onChange={(e) => setFormData({ ...formData, schoolPhone: e.target.value })}
                    placeholder="+234-801-234-5678"
                    className="rounded-xl"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-tighter">School Motto</label>
                  <Input
                    value={formData.schoolMotto}
                    onChange={(e) => setFormData({ ...formData, schoolMotto: e.target.value })}
                    placeholder="Enter school motto"
                    className="rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Brand Colors</CardTitle>
              <CardDescription>Adjust palette values to match your school identity.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {colorPalette.map((color) => (
                <div key={color.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{color.label}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">{color.hex}</Badge>
                  </div>
                  <div className="relative group">
                    <div 
                      className="h-20 rounded-2xl shadow-inner border border-gray-100 transition-transform active:scale-95 cursor-pointer" 
                      style={{ backgroundColor: color.hex }}
                      onClick={() => document.getElementById(`picker-${color.key}`)?.click()}
                    />
                    <input
                      id={`picker-${color.key}`}
                      type="color"
                      value={color.hex}
                      onChange={(e) => setFormData({ ...formData, [color.key]: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <Input 
                    value={color.hex} 
                    onChange={(e) => setFormData({ ...formData, [color.key]: e.target.value })}
                    className="h-8 text-xs font-mono rounded-lg text-center"
                  />
                  <p className="text-[10px] text-gray-400 leading-tight italic">{color.usage}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none ring-1 ring-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                Portal Preview
              </CardTitle>
              <CardDescription>Real-time look of your branding.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-6">
                {/* Header Preview */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Desktop Header</p>
                  <div className="h-14 bg-white border rounded-xl shadow-sm flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border">
                        {logoPreview || branding?.logo_url || branding?.logoUrl ? (
                          <img src={logoPreview || branding?.logo_url || branding?.logoUrl} alt="Logo" className="object-contain" />
                        ) : (
                          <div className="bg-blue-600 w-full h-full flex items-center justify-center"><Layers className="w-4 h-4 text-white" /></div>
                        )}
                      </div>
                      <span className="font-bold text-sm text-gray-900 truncate max-w-[100px]">{formData.schoolName || 'School Name'}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100" />
                      <div className="w-6 h-6 rounded-full bg-gray-100" />
                    </div>
                  </div>
                </div>

                {/* Mobile Preview */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Mobile View</p>
                  <div className="mx-auto w-48 aspect-[9/16] bg-gray-100 rounded-[2rem] border-4 border-gray-900 overflow-hidden relative p-2 shadow-2xl">
                    <div className="w-12 h-1 bg-gray-800 rounded-full mx-auto mb-2" />
                    <div className="bg-white h-full rounded-2xl p-2 space-y-3">
                      <div className="h-8 flex items-center justify-between border-b pb-1">
                         <div className="w-4 h-4 bg-gray-100 rounded" />
                         <div className="w-5 h-5 rounded-lg overflow-hidden border">
                           {(logoPreview || branding?.logo_url || branding?.logoUrl) && <img src={logoPreview || branding?.logo_url || branding?.logoUrl} alt="Logo" className="object-contain" />}
                         </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-12 bg-gray-100 rounded" />
                        <div className="h-3 w-20 rounded" style={{ backgroundColor: formData.primaryColor }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="aspect-square bg-gray-50 rounded-lg border border-gray-100 p-1.5">
                            <div className="w-full h-full rounded flex items-center justify-center" style={{ backgroundColor: `${formData.primaryColor}10` }}>
                              <Wand2 className="w-3 h-3" style={{ color: formData.primaryColor }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="h-8 w-full rounded-lg shadow-sm flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: formData.primaryColor }}>
                        Sign In
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">School Logo</CardTitle>
              <CardDescription>max {MAX_SIZE_MB}MB • PNG, JPG, WebP, SVG</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoPreview ? (
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/20 p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <img src={logoPreview} className="h-16 w-16 rounded-xl object-contain bg-white border p-1" alt="Staged" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{logoFile?.name}</p>
                      <p className="text-[10px] text-gray-500">Not yet uploaded</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="w-full bg-blue-600 text-white rounded-lg h-8" onClick={handleUploadConfirm} disabled={uploadingLogo}>
                      {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                      Upload
                    </Button>
                    <Button size="sm" variant="ghost" className="w-full h-8" onClick={() => {setLogoPreview(null); setLogoFile(null)}} disabled={uploadingLogo}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700">Drop logo here</p>
                  <p className="text-[10px] text-gray-400 mt-1">or click to browse</p>
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={handleFileInputChange} />
                </div>
              )}

              {(branding?.logo_url || branding?.logoUrl) && !logoPreview && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                  <div className="flex items-center gap-3">
                    <img src={branding?.logo_url || branding?.logoUrl} className="w-10 h-10 rounded border bg-white p-1" alt="Active" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-900 uppercase">Active Logo</p>
                      <p className="text-[10px] text-gray-500">v{branding?.version || 1.0}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={handleRemoveLogo}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default SchoolBranding;
