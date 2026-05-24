import React, { useEffect, useMemo, useState } from 'react'
import { Save, School, Shield, Bell, Plug } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Separator } from '../ui/separator'
import { useToast } from '../ui/use-toast'
import {
  fetchTenantSettings,
  TenantSettingsPayload,
  TenantSettingsResponse,
  updateTenantSettings,
} from '../../lib/tenantSettingsClient'

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

  useEffect(() => {
    let cancelled = false
    async function loadSettings() {
      setIsLoading(true)
      try {
        const remote = await fetchTenantSettings()
        if (cancelled) return
        setSettings(remote)
        setLastUpdated(remote.updatedAt)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load tenant settings.'
        toast({ variant: 'destructive', title: 'Failed to load settings', description: message })
        if (!cancelled) {
          const fallback = cloneFallback()
          setSettings(fallback)
          setLastUpdated(new Date().toISOString())
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadSettings()
    return () => {
      cancelled = true
    }
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

      <Tabs defaultValue="school" className="space-y-4">
        <TabsList>
          <TabsTrigger value="school">School Info</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* School Information */}
        <TabsContent value="school" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-blue-600" />
                <CardTitle>School Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>School Name</Label>
                  <Input
                    value={settings.schoolName}
                    onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={settings.schoolAddress}
                    onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.schoolEmail}
                    onChange={(e) => setSettings({ ...settings, schoolEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={settings.schoolPhone}
                    onChange={(e) => setSettings({ ...settings, schoolPhone: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Logo &amp; Branding</p>
                <p className="text-blue-700">Manage your school logo, portal colors, and typography under <strong>Customization → School Branding</strong>.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                    <option>2025/2026</option>
                    <option>2024/2025</option>
                    <option>2023/2024</option>
                  </select>
                </div>
                <div>
                  <Label>Current Term</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                    value={settings.currentTerm}
                    onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value })}
                  >
                    <option>First Term</option>
                    <option>Second Term</option>
                    <option>Third Term</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grading System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { grade: 'A', min: 80, max: 100, remark: 'Excellent' },
                  { grade: 'B', min: 70, max: 79, remark: 'Very Good' },
                  { grade: 'C', min: 60, max: 69, remark: 'Good' },
                  { grade: 'D', min: 50, max: 59, remark: 'Pass' },
                  { grade: 'E', min: 40, max: 49, remark: 'Fair' },
                  { grade: 'F', min: 0, max: 39, remark: 'Fail' },
                ].map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-xs">Grade</Label>
                      <Input value={item.grade} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Min Score</Label>
                      <Input type="number" value={item.min} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Max Score</Label>
                      <Input type="number" value={item.max} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Remark</Label>
                      <Input value={item.remark} className="mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                    value={settings.admissionNoFormat ?? '{PREFIX}/{YEAR}/{SEQ}'}
                    onChange={(e) => updateSetting('admissionNoFormat', e.target.value)}
                    placeholder="{PREFIX}/{YEAR}/{SEQ}"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Preview: {(settings.admissionNoFormat ?? '{PREFIX}/{YEAR}/{SEQ}')
                      .replace('{PREFIX}', settings.schoolName?.split(' ')[0]?.toUpperCase().slice(0, 3) || 'SCH')
                      .replace('{YEAR}', String(new Date().getFullYear()))
                      .replace('{SEQ}', '0001'.slice(-(settings.admissionNoDigits ?? 4)).padStart(settings.admissionNoDigits ?? 4, '0'))}
                  </p>
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

          <Card>
            <CardHeader>
              <CardTitle>Promotion Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Minimum Pass Percentage</Label>
                <Input type="number" defaultValue="40" className="mt-1" />
              </div>
              <div>
                <Label>Minimum Subjects to Pass</Label>
                <Input type="number" defaultValue="5" className="mt-1" />
              </div>
              <div>
                <Label>Maximum Failed Subjects for Promotion</Label>
                <Input type="number" defaultValue="2" className="mt-1" />
              </div>
            </CardContent>
          </Card>
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
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  <option>Termii</option>
                  <option>SMS Portal NG</option>
                  <option>BulkSMS Nigeria</option>
                </select>
              </div>
              <div>
                <Label>Sender ID</Label>
                <Input placeholder="SCHOLIX" />
              </div>
              <div>
                <Label>API Key</Label>
                <Input type="password" placeholder="Enter API key" />
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
                <Input type="number" defaultValue="8" />
              </div>
              <div className="space-y-2">
                <Label>Password Requirements</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">Require uppercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">Require lowercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-gray-700">Require numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">Require special characters</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plug className="w-5 h-5 text-blue-600" />
                <CardTitle>Payment Gateway</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Online Payment</p>
                  <p className="text-sm text-gray-600">Accept payments online</p>
                </div>
                <Switch
                  checked={settings.enableOnlinePayment}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableOnlinePayment: checked })}
                />
              </div>

              <div>
                <Label>Payment Provider</Label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  <option>Paystack</option>
                  <option>Flutterwave</option>
                  <option>Interswitch</option>
                </select>
              </div>

              <div>
                <Label>Public Key</Label>
                <Input placeholder="pk_test_..." />
              </div>

              <div>
                <Label>Secret Key</Label>
                <Input type="password" placeholder="sk_test_..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Biometric Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Biometric Attendance</p>
                  <p className="text-sm text-gray-600">Use biometric devices for attendance</p>
                </div>
                <Switch
                  checked={settings.enableBiometric}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableBiometric: checked })}
                />
              </div>

              <div>
                <Label>Device Type</Label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                  <option>Fingerprint Scanner</option>
                  <option>Face Recognition</option>
                  <option>Card Reader</option>
                </select>
              </div>

              <div>
                <Label>Device IP Address</Label>
                <Input placeholder="192.168.1.100" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default SystemSettings;
