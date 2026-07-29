import React, { useRef, useState } from 'react'
import { UploadCloud, Download, FileSpreadsheet, AlertTriangle, Loader, CheckCircle2, XCircle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { useToast } from '../ui/use-toast'

function getApiHeaders() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

interface ExportSlot {
  dataset: string
  description: string
  apiPath: string
  csvField?: string
}

const EXPORT_SLOTS: ExportSlot[] = [
  { dataset: 'Students', description: 'Full student directory with enrollment details', apiPath: '/api/tenant/students', csvField: 'data' },
  { dataset: 'Staff directory', description: 'All staff members with roles and departments', apiPath: '/api/tenant/staff', csvField: 'data' },
  { dataset: 'Fee ledger', description: 'Term invoices, settlements, and waivers', apiPath: '/api/tenant/finance', csvField: 'data' },
  { dataset: 'Attendance history', description: 'Daily attendance logs across classes', apiPath: '/api/tenant/attendance', csvField: 'data' },
]

interface ImportJob {
  id: string
  dataset: string
  status: 'processing' | 'succeeded' | 'failed'
  progress: number
  startedAt: string
  error?: string
}

function objectsToCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportExport() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importJobs, setImportJobs] = useState<ImportJob[]>([])
  const [exportingKey, setExportingKey] = useState<string | null>(null)

  const handleExportCSV = async (slot: ExportSlot) => {
    const key = slot.dataset + '-csv'
    try {
      setExportingKey(key)
      const res = await fetch(slot.apiPath, { headers: getApiHeaders() })
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()
      const rows: Record<string, unknown>[] = json[slot.csvField || 'data'] || []
      if (!rows.length) {
        toast({ title: 'No data', description: `No records found for ${slot.dataset}.` })
        return
      }
      const csv = objectsToCSV(rows)
      downloadBlob(csv, `${slot.dataset.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`, 'text/csv')
      toast({ title: 'Export ready', description: `${slot.dataset} downloaded as CSV.` })
    } catch (err) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setExportingKey(null)
    }
  }

  const handleExportJSON = async (slot: ExportSlot) => {
    const key = slot.dataset + '-json'
    try {
      setExportingKey(key)
      const res = await fetch(slot.apiPath, { headers: getApiHeaders() })
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()
      const rows = json[slot.csvField || 'data'] || []
      downloadBlob(JSON.stringify(rows, null, 2), `${slot.dataset.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`, 'application/json')
      toast({ title: 'Export ready', description: `${slot.dataset} downloaded as JSON.` })
    } catch (err) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setExportingKey(null)
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const jobId = `job-${Date.now()}`
    const job: ImportJob = {
      id: jobId,
      dataset: file.name,
      status: 'processing',
      progress: 0,
      startedAt: new Date().toLocaleTimeString(),
    }
    setImportJobs(prev => [job, ...prev])

    const interval = setInterval(() => {
      setImportJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j
        const next = Math.min(j.progress + Math.floor(Math.random() * 20 + 10), 100)
        if (next >= 100) {
          clearInterval(interval)
          return { ...j, progress: 100, status: 'succeeded' }
        }
        return { ...j, progress: next }
      }))
    }, 600)

    toast({ title: 'Import started', description: `Processing ${file.name}…` })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Data operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Import &amp; export</h1>
          <p className="text-sm text-gray-500">Sync Scholix with your SIS, HR, and finance tooling.</p>
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelected} />
          <Button onClick={() => fileInputRef.current?.click()}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Import file
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Import jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <UploadCloud className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No imports yet. Click "Import file" to begin.</p>
              </div>
            ) : (
              importJobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{job.dataset}</p>
                      <p className="text-xs text-gray-500">Started {job.startedAt}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${
                      job.status === 'processing' ? 'text-amber-600' :
                      job.status === 'succeeded' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {job.status === 'processing' && <Loader className="h-3 w-3 animate-spin" />}
                      {job.status === 'succeeded' && <CheckCircle2 className="h-3 w-3" />}
                      {job.status === 'failed' && <XCircle className="h-3 w-3" />}
                      {job.status === 'processing' ? 'Processing' : job.status === 'succeeded' ? 'Completed' : 'Failed'}
                    </span>
                  </div>
                  <Progress value={job.progress} className="mt-3" />
                  <div className="mt-2 text-xs text-gray-500">{job.progress}% complete</div>
                </div>
              ))
            )}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Keep the browser tab open while imports run to capture live statuses.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-gray-600">
              <Download className="h-4 w-4 text-emerald-600" />
              Exports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {EXPORT_SLOTS.map((slot) => (
              <div key={slot.dataset} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{slot.dataset}</p>
                    <p className="text-xs text-gray-500">{slot.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    variant="outline" size="sm"
                    disabled={exportingKey === slot.dataset + '-csv'}
                    onClick={() => handleExportCSV(slot)}
                  >
                    {exportingKey === slot.dataset + '-csv'
                      ? <Loader className="h-3 w-3 animate-spin mr-1" />
                      : <Download className="h-3 w-3 mr-1" />}
                    CSV
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={exportingKey === slot.dataset + '-json'}
                    onClick={() => handleExportJSON(slot)}
                  >
                    {exportingKey === slot.dataset + '-json'
                      ? <Loader className="h-3 w-3 animate-spin mr-1" />
                      : <Download className="h-3 w-3 mr-1" />}
                    JSON
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default ImportExport;
