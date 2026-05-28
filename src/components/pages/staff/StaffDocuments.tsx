import React, { useState, useEffect } from 'react'
import { FileText, Calendar, Search, Download, File, FileSpreadsheet, FileImage, Filter, X, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { Button } from '../../ui/button'
import { getAuthFromStorage } from '../../../lib/auth'

type DocumentCategory = 'policy' | 'academic' | 'calendar' | 'form' | 'handbook' | 'other'

interface Document {
  id: string
  title: string
  description: string
  category: DocumentCategory
  fileName: string
  fileSize: string
  fileType: string
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
  downloadUrl: string
  isRestricted: boolean
  department?: string
  academicYear?: string
}

export function StaffDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const auth = getAuthFromStorage()

  useEffect(() => {
    fetchDocuments()
  }, [selectedCategory])

  useEffect(() => {
    // Filter documents based on search query
    if (searchQuery.trim()) {
      const filtered = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredDocuments(filtered)
    } else {
      setFilteredDocuments(documents)
    }
  }, [searchQuery, documents])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = auth?.token
      if (!token) {
        setError('Not authenticated')
        return
      }

      const url = selectedCategory !== 'all'
        ? `/api/staff/documents?category=${selectedCategory}`
        : '/api/staff/documents'

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()
      setDocuments(data.documents || [])
      setFilteredDocuments(data.documents || [])
      setCategories(data.categories || [])
    } catch (err) {
      console.error('Failed to fetch documents:', err)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />
    }
    if (fileType.includes('image')) {
      return <FileImage className="w-8 h-8 text-purple-500" />
    }
    return <FileText className="w-8 h-8 text-blue-500" />
  }

  const getCategoryColor = (category: DocumentCategory) => {
    switch (category) {
      case 'policy':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'academic':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'calendar':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'form':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'handbook':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleDownload = (doc: Document) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank')
    } else {
      console.warn('No download URL available for document:', doc.id)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
          <p className="text-gray-600 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
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

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="all">All Categories</option>
            <option value="policy">Policies</option>
            <option value="academic">Academic</option>
            <option value="calendar">Calendars</option>
            <option value="form">Forms</option>
            <option value="handbook">Handbooks</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
          <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-700">
            {documents.filter(d => d.category === 'policy').length}
          </p>
          <p className="text-sm text-blue-600">Policies</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
          <Calendar className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-700">
            {documents.filter(d => d.category === 'calendar').length}
          </p>
          <p className="text-sm text-green-600">Calendars</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-100">
          <FileText className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-amber-700">
            {documents.filter(d => d.category === 'form').length}
          </p>
          <p className="text-sm text-amber-600">Forms</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
          <File className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-700">
            {documents.filter(d => d.category === 'academic').length}
          </p>
          <p className="text-sm text-purple-600">Academic</p>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {searchQuery ? 'No documents match your search' : 'No documents found'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery ? 'Try a different search term' : 'Documents will appear here once uploaded'}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={clearSearch} className="mt-4">
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(doc.fileType)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${getCategoryColor(doc.category)}`}>
                          {doc.category}
                        </span>
                        <span className="text-xs text-gray-500">{doc.fileSize}</span>
                        <span className="text-xs text-gray-500">·</span>
                        <span className="text-xs text-gray-500">Uploaded {formatDate(doc.uploadedAt)}</span>
                        {doc.department && (
                          <>
                            <span className="text-xs text-gray-500">·</span>
                            <span className="text-xs text-gray-500">{doc.department}</span>
                          </>
                        )}
                        {doc.academicYear && (
                          <>
                            <span className="text-xs text-gray-500">·</span>
                            <span className="text-xs text-gray-500">{doc.academicYear}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      onClick={() => handleDownload(doc)}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Need a document that's not here?</p>
          <p>
            Contact your department head or the administration office to request additional documents.
            All restricted documents require proper authorization.
          </p>
        </div>
      </div>
    </div>
  )
}
