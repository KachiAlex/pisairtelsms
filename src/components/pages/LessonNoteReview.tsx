import React, { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Loader2, AlertTriangle, CheckCircle, XCircle, Plus, Trash2,
  ClipboardCheck, ListChecks, BarChart3, ExternalLink, GraduationCap,
} from 'lucide-react'
import { Button } from '../ui/button'
import { tenantApiGet, tenantApiFetch } from '../../lib/tenantApi'
import { useAcademicPeriod } from '../../hooks/useAcademicPeriod'

interface Note {
  id: string
  staff_id: string
  staff_name: string | null
  subject: string
  class: string
  week: number
  topic: string | null
  title: string
  excerpt?: string
  content?: string
  link: string | null
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  submitted_at: string | null
  review_comment: string | null
  taught_at: string | null
}

interface SchemeTopic { id: string; week: number; topic: string; description: string | null }
interface CoverageNote { week: number; status: string; taught: boolean; n: number }

type Tab = 'review' | 'scheme' | 'coverage'

export function LessonNoteReview() {
  const { session, term, sessionTerms, loading: periodLoading } = useAcademicPeriod()
  const [selTerm, setSelTerm] = useState('')
  const effTerm = selTerm || term

  const [tab, setTab] = useState<Tab>('review')
  const [classes, setClasses] = useState<string[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [selClass, setSelClass] = useState('')
  const [selSubject, setSelSubject] = useState('')

  const [queue, setQueue] = useState<Note[]>([])
  const [expanded, setExpanded] = useState<Note | null>(null)
  const [comment, setComment] = useState('')
  const [scheme, setScheme] = useState<SchemeTopic[]>([])
  const [coverage, setCoverage] = useState<CoverageNote[]>([])
  const [newTopic, setNewTopic] = useState({ week: 1, topic: '', description: '' })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pickers
  useEffect(() => {
    Promise.all([
      tenantApiGet('/api/tenant/academics/classes'),
      tenantApiGet('/api/tenant/academics/subjects'),
    ]).then(async ([c, s]) => {
      const cd = await c.json().catch(() => null)
      const sd = await s.json().catch(() => null)
      const cls = [...new Set((cd?.data || []).map((x: any) => x.name).filter(Boolean))] as string[]
      const subs = [...new Set((sd?.data || []).map((x: any) => (typeof x === 'string' ? x : x.name)).filter(Boolean))] as string[]
      setClasses(cls)
      setSubjects(subs)
      setSelClass(cls[0] || '')
      setSelSubject(subs[0] || '')
    }).catch(() => {})
  }, [])

  const loadQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tenantApiGet('/api/tenant/lesson-notes?status=submitted')
      const d = await res.json().catch(() => null)
      setQueue(d?.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadScheme = useCallback(async () => {
    if (!selSubject || !selClass || !effTerm) return
    setLoading(true)
    try {
      const res = await tenantApiGet(
        `/api/tenant/schemes?subject=${encodeURIComponent(selSubject)}&class=${encodeURIComponent(selClass)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(effTerm)}`
      )
      const d = await res.json().catch(() => null)
      setScheme(d?.data || [])
    } finally {
      setLoading(false)
    }
  }, [selSubject, selClass, session, effTerm])

  const loadCoverage = useCallback(async () => {
    if (!selSubject || !selClass || !effTerm) return
    setLoading(true)
    try {
      const res = await tenantApiGet(
        `/api/tenant/schemes?coverage=1&subject=${encodeURIComponent(selSubject)}&class=${encodeURIComponent(selClass)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(effTerm)}`
      )
      const d = await res.json().catch(() => null)
      setScheme(d?.data?.topics || [])
      setCoverage(d?.data?.notes || [])
    } finally {
      setLoading(false)
    }
  }, [selSubject, selClass, session, effTerm])

  useEffect(() => {
    if (periodLoading) return
    if (tab === 'review') void loadQueue()
    if (tab === 'scheme') void loadScheme()
    if (tab === 'coverage') void loadCoverage()
  }, [tab, periodLoading, loadQueue, loadScheme, loadCoverage])

  const expand = async (n: Note) => {
    const res = await tenantApiGet(`/api/tenant/lesson-notes?id=${n.id}`)
    const d = await res.json().catch(() => null)
    setExpanded(d?.data || n)
    setComment('')
  }

  const review = async (id: string, action: 'approve' | 'return') => {
    const res = await tenantApiFetch(`/api/tenant/lesson-notes?id=${id}&action=${action}`, {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    })
    const d = await res.json().catch(() => null)
    if (!res.ok) {
      setError(d?.error || 'Review failed')
      return
    }
    setExpanded(null)
    setComment('')
    void loadQueue()
  }

  const addSchemeTopic = async () => {
    const res = await tenantApiFetch('/api/tenant/schemes', {
      method: 'POST',
      body: JSON.stringify({
        subject: selSubject, class: selClass, session, term: effTerm,
        week: newTopic.week, topic: newTopic.topic, description: newTopic.description || null,
      }),
    })
    const d = await res.json().catch(() => null)
    if (!res.ok) {
      setError(d?.error || 'Failed to add topic')
      return
    }
    setNewTopic({ week: newTopic.week + 1, topic: '', description: '' })
    void (tab === 'coverage' ? loadCoverage() : loadScheme())
  }

  const removeSchemeTopic = async (id: string) => {
    await tenantApiFetch(`/api/tenant/schemes?id=${id}`, { method: 'DELETE' })
    void (tab === 'coverage' ? loadCoverage() : loadScheme())
  }

  const scopeSelectors = (
    <div className="flex items-center gap-2 flex-wrap">
      <select value={selClass} onChange={(e) => setSelClass(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        {classes.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={selSubject} onChange={(e) => setSelSubject(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={effTerm} onChange={(e) => setSelTerm(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        {sessionTerms.map((t) => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
        {!sessionTerms.length && <option value={effTerm}>{effTerm}</option>}
      </select>
    </div>
  )

  const statusBadge = (s: Note['status']) => {
    const map = {
      draft: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-50 text-blue-700',
      approved: 'bg-green-50 text-green-700', returned: 'bg-red-50 text-red-700',
    }
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[s]}`}>{s}</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Scheme of Work & Lesson Notes
          </h1>
          <p className="text-sm text-gray-500">
            Set the term scheme per subject/class, vet submitted lesson notes, and track coverage. Session {session}.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'review' as Tab, label: 'Review Queue', icon: ClipboardCheck },
          { id: 'scheme' as Tab, label: 'Scheme of Work', icon: ListChecks },
          { id: 'coverage' as Tab, label: 'Coverage', icon: BarChart3 },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {t.id === 'review' && queue.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-1.5">{queue.length}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}

      {/* -------- Review queue -------- */}
      {tab === 'review' && !loading && (
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
              <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
              No notes awaiting review.
            </div>
          ) : queue.map((n) => (
            <div key={n.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(n.status)}
                    <span className="text-xs text-gray-500">
                      {n.staff_name || n.staff_id} · Week {n.week} · {n.subject} · {n.class}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-1">{n.title}</h3>
                  {expanded?.id === n.id ? (
                    <div className="mt-3 space-y-3">
                      {expanded.topic && <p className="text-xs text-gray-500">Topic: {expanded.topic}</p>}
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-lg p-3 border border-gray-100 font-sans">
                        {expanded.content}
                      </pre>
                      {expanded.link && (
                        <a href={expanded.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> {expanded.link}
                        </a>
                      )}
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={2}
                        placeholder="Review comment (required when returning)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void review(n.id, 'approve')} className="gap-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void review(n.id, 'return')} disabled={!comment} className="gap-1 text-red-600">
                          <XCircle className="w-3.5 h-3.5" /> Return for revision
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>Close</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {n.excerpt && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.excerpt}…</p>}
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => void expand(n)}>
                        Read & review
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -------- Scheme of work -------- */}
      {tab === 'scheme' && !loading && (
        <div className="space-y-4">
          {scopeSelectors}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Scheme for {selSubject} — {selClass} — {effTerm}
            </p>
            <div className="grid grid-cols-12 gap-2 mb-3 items-end">
              <select
                value={newTopic.week}
                onChange={(e) => setNewTopic({ ...newTopic, week: Number(e.target.value) })}
                className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => <option key={w} value={w}>Week {w}</option>)}
              </select>
              <input
                value={newTopic.topic}
                onChange={(e) => setNewTopic({ ...newTopic, topic: e.target.value })}
                placeholder="Topic"
                className="col-span-5 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                placeholder="Description (optional)"
                className="col-span-4 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={() => void addSchemeTopic()} disabled={!newTopic.topic} className="col-span-1">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {scheme.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No scheme topics yet — add the weekly topics teachers should cover.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {scheme.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3 w-20 text-gray-500 font-medium">Week {t.week}</td>
                      <td className="py-2 pr-3 font-medium text-gray-900">{t.topic}</td>
                      <td className="py-2 pr-3 text-gray-500">{t.description}</td>
                      <td className="py-2 w-10 text-right">
                        <button onClick={() => void removeSchemeTopic(t.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------- Coverage -------- */}
      {tab === 'coverage' && !loading && (
        <div className="space-y-4">
          {scopeSelectors}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Coverage — {selSubject} — {selClass} — {effTerm}
            </p>
            {scheme.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No scheme topics defined — add them in the Scheme of Work tab first.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 w-20">Week</th>
                    <th className="py-2">Scheme topic</th>
                    <th className="py-2 w-40">Lesson note</th>
                    <th className="py-2 w-24">Taught</th>
                  </tr>
                </thead>
                <tbody>
                  {scheme.map((t) => {
                    const notes = coverage.filter((c) => c.week === t.week)
                    const approved = notes.find((c) => c.status === 'approved')
                    const submitted = notes.find((c) => c.status === 'submitted')
                    const taught = notes.some((c) => c.taught)
                    return (
                      <tr key={t.id} className="border-t border-gray-100">
                        <td className="py-2 text-gray-500 font-medium">Week {t.week}</td>
                        <td className="py-2 text-gray-900">{t.topic}</td>
                        <td className="py-2">
                          {approved ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Approved</span>
                          ) : submitted ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">In review</span>
                          ) : notes.length ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Draft only</span>
                          ) : (
                            <span className="text-xs text-red-500">No note</span>
                          )}
                        </td>
                        <td className="py-2">
                          {taught
                            ? <GraduationCap className="w-4 h-4 text-green-600" />
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
