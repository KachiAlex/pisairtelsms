import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Textarea } from '../ui/textarea'
import { useParentContext } from '../../contexts/ParentContext'
import { getAuthFromStorage } from '../../lib/auth'
import { useToast } from '../ui/use-toast'
import { Loader2 } from 'lucide-react'

interface Consent {
  id?: string
  consent_type: string
  status: 'granted' | 'denied'
  notes: string | null
}

export function ParentVirtualLearningConsents() {
  const { selectedChild } = useParentContext()
  const { toast } = useToast()
  const [consents, setConsents] = useState<Consent[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [standard, setStandard] = useState(true)
  const [privateLesson, setPrivateLesson] = useState(true)
  const [notes, setNotes] = useState('')

  const token = getAuthFromStorage()?.token

  useEffect(() => {
    if (!selectedChild) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/tenant/virtual-learning-consents?studentId=${selectedChild.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load consents')
        setConsents(data.data || [])
        const s = data.data?.find((c: Consent) => c.consent_type === 'standard')?.status === 'granted'
        const p = data.data?.find((c: Consent) => c.consent_type === 'private_lesson')?.status === 'granted'
        setStandard(!!s)
        setPrivateLesson(!!p)
      } catch (err) {
        toast({
          title: 'Failed to load consents',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedChild, token, toast])

  const save = async (consentType: 'standard' | 'private_lesson', granted: boolean) => {
    if (!selectedChild) return
    setSaving(true)
    try {
      const res = await fetch('/api/tenant/virtual-learning-consents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: selectedChild.id,
          consentType,
          status: granted ? 'granted' : 'denied',
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save consent')
      toast({ title: 'Consent saved' })
    } catch (err) {
      toast({
        title: 'Failed to save consent',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!selectedChild) {
    return <div className="text-center py-8 text-gray-500">Select a child to manage consents.</div>
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading consents...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Virtual Learning Consents for {selectedChild.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Standard virtual classes</Label>
            <p className="text-sm text-gray-500">Allow your child to join regular online classes</p>
          </div>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <Switch
            checked={standard}
            onCheckedChange={(v) => {
              setStandard(v)
              save('standard', v)
            }}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Private online lessons</Label>
            <p className="text-sm text-gray-500">Allow your child to join one-on-one online lessons</p>
          </div>
          <Switch
            checked={privateLesson}
            onCheckedChange={(v) => {
              setPrivateLesson(v)
              save('private_lesson', v)
            }}
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for the school"
          />
        </div>

        {consents.length > 0 && (
          <div className="text-sm text-gray-500">
            Last updated consents: {consents.length} on record.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ParentVirtualLearningConsents
