import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog'
import { tenantApiGet, tenantApiPost, tenantApiPut, tenantApiDelete } from '../../lib/tenantApi'
import { useToast } from '../ui/use-toast'
import { MessageSquare, Plus, Pin, Lock, Trash2, Send } from 'lucide-react'

interface Discussion {
  id: string
  title: string
  content: string | null
  created_by: string
  author_role: string
  is_pinned: boolean
  is_locked: boolean
  created_at: string
}

interface Reply {
  id: string
  content: string
  created_by: string
  author_role: string
  created_at: string
  parent_reply_id: string | null
}

interface VirtualClassroomDiscussionsProps {
  classroomId: string
}

export function VirtualClassroomDiscussions({ classroomId }: VirtualClassroomDiscussionsProps) {
  const { toast } = useToast()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Discussion | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    loadDiscussions()
  }, [classroomId])

  const loadDiscussions = async () => {
    if (!classroomId) return
    setLoading(true)
    try {
      const res = await tenantApiGet(`/api/tenant/discussions?classroomId=${classroomId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load discussions')
      setDiscussions(data.data || [])
    } catch (err) {
      toast({
        title: 'Failed to load discussions',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createDiscussion = async () => {
    if (!newTitle.trim()) return
    try {
      const res = await tenantApiPost('/api/tenant/discussions', {
        classroomId,
        title: newTitle,
        content: newContent,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to create discussion')
      setDiscussions((prev) => [data.data, ...prev])
      setNewTitle('')
      setNewContent('')
      setCreateOpen(false)
      toast({ title: 'Discussion created' })
    } catch (err) {
      toast({
        title: 'Failed to create discussion',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const deleteDiscussion = async (id: string) => {
    try {
      const res = await tenantApiDelete(`/api/tenant/discussions?id=${id}`)
      if (!res.ok) throw new Error('Failed to delete discussion')
      setDiscussions((prev) => prev.filter((d) => d.id !== id))
      toast({ title: 'Discussion deleted' })
    } catch (err) {
      toast({
        title: 'Failed to delete discussion',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const openReplies = async (d: Discussion) => {
    setSelected(d)
    setRepliesOpen(true)
    setReplyContent('')
    try {
      const res = await tenantApiGet(`/api/tenant/discussions/replies?discussionId=${d.id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load replies')
      setReplies(data.data || [])
    } catch (err) {
      toast({
        title: 'Failed to load replies',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const addReply = async () => {
    if (!selected || !replyContent.trim()) return
    try {
      const res = await tenantApiPost('/api/tenant/discussions/replies', {
        discussionId: selected.id,
        content: replyContent,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add reply')
      setReplies((prev) => [...prev, data.data])
      setReplyContent('')
      toast({ title: 'Reply added' })
    } catch (err) {
      toast({
        title: 'Failed to add reply',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const toggleDiscussion = async (id: string, field: 'is_pinned' | 'is_locked', value: boolean) => {
    try {
      const res = await tenantApiPut('/api/tenant/discussions', { id, [field]: value })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to update discussion')
      setDiscussions((prev) => prev.map((d) => (d.id === id ? data.data : d)))
      if (selected?.id === id) setSelected(data.data)
      toast({ title: 'Discussion updated' })
    } catch (err) {
      toast({
        title: 'Failed to update discussion',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Discussions</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Discussion
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading discussions...</div>
      ) : discussions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No discussions yet. Start the first conversation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => (
            <Card
              key={d.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openReplies(d)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {d.title}
                      {d.is_pinned && <Pin className="inline h-3 w-3 text-blue-600 ml-1" />}
                    </h3>
                    {d.content && (
                      <p className="text-sm text-gray-600 line-clamp-2">{d.content}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      By {d.created_by} • {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleDiscussion(d.id, 'is_pinned', !d.is_pinned)}
                    >
                      <Pin className={`h-4 w-4 ${d.is_pinned ? 'text-blue-600' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleDiscussion(d.id, 'is_locked', !d.is_locked)}
                    >
                      <Lock className={`h-4 w-4 ${d.is_locked ? 'text-red-600' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDiscussion(d.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Discussion</DialogTitle>
            <DialogDescription>Start a conversation for this classroom.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disc-title">Title</Label>
              <Input
                id="disc-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Homework questions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disc-content">Content</Label>
              <Textarea
                id="disc-content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Add details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createDiscussion} disabled={!newTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={repliesOpen} onOpenChange={setRepliesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
            {selected?.content && (
              <div className="bg-gray-50 p-3 rounded-lg text-gray-800 text-sm">
                {selected.content}
                <p className="text-xs text-gray-500 mt-2">
                  By {selected.created_by} • {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Replies</h4>
              {replies.map((r) => (
                <div key={r.id} className="bg-white border rounded-lg p-3">
                  <p className="text-sm text-gray-800">{r.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    By {r.created_by} • {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {replies.length === 0 && (
                <p className="text-sm text-gray-500">No replies yet.</p>
              )}
            </div>

            {!selected?.is_locked ? (
              <div className="flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1"
                />
                <Button onClick={addReply} disabled={!replyContent.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-red-600">This discussion is locked.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VirtualClassroomDiscussions
