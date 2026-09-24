import React, { useState, useEffect } from 'react'
import { FileText, Video, Music, Link2, Image, Search, Download, Eye, Filter, BookOpen, Clock, X, Star, Loader2, AlertCircle, GraduationCap, Paperclip } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

type MaterialType = 'document' | 'video' | 'audio' | 'link' | 'image'

interface CourseMaterial {
  id: string
  title: string
  description: string
  subject: string
  teacher: string
  type: MaterialType
  fileName: string
  fileSize: string
  fileType: string
  url: string
  uploadDate: string
  academicSession: string
  term: string
  classLevel: string
  tags: string[]
  isRequired: boolean
  viewCount: number
}

interface LessonNote {
  id: string
  staff_name: string | null
  subject: string
  session: string
  term: string
  week: number
  topic: string | null
  title: string
  excerpt?: string
  content?: string
  link: string | null
  attachment_name: string | null
  attachment_data?: string
  has_attachment?: boolean
  taught_at: string | null
}

interface MaterialsResponse {
  materials: CourseMaterial[]
  subjects: string[]
  types: string[]
}

const typeConfig: Record<MaterialType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  document: { label: 'Document', icon: <FileText className="w-4 h-4" />, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  video: { label: 'Video', icon: <Video className="w-4 h-4" />, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  audio: { label: 'Audio', icon: <Music className="w-4 h-4" />, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  link: { label: 'Link', icon: <Link2 className="w-4 h-4" />, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  image: { label: 'Image', icon: <Image className="w-4 h-4" />, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
}

export function MyMaterials() {
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showRequiredOnly, setShowRequiredOnly] = useState(false)
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([])
  const [openNote, setOpenNote] = useState<LessonNote | null>(null)
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchMaterials()
  }, [selectedSubject, selectedType, showRequiredOnly])

  useEffect(() => {
    const token = auth?.token
    if (!token) return
    fetch('/api/student/lesson-notes', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setLessonNotes(d?.data || []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openLessonNote = async (n: LessonNote) => {
    const token = auth?.token
    const res = await fetch(`/api/student/lesson-notes?id=${n.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = await res.json().catch(() => null)
    setOpenNote(d?.data || n)
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }
    const timer = setTimeout(() => {
      fetchMaterials(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchMaterials = async (withSearch = false) => {
    try {
      setLoading(true)
      setError(null)
      const token = auth?.token
      if (!token) { setError('Not authenticated'); return }

      const params = new URLSearchParams()
      if (selectedSubject !== 'all') params.set('subject', selectedSubject)
      if (selectedType !== 'all') params.set('type', selectedType)
      if (showRequiredOnly) params.set('required', 'true')
      if (withSearch && searchQuery.trim()) params.set('search', searchQuery.trim())

      const url = `/api/student/materials?${params}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to fetch materials')

      const data: MaterialsResponse = await res.json()
      setMaterials(data.materials || [])
      setSubjects(data.subjects || [])
      setTypes(data.types || [])
    } catch (err) {
      console.error('Failed to fetch materials:', err)
      setError('Failed to load course materials')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: MaterialType) => {
    switch (type) {
      case 'document': return <FileText className="w-8 h-8 text-blue-500" />
      case 'video': return <Video className="w-8 h-8 text-red-500" />
      case 'audio': return <Music className="w-8 h-8 text-purple-500" />
      case 'link': return <Link2 className="w-8 h-8 text-green-500" />
      case 'image': return <Image className="w-8 h-8 text-amber-500" />
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    })
  }

  const handleOpen = (material: CourseMaterial) => {
    if (material.url) {
      window.open(material.url, '_blank')
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    fetchMaterials()
  }

  const requiredCount = materials.filter(m => m.isRequired).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Materials</h1>
          <p className="text-gray-600 mt-1">
            {materials.length} material{materials.length !== 1 ? 's' : ''} available · {requiredCount} required
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => fetchMaterials()}>Retry</Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="document">Documents</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="link">Links</option>
            <option value="image">Images</option>
          </select>
          <button
            onClick={() => setShowRequiredOnly(!showRequiredOnly)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showRequiredOnly
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Required Only
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {(['document', 'video', 'audio', 'link', 'image'] as MaterialType[]).map(type => {
          const count = materials.filter(m => m.type === type).length
          if (count === 0) return null
          const config = typeConfig[type]
          return (
            <div key={type} className={`rounded-lg p-3 text-center border ${config.bg}`}>
              <div className="flex justify-center mb-1">{config.icon}</div>
              <p className={`text-lg font-bold ${config.color}`}>{count}</p>
              <p className={`text-xs ${config.color}`}>{config.label}s</p>
            </div>
          )
        })}
      </div>

      {/* Approved Lesson Notes */}
      {lessonNotes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Lesson Notes</h2>
            <span className="text-xs text-gray-500">— approved notes from your teachers</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {lessonNotes.map((n) => (
              <button
                key={n.id}
                onClick={() => void openLessonNote(n)}
                className="text-left border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-indigo-700">{n.subject}</span>
                  <span>·</span>
                  <span>Week {n.week}</span>
                  {n.has_attachment && <Paperclip className="w-3 h-3" />}
                </div>
                <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{n.title}</p>
                {n.topic && <p className="text-xs text-gray-500 truncate">{n.topic}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Materials List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {searchQuery || selectedSubject !== 'all' || selectedType !== 'all' || showRequiredOnly
              ? 'No materials match your filters'
              : 'No course materials available'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery || selectedSubject !== 'all' || selectedType !== 'all' || showRequiredOnly
              ? 'Try adjusting your filters'
              : 'Materials will appear here once uploaded by teachers'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map(material => {
            const config = typeConfig[material.type]
            return (
              <div
                key={material.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getTypeIcon(material.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.color}`}>
                            {config.icon}
                            {config.label}
                          </span>
                          {material.isRequired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                              <Star className="w-3 h-3" />
                              Required
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 mt-2">{material.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{material.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{material.subject}</span>
                          <span>·</span>
                          <span>{material.teacher}</span>
                          <span>·</span>
                          <span>{material.fileSize}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(material.uploadDate)}
                          </span>
                        </div>
                        {material.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {material.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mr-2">
                          <Eye className="w-4 h-4" />
                          {material.viewCount}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpen(material)}
                          className="gap-1"
                        >
                          {material.type === 'link' ? (
                            <>
                              <Link2 className="w-4 h-4" />
                              Open
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Download
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lesson note reader */}
      {openNote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpenNote(null)}>
          <div
            className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium text-indigo-700">{openNote.subject}</span>
                  <span>·</span>
                  <span>Week {openNote.week}</span>
                  <span>·</span>
                  <span>{openNote.staff_name || 'Teacher'}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mt-1">{openNote.title}</h2>
                {openNote.topic && <p className="text-sm text-gray-500">Topic: {openNote.topic}</p>}
              </div>
              <button onClick={() => setOpenNote(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-lg p-4 border border-gray-100 font-sans">
              {openNote.content || openNote.excerpt}
            </pre>
            <div className="flex items-center gap-3">
              {openNote.link && (
                <a href={openNote.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Link2 className="w-4 h-4" /> Open link
                </a>
              )}
              {openNote.attachment_data && (
                <button
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = openNote.attachment_data!
                    a.download = openNote.attachment_name || 'attachment'
                    a.click()
                  }}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> {openNote.attachment_name || 'Download attachment'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
