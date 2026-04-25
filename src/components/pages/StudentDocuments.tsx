import React, { useEffect, useMemo, useState } from 'react'
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
import { fetchStudentDocuments, StudentDocument } from '../../lib/studentDocumentsClient'

const summaryStats = [
  {
    label: 'Checklist completion',
    value: '74%',
    detail: '612 / 828 docs cleared',
    trend: '+8 pts vs last term',
    tone: 'text-emerald-600',
  },
  {
    label: 'Pending guardian uploads',
    value: '146',
    detail: '48 expiring within 7 days',
    trend: '32 reminders sent today',
    tone: 'text-amber-600',
  },
  {
    label: 'Compliance escalations',
    value: '12',
    detail: '5 flagged for academics',
    trend: '3 awaiting principal review',
    tone: 'text-rose-600',
  },
  {
    label: 'Automations triggered',
    value: '89',
    detail: 'Reminders + SIS syncs',
    trend: '4 failures to retry',
    tone: 'text-blue-600',
  },
]

const checklistColumns = [
  {
    title: 'Enrollment essentials',
    description: 'Birth cert, transfer letter, immunization.',
    progress: '82% cleared',
    items: [
      { title: 'Birth certificate', owner: 'Admissions', status: 'Complete' },
      { title: 'Transfer letter', owner: 'Registrar', status: 'Missing' },
      { title: 'Immunization card', owner: 'Health office', status: 'Pending review' },
    ],
  },
  {
    title: 'Academic + CA',
    description: 'Previous results, CA templates, electives.',
    progress: '68% cleared',
    items: [
      { title: 'JSS 2 transcript', owner: 'Academics', status: 'Pending review' },
      { title: 'Elective selection form', owner: 'Counselor', status: 'Complete' },
      { title: 'CA moderation sheet', owner: 'HOD Science', status: 'In progress' },
    ],
  },
  {
    title: 'Wellbeing & conduct',
    description: 'Medical, boarding, behaviour contracts.',
    progress: '59% cleared',
    items: [
      { title: 'Medical clearance', owner: 'Nurse Admin', status: 'Expiring soon' },
      { title: 'Boarding consent', owner: 'Parent', status: 'Awaiting upload' },
      { title: 'Behavior contract', owner: 'Wellness', status: 'Complete' },
    ],
  },
]

const mockDocuments: StudentDocument[] = [
  {
    student: 'Tolulope Akin',
    cohort: 'SS 1B',
    category: 'Medical',
    doc: 'Sickle cell screening',
    owner: 'Health office',
    status: 'Pending review',
    aging: '2 days',
    fileType: 'PDF (1.2MB)',
    lastUpdated: 'Uploaded 2h ago by Nurse Admin',
    requirement: 'Annual sickle cell + genotype screening for boarding students',
  },
  {
    student: 'Chiamaka Obi',
    cohort: 'JSS 3C',
    category: 'Academic',
    doc: 'Exam waiver approval',
    owner: 'Academics',
    status: 'Escalated',
    aging: '5 days',
    fileType: 'Docx (320kb)',
    lastUpdated: 'Escalated by HOD Science yesterday',
    requirement: 'Approval required before CA retake is scheduled',
  },
  {
    student: 'Yusuf Bala',
    cohort: 'SS 2A',
    category: 'Finance',
    doc: 'Scholarship affidavit',
    owner: 'Bursary',
    status: 'Awaiting upload',
    aging: '1 day',
    fileType: 'Not uploaded',
    lastUpdated: 'Reminder sent to guardian this morning',
    requirement: 'Signed affidavit mandates before fee discount applies',
  },
  {
    student: 'Maryam Ali',
    cohort: 'JSS 2B',
    category: 'Conduct',
    doc: 'Disciplinary memo',
    owner: 'Student affairs',
    status: 'Pending review',
    aging: '3 days',
    fileType: 'PDF (560kb)',
    lastUpdated: 'Uploaded by counselor 3 days ago',
    requirement: 'Memo required before demotion or contract renewal',
  },
]

const complianceAlerts = [
  { label: 'Medical clearance expiring', value: '28 students', action: 'Send reminders', tone: 'text-amber-600' },
  { label: 'Incomplete boarding packets', value: '9 students', action: 'Escalate to house parents', tone: 'text-rose-600' },
  { label: 'Parent signatures missing', value: '41 docs', action: 'Notify guardians', tone: 'text-blue-600' },
]

const automationRules = [
  {
    title: 'Guardian reminder (48h)',
    detail: 'Auto-email guardians for pending uploads 48h before deadline.',
    status: 'Active',
  },
  {
    title: 'SIS sync nightly',
    detail: 'Push approved documents to SIS + exam office at midnight.',
    status: 'Active',
  },
  {
    title: 'Escalate expiring med docs',
    detail: 'Create task for wellness lead when expiry < 14 days.',
    status: 'Paused',
  },
]

export function StudentDocuments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [selectedDoc, setSelectedDoc] = useState<StudentDocument | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'request' | 'reject' | null>(null)
  const [documents, setDocuments] = useState<StudentDocument[]>(mockDocuments)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDocuments() {
      setIsLoading(true)
      try {
        const data = await fetchStudentDocuments(controller.signal)
        setDocuments(data.length ? data : mockDocuments)
        setError(null)
      } catch (err) {
        console.warn('Using mock student documents fallback', err)
        setError(err instanceof Error ? err.message : 'Unable to load documents')
        setDocuments(mockDocuments)
      } finally {
        setIsLoading(false)
      }
    }

    loadDocuments()
    return () => controller.abort()
  }, [])

  const handleUploadComplete = (uploadedFiles: any[]) => {
    console.log('Upload completed:', uploadedFiles)
    // Here you would typically update the documents list or trigger a refresh
    // For now, we'll just log the completion
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Student document vault</h1>
          <p className="text-sm text-gray-600">Track every checklist, approvals, and expiring documents for each cohort.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
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
                {['Academic', 'Medical', 'Finance', 'Conduct'].map((option) => (
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
                {['Pending review', 'Escalated', 'Awaiting upload'].map((option) => (
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
        {checklistColumns.map((column) => (
          <Card key={column.title} className="bg-slate-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{column.title}</CardTitle>
                  <CardDescription>{column.description}</CardDescription>
                </div>
                <Badge variant="secondary">{column.progress}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.items.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">Owner: {item.owner}</p>
                  <Badge
                    variant={item.status === 'Complete' ? 'secondary' : 'outline'}
                    className="mt-2 text-xs"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-blue-600">
                Open checklist
              </Button>
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
              <p className="text-xs text-rose-600">
                Unable to fetch live data ({error}). Displaying cached mock dataset.
              </p>
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
                      <Badge variant={item.status === 'Escalated' ? 'destructive' : 'secondary'}>{item.status}</Badge>
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
            {complianceAlerts.map((alert) => (
              <div key={alert.label} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{alert.label}</p>
                <p className={`text-xs ${alert.tone}`}>{alert.value}</p>
                <Button variant="ghost" size="sm" className="text-blue-600 p-0">
                  {alert.action}
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              View compliance log
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScanLine className="h-4 w-4 text-blue-600" />
              Intake & uploads
            </CardTitle>
            <CardDescription>Recent ingest sessions and guardian submissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Batch scan - Boarding house</span>
              <Badge variant="outline">32 docs</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Guardian portal uploads</span>
              <Badge variant="outline">54 docs</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>API import - SIS</span>
              <Badge variant="outline">18 docs</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
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
              Automation rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            {automationRules.map((rule) => (
              <div key={rule.title} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{rule.status}</span>
                  <Badge variant="outline">Workflow</Badge>
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">{rule.title}</p>
                <p>{rule.detail}</p>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-blue-600">
              Manage automations
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
                <p className="text-sm text-gray-500">Preview not available in mock mode.</p>
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
