import React, { useState, useEffect } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { getAuthFromStorage } from '../../../lib/auth'

interface Message {
  id: string
  subject: string
  body: string
  sender: string
  timestamp: string
  isRead: boolean
}

export function Communications() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/staff/messages', {
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
      {messages.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No messages</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          {messages.map((msg) => (
            <div key={msg.id} className="p-4 border-b last:border-b-0">
              <h3 className="font-medium text-gray-900">{msg.subject}</h3>
              <p className="text-sm text-gray-600 mt-1">{msg.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
