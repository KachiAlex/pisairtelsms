import React, { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Plus, Loader2, AlertTriangle, Send, Pencil, Trash2,
  CheckCircle, XCircle, GraduationCap, ExternalLink, Paperclip, Download,
} from 'lucide-react'
import { Button } from '../../ui/button'
import { tenantApiGet, tenantApiFetch } from '../../../lib/tenantApi'
import { useAcademicPeriod } from '../../../hooks/useAcademicPeriod'

interface ClassInfo {
  name: string
  arm?: string
  subjects: string[]
}

interface LessonNote {
  id: string
  staff_id: string
  staff_name: string | null
  subject: string
  class: string
  session: string
  term: string
  week: number
  topic: string | null
  scheme_topic_id: string | null
  title: string
  excerpt?: string
  content?: string
  link: string | null
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  submitted_at: string | null
  reviewed_at: string | null
  review_comment: string | null
  taught_at: string | null
}

interface SchemeTopic {
  id: string
  week: number
  topic: string
  description: string | null
}

const statusStyle: Record<LessonNote['status'], { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  submitted: { label: 'Awaiting review', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700 border-green-200' },
  returned: { label: 'Returned', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const emptyForm = {
  class: '', subject: '', week: 1, topic: '', title: '', content: '', link: '', schemeTopicId: '',
  attachment: '', attachmentName: '', attachmentRemoved: false,
}

export function LessonNotes() {
  const { session, term, sessionTerms, loading: periodLoading } = useAcademicPeriod()
  const [selTerm, setSelTerm] = useState('')
  const effTerm = selTerm || term

  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<LessonNote | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showEditor, setShowEditor] = useState(false)
  const [schemeTopics, setSchemeTopics] = useState<SchemeTopic[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!effTerm) return
    setLoading(true)
    try {
      const [clsRes, notesRes] = await Promise.all([
        tenantApiGet('/api/staff/classes'),
        tenantApiGet(`/api/tenant/lesson-notes?session=${encodeURIComponent(session)}&term=${encodeURIComponent(effTerm)}`),
      ])
      const clsData = await clsRes.json().catch(() => null)
      const notesData = await notesRes.json().catch(() => null)
      setClasses(clsData?.classes || clsData?.data || [])
      setNotes(notesData?.data || [])
      setError(null)
    } catch {
      setError('Failed to load lesson notes')
    } finally {
      setLoading(false)
    }
  }, [session, effTerm])

  useEffect(() => { void load() }, [load])

  // Load scheme topics when the editor's class+subject is set
  useEffect(() => {
    if (!showEditor || !form.class || !form.subject || !effTerm) {
      setSchemeTopics([])
      return
    }
    tenantApiGet(
      `/api/tenant/schemes?subject=${encodeURIComponent(form.subject)}&class=${encodeURIComponent(form.class)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(effTerm)}`
    )
      .then((r) => r.json())
      .then((d) => setSchemeTopics(d?.data || []))
      .catch(() => setSchemeTopics([]))
  }, [showEditor, form.class, form.subject, session, effTerm])

  const subjectsForClass = classes.find((c) => c.name === form.class)?.subjects || []

  const openNew = () => {
    setEditing(null)
    setForm({ ...emptyForm, class: classes[0]?.name || '' })
    setShowEditor(true)
  }

  const openEdit = async (n: LessonNote) => {
    const res = await tenantApiGet(`/api/tenant/lesson-notes?id=${n.id}`)
    const data = await res.json().catch(() => null)
    const full = data?.data || n
    setEditing(full)
    setForm({
      class: full.class, subject: full.subject, week: full.week, topic: full.topic || '',
      title: full.title, content: full.content || '', link: full.link || '', schemeTopicId: full.scheme_topic_id || '',
      attachment: '', attachmentName: full.attachment_name || '', attachmentRemoved: false,
    })
    setShowEditor(true)
  }

  const pickWeek = (wk: number) => {
    const scheme = schemeTopics.find((t) => t.week === wk)
    setForm((f) => ({
      ...f,
      week: wk,
      topic: scheme?.topic || f.topic,
      schemeTopicId: scheme?.id || '',
      title: f.title || scheme?.topic || '',
    }))
  }

  const save = async (submitAfter: boolean) => {
    setSaving(true)
    setError(null)
    try {
      let noteId = editing?.id
      if (editing) {
        const res = await tenantApiFetch(`/api/tenant/lesson-notes?id=${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: form.title, content: form.content, link: form.link || null, topic: form.topic || null,
            ...(form.attachment
              ? { attachment: form.attachment, attachmentName: form.attachmentName }
              : form.attachmentRemoved
                ? { attachment: null }
                : {}),
          }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Failed to save')
      } else {
        const res = await tenantApiFetch('/api/tenant/lesson-notes', {
          method: 'POST',
          body: JSON.stringify({
            subject: form.subject, class: form.class, session, term: effTerm, week: form.week,
            topic: form.topic || null, schemeTopicId: form.schemeTopicId || null,
            title: form.title, content: form.content, link: form.link || null,
            ...(form.attachment ? { attachment: form.attachment, attachmentName: form.attachmentName } : {}),
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || 'Failed to save')
        noteId = data?.data?.id
      }
      if (submitAfter && noteId) {
        const res = await tenantApiFetch(`/api/tenant/lesson-notes?id=${noteId}&action=submit`, { method: 'PUT' })
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Saved but failed to submit')
      }
      setShowEditor(false)
      void load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const doAction = async (n: LessonNote, action: string) => {
    const res = await tenantApiFetch(`/api/tenant/lesson-notes?id=${n.id}&action=${action}`, { method: 'PUT' })
    if (!res.ok) {
      const d = await res.json().catch(() => null)
      setError(d?.error || 'Action failed')
      return
    }
    void load()
  }

  const downloadAttachment = async (n: LessonNote) => {
    const res = await tenantApiGet(`/api/tenant/lesson-notes?id=${n.id}`)
    const d = await res.json().catch(() => null)
    if (!d?.data?.attachment_data) return
    const a = document.createElement('a')
    a.href = d.data.attachment_data
    a.download = d.data.attachment_name || 'attachment'
    a.click()
  }

  const doDelete = async (n: LessonNote) => {
    if (!confirm(`Delete draft "${n.title}"?`)) return
    await tenantApiFetch(`/api/tenant/lesson-notes?id=${n.id}`, { method: 'DELETE' })
    void load()
  }

  if (periodLoading || loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Lesson Notes
          </h1>
          <p className="text-sm text-gray-500">
            Write weekly lesson notes for your classes and submit them for review. Session {session}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={effTerm}
            onChange={(e) => setSelTerm(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {sessionTerms.map((t) => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
            {!sessionTerms.length && <option value={effTerm}>{effTerm}</option>}
          </select>
          <Button onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> New Note</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No lesson notes for {effTerm} yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first note — pick your class and subject, write the note, then submit it for review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const st = statusStyle[n.status]
            return (
              <div key={n.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                      <span className="text-xs text-gray-500">Week {n.week} · {n.subject} · {n.class}</span>
                      {n.taught_at && (
                        <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" /> Taught
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1.5">{n.title}</h3>
                    {n.topic && <p className="text-xs text-gray-500">Topic: {n.topic}</p>}
                    {n.excerpt && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.excerpt}…</p>}
                    {n.link && (
                      <a href={n.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" /> Attachment link
                      </a>
                    )}
                    {(n as any).has_attachment && (
                      <button
                        onClick={() => void downloadAttachment(n)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <Download className="w-3 h-3" /> {(n as any).attachment_name || 'Download attachment'}
                      </button>
                    )}
                    {n.status === 'returned' && n.review_comment && (
                      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                        <XCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                        Reviewer: {n.review_comment}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {(n.status === 'draft' || n.status === 'returned') && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => void openEdit(n)} className="gap-1">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => void doAction(n, 'submit')} className="gap-1">
                          <Send className="w-3.5 h-3.5" /> Submit
                        </Button>
                      </>
                    )}
                    {n.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => void doDelete(n)} className="text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {n.status === 'approved' && !n.taught_at && (
                      <Button size="sm" variant="outline" onClick={() => void doAction(n, 'mark-taught')} className="gap-1 text-green-700">
                        <CheckCircle className="w-3.5 h-3.5" /> Mark taught
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Lesson Note' : 'New Lesson Note'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={form.class}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, class: e.target.value, subject: '' })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={form.subject}
                  disabled={!!editing || !form.class}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  <option value="">Select subject</option>
                  {subjectsForClass.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                <select
                  value={form.week}
                  disabled={!!editing}
                  onChange={(e) => pickWeek(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Week {w}{schemeTopics.find((t) => t.week === w) ? ` — ${schemeTopics.find((t) => t.week === w)!.topic}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder={schemeTopics.length ? 'From scheme of work' : 'e.g. Quadratic equations'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to quadratic equations"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note content <span className="text-gray-400 font-normal">(objectives, lesson body, activities, evaluation)</span>
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={'Objectives: By the end of the lesson students should be able to…\n\nIntroduction: …\n\nMain content: …\n\nEvaluation: …'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attachment link <span className="text-gray-400 font-normal">(optional — e.g. a shared document URL)</span>
              </label>
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                type="url"
                placeholder="https://…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File attachment <span className="text-gray-400 font-normal">(optional, max 2MB)</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  <Paperclip className="w-4 h-4" />
                  {form.attachmentName || 'Choose file'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 2_000_000) {
                        setError('File too large — max 2MB')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => setForm((f) => ({ ...f, attachment: String(reader.result), attachmentName: file.name }))
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                {form.attachmentName && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, attachment: '', attachmentName: '', attachmentRemoved: true }))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              {editing && (editing as any).has_attachment && !form.attachment && (
                <p className="text-xs text-gray-400 mt-1">Existing attachment kept unless replaced.</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEditor(false)} disabled={saving}>Cancel</Button>
              <Button
                variant="outline"
                onClick={() => void save(false)}
                disabled={saving || !form.title || !form.content || (!editing && (!form.class || !form.subject))}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save draft'}
              </Button>
              <Button
                onClick={() => void save(true)}
                disabled={saving || !form.title || !form.content || (!editing && (!form.class || !form.subject))}
                className="gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Save & submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
