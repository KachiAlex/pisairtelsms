import { useState, useEffect } from 'react'
import { MessageSquare, Search, Filter, Download, AlertCircle } from 'lucide-react'
import { useParentContext } from '../../../contexts/ParentContext'
import { getAuthFromStorage } from '../../../lib/auth'

interface Announcement {
  id: string
  title: string
  content: string
  category: string
  date: string
  isRead: boolean
  attachments?: Array<{ name: string; url: string }>
}

export function Communications() {
  const { selectedChild } = useParentContext()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const categories = ['all', 'academic', 'event', 'health', 'general', 'urgent']

  const fetchAnnouncements = async () => {
    if (!selectedChild) return
    setIsLoading(true)
    try {
      const auth = getAuthFromStorage()
      const res = await fetch(
        `/api/parent/announcements?childId=${selectedChild.id}&limit=100`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      )
      if (!res.ok) throw new Error('Failed to fetch announcements')
      const data = await res.json()
      setAnnouncements(data.announcements || [])
      setError(null)
    } catch (err) {
      setError('Failed to load announcements')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [selectedChild])

  const handleMarkAsRead = async (announcementId: string) => {
    try {
      const auth = getAuthFromStorage()
      await fetch(`/api/parent/announcements/${announcementId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${auth?.token}` },
      })
      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, isRead: true } : a)
      )
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage)
  const unreadCount = announcements.filter(a => !a.isRead).length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Communications</h1>
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
              onClick={fetchAnnouncements}
              className="text-xs text-red-700 hover:text-red-900 font-medium mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 self-center" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat)
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-100">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No announcements found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedAnnouncements.map(announcement => (
            <div
              key={announcement.id}
              onClick={() => {
                setSelectedAnnouncement(announcement)
                if (!announcement.isRead) {
                  handleMarkAsRead(announcement.id)
                }
              }}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                announcement.isRead
                  ? 'bg-white border-gray-100 hover:border-gray-200'
                  : 'bg-blue-50 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{announcement.title}</h3>
                    {!announcement.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded capitalize">
                      {announcement.category}
                    </span>
                    <span>{new Date(announcement.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">{selectedAnnouncement.title}</h2>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="px-2 py-1 bg-gray-100 rounded capitalize">
                  {selectedAnnouncement.category}
                </span>
                <span>{new Date(selectedAnnouncement.date).toLocaleDateString()}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>
              {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h4>
                  <div className="space-y-2">
                    {selectedAnnouncement.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-blue-600"
                      >
                        <Download className="w-4 h-4" />
                        {att.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
