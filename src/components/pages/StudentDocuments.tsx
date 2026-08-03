import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileText,
  UploadCloud,
  ShieldAlert,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  RefreshCcw,
  Layers,
  ScanLine,
  Eye,
  MailQuestion,
  XCircle,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { DocumentUploadDialog } from './DocumentUploadDialog'
import {
  fetchStudentDocuments,
  StudentDocument,
  StudentDocumentCategory,
  StudentDocumentStatus,
} from '../../lib/studentDocumentsClient'

const STATUS_ORDER: StudentDocumentStatus[] = ['Pending review', 'Awaiting upload', 'Escalated']

const STATUS_BADGE_VARIANT: Record<StudentDocumentStatus, 'secondary' | 'outline' | 'destructive'> = {
  'Pending review': 'secondary',
  'Awaiting upload': 'outline',
  Escalated: 'destructive',
}

const STATUS_TONE: Record<StudentDocumentStatus, string> = {
  'Pending review': 'text-amber-600',
  'Awaiting upload': 'text-red-600',
  Escalated: 'text-rose-600',
}

export function StudentDocuments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | StudentDocumentCategory>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | StudentDocumentStatus>('all')
  const [selectedDoc, setSelectedDoc] = useState<StudentDocument | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'request' | 'reject' | null>(null)
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const loadDocuments = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchStudentDocuments(signal)
      setDocuments(data)
      setLastSyncedAt(new Date())
    } catch (err) {
      if (signal?.aborted) return
      console.warn('Unable to fetch student documents', err)
      setError(err instanceof Error ? err.message : 'Unable to load student documents')
    } finally {
      if (signal?.aborted) return
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadDocuments(controller.signal)
    return () => controller.abort()
  }, [loadDocuments])

  const categoryOptions = useMemo(() => {
    const unique = new Set<StudentDocumentCategory>()
    documents.forEach((doc) => unique.add(doc.category))
    return Array.from(unique).sort()
  }, [documents])

  const statusOptions = useMemo(() => {
    const unique = new Set<StudentDocumentStatus>()
    documents.forEach((doc) => unique.add(doc.status))
    return Array.from(unique).sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))
  }, [documents])

  const statusCounts = useMemo(() => {
    return documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] ?? 0) + 1
      return acc
    }, {} as Record<StudentDocumentStatus, number>)
  }, [documents])

  const pendingReviewCount = statusCounts['Pending review'] ?? 0
  const awaitingUploadCount = statusCounts['Awaiting upload'] ?? 0
  const escalatedCount = statusCounts.Escalated ?? 0
  const totalDocuments = documents.length
  const uniqueOwners = useMemo(() => new Set(documents.map((doc) => doc.owner)).size, [documents])

  const summaryStats = useMemo(
    () => [
      {
        label: 'Documents tracked',
        value: totalDocuments.toString(),
        detail: totalDocuments ? `${pendingReviewCount} pending review` : 'No documents yet',
        trend: lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : 'Sync pending',
        tone: 'text-blue-600',
      },
      {
        label: 'Awaiting uploads',
        value: awaitingUploadCount.toString(),
        detail: awaitingUploadCount ? 'Follow up with guardians' : 'All uploads received',
        trend: `${uniqueOwners} owner${uniqueOwners === 1 ? '' : 's'} involved`,
        tone: 'text-amber-600',
      },
      {
        label: 'Escalations',
        value: escalatedCount.toString(),
        detail: escalatedCount ? 'Requires staff attention' : 'No open escalations',
        trend: `${pendingReviewCount} still in review`,
        tone: 'text-rose-600',
      },
      {
        label: 'Categories covered',
        value: categoryOptions.length.toString(),
        detail:
          categoryOptions.length === 0
            ? 'Assign categories to documents'
            : categoryOptions.slice(0, 3).join(' • '),
        trend: 'Auto-generated from live data',
        tone: 'text-emerald-600',
      },
    ],
    [awaitingUploadCount, categoryOptions, escalatedCount, lastSyncedAt, pendingReviewCount, totalDocuments, uniqueOwners]
  )

  const categorySnapshots = useMemo(() => {
    const map = new Map<StudentDocumentCategory, { total: number; awaiting: number; escalated: number }>()
    documents.forEach((doc) => {
      const stats = map.get(doc.category) ?? { total: 0, awaiting: 0, escalated: 0 }
      stats.total += 1
      if (doc.status === 'Awaiting upload') stats.awaiting += 1
      if (doc.status === 'Escalated') stats.escalated += 1
      map.set(doc.category, stats)
    })
    return Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        total: stats.total,
        awaiting: stats.awaiting,
        escalated: stats.escalated,
        reviewed: stats.total - stats.awaiting - stats.escalated,
      }))
      .sort((a, b) => b.total - a.total)
  }, [documents])

  const statusAlerts = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        count: statusCounts[status] ?? 0,
        tone: STATUS_TONE[status],
      })).filter((alert) => alert.count > 0),
    [statusCounts]
  )

  const ownerSnapshots = useMemo(() => {
    const counts = new Map<string, number>()
    documents.forEach((doc) => {
      const owner = doc.owner?.trim() || 'Unassigned'
      counts.set(owner, (counts.get(owner) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([owner, count]) => ({ owner, count }))
  }, [documents])

  const workflowInsights = useMemo(
    () =>
      [
        {
          label: 'Needs review',
          value: pendingReviewCount,
          action: 'Assign reviewers',
          tone: 'text-amber-600',
        },
        {
          label: 'Awaiting uploads',
          value: awaitingUploadCount,
          action: 'Send guardian reminders',
          tone: 'text-blue-600',
        },
        {
          label: 'Escalations',
          value: escalatedCount,
          action: 'Resolve high-priority items',
          tone: 'text-rose-600',
        },
      ].filter((insight) => insight.value > 0),
    [awaitingUploadCount, escalatedCount, pendingReviewCount]
  )

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return documents.filter((doc) => {
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false
      if (!query) return true
      return (
        doc.student.toLowerCase().includes(query) ||
        doc.doc.toLowerCase().includes(query) ||
        doc.owner.toLowerCase().includes(query)
      )
    })
  }, [categoryFilter, documents, searchTerm, statusFilter])

  const lastSyncedLabel = lastSyncedAt ? lastSyncedAt.toLocaleString() : 'Not synced yet'

  const handleUploadComplete = useCallback(
    (uploadedFiles: unknown[]) => {
      console.log('Upload completed:', uploadedFiles)
      loadDocuments()
    },
    [loadDocuments]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Student document vault</h1>
          <p className="text-sm text-gray-600">Track every checklist, approvals, and expiring documents for each cohort.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => loadDocuments()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Request updates
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload new scan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.detail}</p>
              <p className={`text-xs mt-1 ${stat.tone}`}>{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-gray-500">Last synced: {lastSyncedLabel}</p>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search student, document type, or owner..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              >
                <option value="all">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {categorySnapshots.length === 0 && (
          <Card className="lg:col-span-3">
            <CardContent className="p-8 text-center text-sm text-gray-500">
              No documents available yet. Upload documents or connect your SIS to begin tracking completion.
            </CardContent>
          </Card>
        )}
        {categorySnapshots.map((snapshot) => (
          <Card key={snapshot.category} className="bg-slate-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{snapshot.category}</CardTitle>
                  <CardDescription>{snapshot.total} document{snapshot.total === 1 ? '' : 's'}</CardDescription>
                </div>
                <Badge variant="secondary">{snapshot.reviewed} cleared</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Awaiting upload</span>
                <Badge variant="outline">{snapshot.awaiting}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Escalated</span>
                <Badge variant="outline">{snapshot.escalated}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Reviewed</span>
                <Badge variant="outline">{snapshot.reviewed}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Pending validations
            </CardTitle>
            <CardDescription>Documents waiting for human review or escalation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 overflow-x-auto">
            {isLoading && <p className="text-xs text-gray-500">Loading latest documents…</p>}
            {error && (
              <p className="text-xs text-rose-600">Unable to fetch live data ({error}). Showing latest cached view.</p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-gray-500">
                      {isLoading ? 'Loading documents…' : 'No documents match the current filters.'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredDocuments.map((item) => (
                  <TableRow key={`${item.student}-${item.doc}`}>
                    <TableCell className="font-medium">{item.student}</TableCell>
                    <TableCell>{item.cohort}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{item.doc}</TableCell>
                    <TableCell className="text-sm text-gray-500">{item.owner}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[item.status]}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      <div className="flex flex-col items-end gap-1">
                        <span>{item.aging}</span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setSelectedDoc(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectedDoc(item)
                              setActionType('request')
                            }}
                          >
                            <MailQuestion className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-600"
                            onClick={() => {
                              setSelectedDoc(item)
                              setActionType('reject')
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <Button variant="ghost" size="sm" className="text-blue-600">
                View escalation board
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-1" /> Share queue
                </Button>
                <Button size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Bulk approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock3 className="h-4 w-4 text-amber-600" />
              Compliance radar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            {statusAlerts.length === 0 && (
              <p className="text-xs text-gray-500">No compliance alerts yet. Once documents sync in, status badges will surface here.</p>
            )}
            {statusAlerts.map((alert) => (
              <div key={alert.status} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900 flex items-center justify-between">
                  <span>{alert.status}</span>
                  <span className={`text-xs ${alert.tone}`}>{alert.count} item{alert.count === 1 ? '' : 's'}</span>
                </p>
                <Button variant="ghost" size="sm" className="text-blue-600 p-0" onClick={() => setStatusFilter(alert.status)}>
                  Filter to {alert.status.toLowerCase()}
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => loadDocuments()}>
              Refresh compliance view
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScanLine className="h-4 w-4 text-blue-600" />
              Owner activity
            </CardTitle>
            <CardDescription>Top contributors based on latest document sync.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            {ownerSnapshots.length === 0 && <p className="text-xs text-gray-500">Owner activity will appear once documents are synced.</p>}
            {ownerSnapshots.map((owner) => (
              <div key={owner.owner} className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{owner.owner}</span>
                <Badge variant="outline">{owner.count} doc{owner.count === 1 ? '' : 's'}</Badge>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsUploadDialogOpen(true)}>
                <UploadCloud className="h-4 w-4 mr-2" /> Upload file
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Layers className="h-4 w-4 mr-2" /> Manage templates
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Workflow insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            {workflowInsights.length === 0 && <p className="text-xs text-gray-500">No outstanding workflow actions detected.</p>}
            {workflowInsights.map((insight) => (
              <div key={insight.label} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{insight.label}</p>
                  <span className={`text-xs ${insight.tone}`}>{insight.value}</span>
                </div>
                <p className="text-xs text-gray-500">{insight.action}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => loadDocuments()}>
              Re-run insights
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedDoc)} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.doc}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.student} • {selectedDoc?.cohort} • {selectedDoc?.category}
            </DialogDescription>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-gray-200 h-56 flex items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-500">Preview not available in this build.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-600">
                <div>
                  <p className="text-gray-500">Requirement</p>
                  <p className="font-medium text-gray-900">{selectedDoc.requirement}</p>
                </div>
                <div>
                  <p className="text-gray-500">File details</p>
                  <p className="font-medium text-gray-900">{selectedDoc.fileType}</p>
                </div>
                <div>
                  <p className="text-gray-500">Owner</p>
                  <p className="font-medium text-gray-900">{selectedDoc.owner}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last activity</p>
                  <p className="font-medium text-gray-900">{selectedDoc.lastUpdated}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setActionType('approve')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve & archive
                </Button>
                <Button variant="outline" onClick={() => setActionType('request')}>
                  <MailQuestion className="h-4 w-4 mr-2" /> Request update
                </Button>
                <Button variant="destructive" onClick={() => setActionType('reject')}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionType)} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve document'}
              {actionType === 'request' && 'Request new upload'}
              {actionType === 'reject' && 'Reject document'}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc ? `${selectedDoc.doc} for ${selectedDoc.student}` : 'Select a document to proceed.'}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This is a placeholder modal for future workflows. In production we will capture comments, route approvals,
            and push notifications to guardians or staff.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button onClick={() => setActionType(null)}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DocumentUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}
export default StudentDocuments;
