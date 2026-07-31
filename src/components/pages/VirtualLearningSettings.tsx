import React, { useState, useEffect, useCallback } from 'react'
import { Settings, Clock, Shield, Bell, Save, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { getAuthFromStorage } from '../../lib/auth'

interface Settings {
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

export function VirtualLearningSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const auth = getAuthFromStorage()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/virtual-learning-settings', { headers })
      if (res.ok) {
        const data = await res.json()
        setSettings(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/tenant/virtual-learning-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof Settings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : prev)
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading settings...</div>
  if (!settings) return <div className="text-center py-12 text-gray-500">Failed to load settings.</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Digital Learning</p>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Learning Settings</h1>
          <p className="text-sm text-gray-600">Configure policies for virtual classrooms and private lessons.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saved ? <CheckCircle className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* School Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> School Hours</CardTitle>
          <CardDescription>Define when live classes can be scheduled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">School Hours Start</Label>
              <Input
                id="start"
                type="time"
                value={settings.school_hours_start}
                onChange={e => update('school_hours_start', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">School Hours End</Label>
              <Input
                id="end"
                type="time"
                value={settings.school_hours_end}
                onChange={e => update('school_hours_end', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow live classes outside school hours</Label>
              <p className="text-xs text-gray-500">If enabled, teachers can schedule live classes at any time</p>
            </div>
            <Switch
              checked={settings.allow_live_outside_school_hours}
              onCheckedChange={v => update('allow_live_outside_school_hours', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Private Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Private Lesson Policies</CardTitle>
          <CardDescription>Control private lesson frequency and consent requirements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxPrivate">Max Private Lessons Per Student Per Week</Label>
            <Input
              id="maxPrivate"
              type="number"
              value={settings.max_private_lessons_per_week}
              onChange={e => update('max_private_lessons_per_week', Number(e.target.value))}
              min={1}
              max={10}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Require parent consent for standard classes</Label>
              <p className="text-xs text-gray-500">If enabled, parents must opt-in before students join virtual classes</p>
            </div>
            <Switch
              checked={settings.require_parent_consent_standard}
              onCheckedChange={v => update('require_parent_consent_standard', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Require parent consent for private lessons</Label>
              <p className="text-xs text-gray-500">Parents must approve all private lesson requests</p>
            </div>
            <Switch
              checked={settings.require_parent_consent_private}
              onCheckedChange={v => update('require_parent_consent_private', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recording & Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Recording & Notifications</CardTitle>
          <CardDescription>Control recording policies and parent notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow session recording</Label>
              <p className="text-xs text-gray-500">Teachers can record live classes for later playback</p>
            </div>
            <Switch
              checked={settings.allow_recording}
              onCheckedChange={v => update('allow_recording', v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retention">Recording Retention (days)</Label>
            <Input
              id="retention"
              type="number"
              value={settings.recording_retention_days}
              onChange={e => update('recording_retention_days', Number(e.target.value))}
              min={1}
            />
            <p className="text-xs text-gray-400">Recordings older than this will be automatically deleted</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-notify parents</Label>
              <p className="text-xs text-gray-500">Send automatic notifications to parents about lessons, attendance, and grades</p>
            </div>
            <Switch
              checked={settings.auto_notify_parents}
              onCheckedChange={v => update('auto_notify_parents', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VirtualLearningSettings
