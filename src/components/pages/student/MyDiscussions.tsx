import React, { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Plus, Pin, Lock, AlertCircle, Send, ArrowLeft } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

interface Classroom { id: string; name: string; subject_name: string; teacher_name: string }
interface Thread {
  id: string; title: string; content: string | null; author_name: string; author_role: string
  is_pinned: boolean; is_locked: boolean; created_at: string; reply_count?: number; replies?: any[]
}

export function MyDiscussions() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [activeClassroom, setActiveClassroom] = useState<string>('')
  const [threads, setThreads] = useState<Thread[]>([])
  const [openThread, setOpenThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)

  const auth = () => ({ Authorization: `Bearer ${getAuthFromStorage()?.token}` })
  const jsonAuth = () => ({ Authorization: `Bearer ${getAuthFromStorage()?.token}`, 'Content-Type': 'application/json' })

  const loadClassrooms = useCallback(async () => {
    try {
      const res = await fetch('/api/student/discussions?classrooms=1', { headers: auth() })
      if (!res.ok) throw new Error('Failed to load classes')
      const data = await res.json()
      setClassrooms(data.classrooms || [])
      if (data.classrooms?.length && !activeClassroom) setActiveClassroom(data.classrooms[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [activeClassroom])

  const loadThreads = useCallback(async () => {
    if (!activeClassroom) return
    try {
      setLoading(true)
      const res = await fetch(`/api/student/discussions?classroomId=${activeClassroom}`, { headers: auth() })
      if (!res.ok) throw new Error('Failed to load discussions')
      const data = await res.json()
      setThreads(data.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [activeClassroom])

  const openDiscussion = async (id: string) => {
    const res = await fetch(`/api/student/discussions?id=${id}`, { headers: auth() })
    if (res.ok) {
      const data = await res.json()
      setOpenThread(data.data)
    }
  }

  useEffect(() => { loadClassrooms() }, [])
  useEffect(() => { loadThreads() }, [activeClassroom])

  const createThread = async () => {
    if (!newTitle.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/student/discussions', {
        method: 'POST', headers: jsonAuth(),
        body: JSON.stringify({ classroomId: activeClassroom, title: newTitle, content: newContent }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to post')
      setNewTitle(''); setNewContent(''); setShowNew(false)
      loadThreads()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post')
    } finally {
      setPosting(false)
    }
  }

  const postReply = async () => {
    if (!reply.trim() || !openThread) return
    setPosting(true)
    try {
      const res = await fetch('/api/student/discussions', {
        method: 'POST', headers: jsonAuth(),
        body: JSON.stringify({ discussionId: openThread.id, content: reply }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to reply')
      setReply('')
      openDiscussion(openThread.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reply')
    } finally {
      setPosting(false)
    }
  }

  if (openThread) {
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenThread(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" /> Back to discussions
        </button>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">{openThread.title}</h2>
            {openThread.is_pinned && <Pin className="h-4 w-4 text-amber-500" />}
            {openThread.is_locked && <Lock className="h-4 w-4 text-gray-400" />}
          </div>
          <p className="text-xs text-gray-500 mt-1">by {openThread.author_name} · {new Date(openThread.created_at).toLocaleString()}</p>
          {openThread.content && <p className="text-gray-700 mt-3 whitespace-pre-wrap">{openThread.content}</p>}
        </div>
        <div className="space-y-3">
          {(openThread.replies || []).map(r => (
            <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4 ml-4">
              <p className="text-xs text-gray-500">{r.author_name} · {new Date(r.created_at).toLocaleString()}</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
        {!openThread.is_locked ? (
          <div className="flex gap-2">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && postReply()}
            />
            <Button onClick={postReply} disabled={posting || !reply.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic flex items-center gap-1"><Lock className="h-4 w-4" /> This discussion is locked.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Class Discussions</h1>
        {activeClassroom && (
          <Button size="sm" onClick={() => setShowNew(!showNew)}>
            <Plus className="h-4 w-4 mr-1" /> New discussion
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {classrooms.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {classrooms.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveClassroom(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${activeClassroom === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
            >
              {c.subject_name || c.name}
            </button>
          ))}
        </div>
      )}

      {showNew && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Discussion title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="What do you want to discuss?"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={createThread} disabled={posting || !newTitle.trim()}>Post</Button>
            <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />)}</div>
      ) : !activeClassroom ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-600 font-medium">No classrooms found</p>
          <p className="text-sm text-gray-400">Discussions appear once your teachers set up virtual classrooms.</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-600 font-medium">No discussions yet</p>
          <p className="text-sm text-gray-400">Start the first discussion for this class.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {threads.map(t => (
            <button key={t.id} onClick={() => openDiscussion(t.id)} className="w-full text-left p-4 hover:bg-gray-50">
              <div className="flex items-center gap-2">
                {t.is_pinned === true && <Pin className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                {t.is_locked === true && <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                <p className="font-medium text-gray-900 flex-1 truncate">{t.title}</p>
                <span className="text-xs text-gray-400">{t.reply_count ?? 0} replies</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.author_name} · {new Date(t.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyDiscussions
