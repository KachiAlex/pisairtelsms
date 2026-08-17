import { useState, useEffect, useCallback } from 'react'

export type CommunicationChannel = 'email' | 'sms' | 'push' | 'in-app'
export type CommunicationType = 'announcement' | 'notification' | 'message'
export type CommunicationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'partial'

export interface Communication {
  id: string
  tenantId: string
  type: CommunicationType
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents' | string[]
  channels: CommunicationChannel[]
  scheduledFor: string | null
  sentAt: string | null
  status: CommunicationStatus
  sentBy: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  stats?: Record<string, number>
}

export interface CommunicationRecipient {
  id: string
  communicationId: string
  recipientId: string
  recipientName: string
  recipientType: string
  channel: CommunicationChannel
  address: string
  status: string
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  errorMessage: string | null
  createdAt: string
}

export interface CommunicationTemplate {
  id: string
  name: string
  type: CommunicationType
  title: string
  body: string
  channels: CommunicationChannel[]
  variables: string[]
}

function authHeaders(): Record<string, string> {
  const auth = typeof window !== 'undefined' ? localStorage.getItem('auth') : null
  const token = auth ? JSON.parse(auth).token : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function useCommunications() {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [logs, setLogs] = useState<CommunicationRecipient[]>([])
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCommunications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/communications', { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch')
      setCommunications(json.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/communications/logs', { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch logs')
      setLogs(json.data || [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/communications/templates', { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch templates')
      setTemplates(json.data || [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const createCommunication = useCallback(async (payload: any) => {
    const res = await fetch('/api/tenant/communications', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to create')
    return json.data as Communication
  }, [])

  const sendNow = useCallback(async (id: string) => {
    const res = await fetch(`/api/tenant/communications/${id}?action=send`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to send')
    return json.data
  }, [])

  const markRead = useCallback(async (communicationId: string, recipientId: string, recipientType: string) => {
    const res = await fetch(`/api/tenant/communications/read/${communicationId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ recipientId, recipientType }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to mark read')
    return json.data
  }, [])

  useEffect(() => {
    fetchCommunications()
    fetchLogs()
    fetchTemplates()
  }, [fetchCommunications, fetchLogs, fetchTemplates])

  return {
    communications,
    logs,
    templates,
    loading,
    error,
    fetchCommunications,
    fetchLogs,
    fetchTemplates,
    createCommunication,
    sendNow,
    markRead,
  }
}
