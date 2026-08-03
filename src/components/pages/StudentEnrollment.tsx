import React, { useState, useEffect } from 'react'
import { Users, ClipboardList, Clock3, ArrowRight, MapPin, BookOpen, Upload, FileText, AlertCircle, CheckCircle, Mail } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
// import QRCode from 'react-qr-code'
import { FORM_URLS } from '../../config'

// API Application type — matches ApplicationDTO from the backend
interface ApiApplication {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  academicSession: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

const pipelineStages = [
  {
    stage: 'Application',
    description: 'Initial applications submitted.',
    apiStatus: 'pending',
  },
  {
    stage: 'Review',
    description: 'Admin checks documents, fees, and completeness.',
    apiStatus: 'reviewing',
  },
  {
    stage: 'Offer',
    description: 'Admission offers sent, awaiting acceptance.',
    apiStatus: 'approved',
  },
]

export function StudentEnrollment() {
  const downloadSampleCSV = () => {
    const csvContent = `First Name,Last Name,Email,Phone,Date of Birth,Class,Parent Name
John,Doe,john@example.com,+1234567890,2005-05-15,JSS 1,Jane Doe
Jane,Smith,jane@example.com,+1234567891,2006-03-20,JSS 2,Bob Smith`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_students.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const [batchUploadOpen, setBatchUploadOpen] = useState(false)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview' | 'import'>('upload')

  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSuccessfulState, setLastSuccessfulState] = useState<ApiApplication[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Fetch applications on mount
  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/tenant/applications')
      if (!response.ok) {
        throw new Error('Failed to fetch applications')
      }
      const data = await response.json()
      const apps = data.data || []
      setApplications(apps)
      setLastSuccessfulState(apps)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch applications'
      setError(errorMessage)
      // Retain last successfully loaded state
      setApplications(lastSuccessfulState)
    } finally {
      setLoading(false)
    }
  }

