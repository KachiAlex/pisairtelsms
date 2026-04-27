import { useState, useEffect } from 'react'
import { Send, MessageCircle, Search, AlertCircle, Paperclip } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'
import { getAuthFromStorage } from '../../../lib/auth'

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  isRead: boolean
}

interface Conversation {
  id: string
  teacherId: string
  teacherName: string
  subject: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  messages: Message[]
}

export function TeacherMessages() {
  const { selectedChild } = useParentContext()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; subject: string }>>([])

  const fetchConversations = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    try {
      const auth = getAuthFromStorage()
      const res = await fetch(
        `/api/parent/messages?childId=${selectedChild.id}&limit=50`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      )
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setConversations(data.conversations || [])
      setTeachers(data.availableTeachers || [])
      setError(null)
    } catch (err) {
      setError('Failed to load messages')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [selectedChild])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return

    setIsSending(true)
    try {
      const auth = getAuthFromStorage()
      const res = await fetch('/api/parent/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          childId: selectedChild?.id,
          content: messageText,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      const newMessage = await res.json()
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: messageText,
              lastMessageTime: new Date().toISOString(),
            }
            : conv
        )
      )
      setSelectedConversation(prev =>
        prev
          ? {
            ...prev,
            messages: [...prev.messages, newMessage],
            lastMessage: messageText,
            lastMessageTime: new Date().toISOString(),
          }
          : null
      )
      setMessageText('')
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleStartConversation = async () => {
    if (!selectedTeacher) return

    try {
      const auth = getAuthFromStorage()
      const res = await fetch('/api/parent/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          childId: selectedChild?.id,
          content: 'Started conversation',
        }),
      })

      if (!res.ok) throw new Error('Failed to start conversation')

      await fetchConversations()
      setShowNewConversation(false)
      setSelectedTeacher('')
    } catch (err) {
      console.error('Failed to start conversation:', err)
      alert('Failed to start conversation')
    }
  }

  const filteredConversations = conversations.filter(c =>
    c.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  if (isLoading) {
    return (
      <div className="flex gap-4 h-[600px]">
        <div className="w-64 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="flex-1 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Teacher Messages</h1>
        {unreadCount > 0 && (
          <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
            <button
              onClick={fetchConversations}
              className="text-xs text-red-700 hover:text-red-900 font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 h-[600px] bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Conversations List */}
        <div className="w-64 border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowNewConversation(true)}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              New Message
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No conversations</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conv.teacherName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{conv.subject}</p>
                        <p className="text-xs text-gray-600 truncate mt-1">{conv.lastMessage}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{selectedConversation.teacherName}</h3>
              <p className="text-xs text-gray-500">{selectedConversation.subject}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No messages yet</p>
                </div>
              ) : (
                selectedConversation.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === 'parent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.senderId === 'parent'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.senderId === 'parent' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Start New Conversation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher
                </label>
                <select
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} - {teacher.subject}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewConversation(false)
                    setSelectedTeacher('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartConversation}
                  disabled={!selectedTeacher}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
