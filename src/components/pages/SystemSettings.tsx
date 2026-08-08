import React, { useEffect, useMemo, useState } from 'react'
import { Save, Shield, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useToast } from '../ui/use-toast'
import {
  fetchTenantSettings,
  TenantSettingsPayload,
  TenantSettingsResponse,
  updateTenantSettings,
} from '../../lib/tenantSettingsClient'
import { tenantApiGet } from '../../lib/tenantApi'

const fallbackSettings: TenantSettingsPayload = {
  schoolName: 'Excellence Academy',
  schoolAddress: '123 Education Road, Lagos, Nigeria',
  schoolEmail: 'info@excellenceacademy.edu.ng',
  schoolPhone: '+234-801-234-5678',
  currentSession: '2025/2026',
  currentTerm: 'First Term',
  enableSMS: true,
  enableEmail: true,
  enableBiometric: false,
  enableOnlinePayment: true,
  autoBackup: true,
  twoFactorAuth: false,
  maintenanceMode: false,
  logoUrl: null,
  admissionNoFormat: '{PREFIX}/{YEAR}/{SEQ}',
  admissionNoDigits: 4,
}

function cloneFallback(): TenantSettingsPayload {
  return structuredClone(fallbackSettings)
}


export function SystemSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<TenantSettingsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([])
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetchTenantSettings(),
      tenantApiGet('/api/tenant/timetable/calendar?resource=academic-years').then(r => r.ok ? r.json() : { data: [] }),
      tenantApiGet('/api/tenant/timetable/calendar?resource=terms').then(r => r.ok ? r.json() : { data: [] }),
    ])
      .then(([remote, yearsJson, termsJson]) => {
        if (cancelled) return
        setSettings(remote)
        setLastUpdated(remote.updatedAt)
        setAcademicYears((yearsJson.data || []).map((y: any) => ({ id: y.id, name: y.name })))
        setTerms((termsJson.data || []).map((t: any) => ({ id: t.id, name: t.name })))
      })
      .catch((error) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unable to load settings.'
        toast({ variant: 'destructive', title: 'Failed to load settings', description: message })
        setSettings(cloneFallback())
        setLastUpdated(new Date().toISOString())
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [toast])

  const handleSave = async () => {
    if (!settings) return
    try {
      setIsSaving(true)
      const updated = await updateTenantSettings(settings)
      setSettings(updated)
      setLastUpdated(updated.updatedAt)
      toast({ title: 'Settings saved', description: 'System configuration is now up to date.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save settings.'
      toast({ variant: 'destructive', title: 'Save failed', description: message })
    } finally {
      setIsSaving(false)
    }
  }

  const disableForm = isLoading || !settings
  const lastSavedLabel = useMemo(() => {
    if (!lastUpdated) return 'Not yet saved'
    const date = new Date(lastUpdated)
    return `Last updated ${date.toLocaleString()}`
  }, [lastUpdated])

  const updateSetting = <K extends keyof TenantSettingsPayload>(key: K, value: TenantSettingsPayload[K]) => {
    setSettings((prev) => {
      const base = prev ?? cloneFallback()
      return { ...base, [key]: value }
    })
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Loading tenant settings…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-xs uppercase tracking-wide text-gray-500">{lastSavedLabel}</p>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={disableForm || isSaving} onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="academic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Academic Settings */}
        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current Session</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                    value={settings.currentSession}
                    onChange={(e) => setSettings({ ...settings, currentSession: e.target.value })}
                  >
                    {/* Always include the saved value so it stays selected even if calendar API is empty */}
                    {[settings.currentSession, ...academicYears.map(y => y.name).filter(n => n !== settings.currentSession)]
                      .filter(Boolean)
                      .map(name => <option key={name} value={name}>{name}</option>)}
                    {academicYears.length === 0 && !settings.currentSession && (
                      <option value="">No academic years found — add one in Timetable</option>
                    )}
                  </select>
                  {academicYears.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{academicYears.length} academic year{academicYears.length !== 1 ? 's' : ''} available</p>
                  )}
                </div>
                <div>
                  <Label>Current Term</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                    value={settings.currentTerm}
                    onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value })}
                  >
                    {/* Always include the saved value so it stays selected */}
                    {[settings.currentTerm, ...terms.map(t => t.name).filter(n => n !== settings.currentTerm)]
                      .filter(Boolean)
                      .map(name => <option key={name} value={name}>{name}</option>)}
                    {terms.length === 0 && !settings.currentTerm && (
                      <option value="">No terms found — add one in Timetable</option>
                    )}
                  </select>
                  {terms.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{terms.length} term{terms.length !== 1 ? 's' : ''} available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Grading System</p>
            <p className="text-blue-700">Create and manage grading scales, bands, and policy rules under <strong>Customization → Grading Scale</strong>.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Admission Number Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Configure how admission numbers are auto-generated when a new student is added.
                Use the tokens <code className="bg-gray-100 px-1 rounded text-xs">{'{PREFIX}'}</code>,{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">{'{YEAR}'}</code> and{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">{'{SEQ}'}</code> (sequential number).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Format Template</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={settings.admissionNoFormat || ''}
                    onChange={(e) => updateSetting('admissionNoFormat', e.target.value)}
                    placeholder="{PREFIX}/{YEAR}/{SEQ}"
                  />
                  {settings.admissionNoFormat && (
                    <p className="text-xs text-gray-400 mt-1">
                      Preview: {settings.admissionNoFormat
                        .replace('{PREFIX}', settings.schoolName?.split(' ')[0]?.toUpperCase().slice(0, 3) || 'SCH')
                        .replace('{YEAR}', String(new Date().getFullYear()))
                        .replace('{SEQ}', '1'.padStart(settings.admissionNoDigits ?? 4, '0'))}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Sequence Digits</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                    value={settings.admissionNoDigits ?? 4}
                    onChange={(e) => updateSetting('admissionNoDigits', Number(e.target.value))}
                  >
                    <option value={3}>3 digits (001)</option>
                    <option value={4}>4 digits (0001)</option>
                    <option value={5}>5 digits (00001)</option>
                    <option value={6}>6 digits (000001)</option>
                  </select>
                </div>
              </div>
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                <strong>Available tokens:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li><code>{'{PREFIX}'}</code> — auto-derived from your school name (first word, up to 3 letters)</li>
                  <li><code>{'{YEAR}'}</code> — current 4-digit year</li>
                  <li><code>{'{SEQ}'}</code> — auto-incrementing sequence number, zero-padded to the configured digits</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">Promotion Rules</p>
            <p className="text-amber-700">Configure pass percentages, subject thresholds, and promotion criteria under <strong>Academic Structure → Grading Policy</strong>.</p>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <CardTitle>Notification Channels</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Send notifications via SMS</p>
                </div>
                <Switch
                  checked={settings.enableSMS}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableSMS: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Send notifications via email</p>
                </div>
                <Switch
                  checked={settings.enableEmail}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableEmail: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>SMS Provider</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                  value={(settings as any).smsProvider || 'Termii'}
                  onChange={(e) => updateSetting('smsProvider' as any, e.target.value)}
                >
                  <option>Termii</option>
                  <option>SMS Portal NG</option>
                  <option>BulkSMS Nigeria</option>
                </select>
              </div>
              <div>
                <Label>Sender ID</Label>
                <Input
                  placeholder="Pisairtel-Schools"
                  value={(settings as any).smsSenderId || ''}
                  onChange={(e) => updateSetting('smsSenderId' as any, e.target.value)}
                />
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Enter API key"
                  value={(settings as any).smsApiKey || ''}
                  onChange={(e) => updateSetting('smsApiKey' as any, e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <CardTitle>Security Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Require 2FA for admin accounts</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Auto Backup</p>
                  <p className="text-sm text-gray-600">Automatically backup data daily</p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Maintenance Mode</p>
                  <p className="text-sm text-gray-600">Put system in maintenance mode</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Minimum Password Length</Label>
                <Input
                  type="number"
                  value={(settings as any).passwordMinLength ?? 8}
                  onChange={(e) => updateSetting('passwordMinLength' as any, Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Password Requirements</Label>
                <div className="space-y-2">
                  {[
                    { key: 'passwordRequireUppercase', label: 'Require uppercase letters', defaultVal: true },
                    { key: 'passwordRequireLowercase', label: 'Require lowercase letters', defaultVal: true },
                    { key: 'passwordRequireNumbers', label: 'Require numbers', defaultVal: true },
                    { key: 'passwordRequireSpecial', label: 'Require special characters', defaultVal: false },
                  ].map(({ key, label, defaultVal }) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={(settings as any)[key] ?? defaultVal}
                        onChange={(e) => updateSetting(key as any, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
export default SystemSettings;