  const handleAdvanceStatus = async (applicationId: string, currentStatus: ApiApplication['status']) => {
    // Map current status to next status
    const statusProgression: Record<ApiApplication['status'], ApiApplication['status']> = {
      'pending': 'reviewing',
      'reviewing': 'approved',
      'approved': 'approved', // Already at final stage
      'rejected': 'rejected', // Cannot advance rejected
    }

    const nextStatus = statusProgression[currentStatus]
    if (nextStatus === currentStatus) {
      return // No progression possible
    }

    try {
      setUpdatingId(applicationId)
      const response = await fetch('/api/tenant/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicationId, status: nextStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update application status')
      }

      const data = await response.json()
      const updatedApp = data.data

      // Update local state
      setApplications(prev =>
        prev.map(app => (app.id === applicationId ? updatedApp : app))
      )
      setLastSuccessfulState(prev =>
        prev.map(app => (app.id === applicationId ? updatedApp : app))
      )
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update application'
      setError(errorMessage)
    } finally {
      setUpdatingId(null)
    }
  }

  // Compute analytics from fetched applications
  const totalApplications = applications.length
  const pipelineColumns = pipelineStages.map(stage => {
    const stageApplications = applications.filter(app => app.status === stage.apiStatus)
    return {
      ...stage,
      count: stageApplications.length,
      items: stageApplications,
    }
  })

  const pendingCount = applications.filter(a => a.status === 'pending').length
  const reviewingCount = applications.filter(a => a.status === 'reviewing').length
  const approvedCount = applications.filter(a => a.status === 'approved').length
  const rejectedCount = applications.filter(a => a.status === 'rejected').length
  const acceptanceRate = totalApplications > 0
    ? Math.round((approvedCount / totalApplications) * 100)
    : 0

  const analytics = [
    {
      label: 'Total applications',
      value: totalApplications.toString(),
      trend: `${pendingCount} pending`,
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: 'Acceptance rate',
      value: totalApplications > 0 ? `${acceptanceRate}%` : '—',
      trend: `${approvedCount} approved`,
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Rejected',
      value: rejectedCount.toString(),
      trend: `${reviewingCount} in review`,
      icon: <Clock3 className="h-4 w-4" />,
    },
  ]

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <p className="text-xs text-red-700 mt-1">Displaying last successfully loaded data</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchApplications}
            className="flex-shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-600 font-semibold">Admissions</p>
          <h1 className="text-2xl font-bold text-gray-900">Enrollment pipeline</h1>
          <p className="text-sm text-gray-600">Track inquiries through assessments until onboarding day.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <ClipboardList className="h-4 w-4 mr-2" />
            Intake checklist
          </Button>
          <Dialog open={batchUploadOpen} onOpenChange={setBatchUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Batch upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Batch Student Upload</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with student data to add multiple students at once.
                </DialogDescription>
              </DialogHeader>
              {uploadStep === 'upload' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Upload student data file
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose a CSV file containing student information
                    </p>
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Button variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Choose file
                      </Button>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const text = event.target?.result as string
                            const lines = text.split('\n').filter(l => l.trim())
                            if (lines.length < 2) {
                              alert('CSV file appears to be empty or has no data rows.')
                              return
                            }
                            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                            const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('parent'))
                            const emailIdx = headers.findIndex(h => h.includes('email'))
                            const classIdx = headers.findIndex(h => h.includes('class'))
                            const rows = lines.slice(1).map(line => {
                              const cols = line.split(',').map(c => c.trim())
                              return {
                                name: nameIdx >= 0 ? `${cols[nameIdx] || ''} ${cols[nameIdx + 1] || ''}`.trim() || 'Unknown' : 'Unknown',
                                email: emailIdx >= 0 ? cols[emailIdx] || '—' : '—',
                                class: classIdx >= 0 ? cols[classIdx] || '—' : '—',
                                status: 'Valid' as const,
                              }
                            })
                            setParsedData(rows)
                            setUploadStep('preview')
                          }
                          reader.readAsText(file)
                        }
                      }}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">CSV Format Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>First Name, Last Name, Email, Phone, Date of Birth, Class, Parent Name</li>
                      <li>Use comma (,) as delimiter</li>
                      <li>Include headers in the first row</li>
                    </ul>
                  </div>
                  <Button variant="outline" onClick={downloadSampleCSV}>
                    Download Sample CSV
                  </Button>
                </div>
              )}
              {uploadStep === 'preview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Data Preview</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadStep('upload')}
                    >
                      Upload different file
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.map((student, index) => (
                          <TableRow key={index}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>{student.class}</TableCell>
                            <TableCell>
                              <Badge variant={student.status === 'Valid' ? 'default' : 'destructive'}>
                                {student.status === 'Valid' ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {student.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setUploadStep('upload')}>
                      Back
                    </Button>
                    <Button onClick={() => setUploadStep('import')}>
                      Proceed to Import
                    </Button>
                  </div>
                </div>
              )}
              {uploadStep === 'import' && (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      Ready to Import
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {parsedData.length} students will be added to the system.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button variant="outline" onClick={() => setUploadStep('preview')}>
                        Back to Preview
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            const payloads = parsedData.map(d => ({
                              name: d.name,
                              class: d.class,
                              arm: '',
                              gender: 'Male',
                              status: 'Active',
                              guardian: '',
                              phone: '',
                              guardianEmail: d.email !== '—' ? d.email : undefined,
                            }))
                            const { createStudents } = await import('../../lib/studentsClient')
                            await createStudents(payloads)
                            setBatchUploadOpen(false)
                            setUploadStep('upload')
                            setParsedData([])
                          } catch (err) {
                            console.error('Import failed:', err)
                            alert('Failed to import students. Please try again.')
                          }
                        }}
                      >
                        Import Students
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={() => window.open('/apply', '_blank')}>
            <Users className="h-4 w-4 mr-2" />
            New application
          </Button>
          <Button onClick={() => window.open('/inquiry', '_blank')}>
            <Mail className="h-4 w-4 mr-2" />
            Inquiry Form
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {analytics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                {metric.icon}
                <span>{metric.label}</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{metric.value}</p>
              <p className="text-xs text-amber-600 mt-1">{metric.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-slate-50">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2].map(j => (
                  <div key={j} className="h-24 bg-gray-200 rounded animate-pulse" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {pipelineColumns.map((column) => (
            <Card key={column.stage} className="bg-slate-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{column.stage}</CardTitle>
                    <p className="text-xs text-gray-500">{column.description}</p>
                  </div>
                  <Badge className="bg-white text-gray-900">{column.count}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.items.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No applications</p>
                ) : (
                  column.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
                      <p className="text-sm font-semibold text-gray-900">{item.studentName}</p>
                      <p className="text-xs text-gray-500">{item.classApplying}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {item.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleAdvanceStatus(item.id, item.status)}
                          disabled={updatingId === item.id || item.status === 'approved' || item.status === 'rejected'}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button variant="ghost" className="w-full text-red-600">
                  View all in {column.stage}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Public Application Form</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">Share this link for full enrollment applications:</p>
            <p className="font-mono bg-gray-100 p-2 rounded text-sm break-all">{FORM_URLS.application}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(FORM_URLS.application)}>Copy Link</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Public Inquiry Form</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">Share this link for initial interest inquiries:</p>
            <p className="font-mono bg-gray-100 p-2 rounded text-sm break-all">{FORM_URLS.inquiry}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(FORM_URLS.inquiry)}>Copy Link</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-red-600" />
              Feeder schools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-center py-6 text-center">
              <div>
                <MapPin className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Feeder school analytics not yet available.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-orange-600" />
              Orientation checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-center py-6 text-center">
              <div>
                <BookOpen className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Orientation checklist will appear here once configured.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default StudentEnrollment;
