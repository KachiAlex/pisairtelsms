import React, { useEffect, useState } from 'react'
import { FileText, Award, Download, AlertCircle, ExternalLink } from 'lucide-react'
import { getAuthFromStorage } from '../../../lib/auth'

interface Doc {
  id: string
  name: string
  category: string
  status: string
  fileType: string
  uploadedAt: string | null
  hasFile: boolean
}
interface Cert {
  id: string
  code: string
  issuedAt: string
  status: string
  verifyUrl: string
}

export function MyDocuments() {
  const [documents, setDocuments] = useState<Doc[]>([])
  const [certificates, setCertificates] = useState<Cert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocs = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = getAuthFromStorage()?.token
      if (!token) { setError('Not authenticated'); return }
      const res = await fetch('/api/student/documents', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load documents')
      const data = await res.json()
      setDocuments(data.documents || [])
      setCertificates(data.certificates || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  const download = async (doc: Doc) => {
    const token = getAuthFromStorage()?.token
    const res = await fetch(`/api/student/documents?id=${doc.id}&download=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" /> Certificates
        </h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
        ) : certificates.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">
            No certificates issued yet. Certificates you earn will appear here.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {certificates.map(c => (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="font-mono font-semibold text-gray-900">{c.code}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Issued {new Date(c.issuedAt).toLocaleDateString()} ·{' '}
                  <span className={c.status === 'valid' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {c.status}
                  </span>
                </p>
                <a
                  href={c.verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Verification link
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" /> School Documents
        </h2>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-200" />)}</div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">
            No documents on file. Documents the school uploads for you will appear here.
          </p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {documents.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-4">
                <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{d.name}</p>
                  <p className="text-xs text-gray-500">
                    {d.category} · {d.status}
                    {d.uploadedAt && ` · ${new Date(d.uploadedAt).toLocaleDateString()}`}
                  </p>
                </div>
                {d.hasFile && (
                  <button
                    onClick={() => download(d)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default MyDocuments
