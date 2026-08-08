import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { tenantApiGet, tenantApiPut } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'
import { Save, Loader2 } from 'lucide-react'

interface VirtualLearningSettings {
  school_hours_start: string
  school_hours_end: string
  allow_live_outside_school_hours: boolean
  max_private_lessons_per_week: number
  require_parent_consent_standard: boolean
  require_parent_consent_private: boolean
  allow_recording: boolean
  recording_retention_days: number
  auto_notify_parents: boolean
}

export function VirtualClassroomSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<VirtualLearningSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await tenantApiGet('/api/tenant/virtual-learning-settings')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load settings')
        setSettings(data.data)
      } catch (err) {
        toast({
          title: 'Failed to load settings',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const update = <K extends keyof VirtualLearningSettings>(field: K, value: VirtualLearningSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await tenantApiPut('/api/tenant/virtual-learning-settings', settings)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save settings')
      toast({ title: 'Settings saved' })
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading settings...</div>
  if (!settings) return <div className="text-center py-8 text-red-500">No settings found.</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Virtual Learning Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>School day start</Label>
            <Input
              type="time"
              value={settings.school_hours_start}
              onChange={(e) => update('school_hours_start', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>School day end</Label>
            <Input
              type="time"
              value={settings.school_hours_end}
              onChange={(e) => update('school_hours_end', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Allow live classes outside school hours</Label>
          <Switch
            checked={settings.allow_live_outside_school_hours}
            onCheckedChange={(v) => update('allow_live_outside_school_hours', v)}
          />
        </div>

        <div className="space-y-2">
          <Label>Max private lessons per week</Label>
          <Input
            type="number"
            value={settings.max_private_lessons_per_week}
            onChange={(e) => update('max_private_lessons_per_week', parseInt(e.target.value || '0', 10))}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Require parent consent for standard classes</Label>
          <Switch
            checked={settings.require_parent_consent_standard}
            onCheckedChange={(v) => update('require_parent_consent_standard', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Require parent consent for private lessons</Label>
          <Switch
            checked={settings.require_parent_consent_private}
            onCheckedChange={(v) => update('require_parent_consent_private', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Allow recording</Label>
          <Switch
            checked={settings.allow_recording}
            onCheckedChange={(v) => update('allow_recording', v)}
          />
        </div>

        <div className="space-y-2">
          <Label>Recording retention (days)</Label>
          <Input
            type="number"
            value={settings.recording_retention_days}
            onChange={(e) => update('recording_retention_days', parseInt(e.target.value || '0', 10))}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Auto-notify parents</Label>
          <Switch
            checked={settings.auto_notify_parents}
            onCheckedChange={(v) => update('auto_notify_parents', v)}
          />
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  )
}

export default VirtualClassroomSettings
