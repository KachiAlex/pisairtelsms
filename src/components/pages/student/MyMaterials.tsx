import React, { useState, useEffect } from 'react'
import { FileText, Video, Music, Link2, Image, Search, Download, Eye, Filter, BookOpen, Clock, X, Star, Loader2, AlertCircle } from 'lucide-react'
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
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchMaterials()
  }, [selectedSubject, selectedType, showRequiredOnly])

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
    </div>
  )
}
