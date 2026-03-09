import React, { useState, useEffect } from 'react'
import { Users, ClipboardList, Clock3, ArrowRight, MapPin, BookOpen, Upload, FileText, AlertCircle, CheckCircle, Share, Mail } from 'lucide-react'

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
import { Lead, Application } from '../types'
// import QRCode from 'react-qr-code'
import { FORM_URLS } from '../../config'

const pipeline = [
  {
    stage: 'Inquiry',
    description: 'Families showing interest via forms, events, calls.',
    count: 23,
    items: [
      { name: 'Grace Obi', school: 'Primary 6', source: 'Open day', status: 'New' },
      { name: 'Yakubu Idris', school: 'Primary 5', source: 'Referral', status: 'Contacted' },
      // leads.map will be computed dynamically inside the component
    ],
  },
  {
    stage: 'Application',
    description: 'Official admission forms submitted online.',
    count: 18,
    items: [
      { name: 'Farida Ahmed', school: 'Primary 6', source: 'Website form', status: 'Submitted' },
      { name: 'Michelle Nweke', school: 'Primary 6', source: 'Parent portal', status: 'Docs pending' },
      // applications.map will be computed dynamically inside the component
    ],
  },
  {
    stage: 'Review',
    description: 'Admin checks documents, fees, and completeness.',
    count: 14,
    items: [
      { name: 'Samuel Aluko', school: 'Primary 6', source: 'Portal', status: 'Under review' },
      { name: 'Ijeoma Uzo', school: 'Primary 5', source: 'Referral', status: 'Approved' },
    ],
  },
  {
    stage: 'Assessment',
    description: 'Entrance exams, interviews, medical checks.',
    count: 9,
    items: [
      { name: 'Chidera Igwe', school: 'Primary 6', source: 'Portal', status: 'Exam scheduled' },
      { name: 'Opeoluwa Adeyemi', school: 'Primary 6', source: 'Agent', status: 'Interview set' },
    ],
  },
  {
    stage: 'Offer',
    description: 'Admission offers sent, awaiting acceptance.',
    count: 6,
    items: [
      { name: 'Adaeze Nwosu', school: 'Primary 6', source: 'Portal', status: 'Offer sent' },
      { name: 'Kemi Adebayo', school: 'Primary 6', source: 'Agent', status: 'Accepted' },
    ],
  },
  {
    stage: 'Enrollment',
    description: 'Final onboarding: fees, documents, orientation.',
    count: 4,
    items: [
      { name: 'Tunde Bakare', school: 'Primary 6', source: 'Portal', status: 'Fees paid' },
      { name: 'Ngozi Eze', school: 'Primary 6', source: 'Agent', status: 'Orientation set' },
    ],
  },
]

const analytics = [
  {
    label: 'Average conversion time',
    value: '18 days',
    trend: '+2d slower',
    icon: <Clock3 className="h-4 w-4" />,
  },
  {
    label: 'Acceptance rate',
    value: '64%',
    trend: '+6 pts',
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: 'Scholarship requests',
    value: '12',
    trend: '3 pending docs',
    icon: <ClipboardList className="h-4 w-4" />,
  },
]

export function StudentEnrollment() {
  const [batchUploadOpen, setBatchUploadOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview' | 'import'>('upload')
  const [qrOpen, setQrOpen] = useState(false)

  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])

  useEffect(() => {
    const loadedLeads = JSON.parse(localStorage.getItem('leads') || '[]').map((l: any) => ({ ...l, createdAt: new Date(l.createdAt) }))
    const loadedApplications = JSON.parse(localStorage.getItem('applications') || '[]').map((a: any) => ({ ...a, submittedAt: new Date(a.submittedAt), studentInfo: { ...a.studentInfo, dateOfBirth: new Date(a.studentInfo.dateOfBirth) } }))
    setLeads(loadedLeads)
    setApplications(loadedApplications)
  }, [])

  // Compute dynamic pipeline data
  const dynamicPipeline = pipeline.map(stage => {
    if (stage.stage === 'Inquiry') {
      return {
        ...stage,
        items: [
          ...stage.items,
          ...leads.map(l => ({ name: l.studentName, school: l.classInterested, source: l.source, status: 'New' as const }))
        ]
      }
    }
    if (stage.stage === 'Application') {
      return {
        ...stage,
        items: [
          ...stage.items,
          ...applications.map(a => ({ name: a.studentInfo.fullName, school: a.studentInfo.classApplying, source: 'Online' as const, status: 'Submitted' as const }))
        ]
      }
    }
    return stage
  })

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Admissions</p>
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
                          setUploadedFile(file)
                          // Mock parsing - in real app, parse CSV
                          setParsedData([
                            { name: 'John Doe', email: 'john@example.com', class: 'JSS 1A', status: 'Valid' },
                            { name: 'Jane Smith', email: 'jane@example.com', class: 'JSS 1B', status: 'Valid' },
                          ])
                          setUploadStep('preview')
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
                        onClick={() => {
                          // Mock import success
                          setBatchUploadOpen(false)
                          setUploadStep('upload')
                          setUploadedFile(null)
                          setParsedData([])
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
          {/* <Button variant="outline" onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Share Application Form
          </Button> */}
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

      <div className="grid gap-4 lg:grid-cols-6">
        {dynamicPipeline.map((column) => (
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
              {column.items.map((item) => (
                <div key={item.name} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.school} • {item.source}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {item.status}
                    </Badge>
                    <Button size="icon" variant="ghost">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-blue-600">
                View all in {column.stage}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <MapPin className="h-4 w-4 text-blue-600" />
              Feeder schools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Heritage Junior School</span>
              <span className="font-semibold text-gray-900">9 applicants</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unity Primary</span>
              <span className="font-semibold text-gray-900">6 applicants</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Redeemer Montessori</span>
              <span className="font-semibold text-gray-900">5 applicants</span>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              View feeder analytics
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-purple-600" />
              Orientation checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Medical screening</span>
              <Badge variant="outline">7/12 complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Uniform measurements</span>
              <Badge variant="outline">5/12 complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Parent onboarding call</span>
              <Badge variant="outline">4/12 booked</Badge>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600">
              Manage tasks
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Application Form</DialogTitle>
            <DialogDescription>
              Parents can scan this QR code or use the link to access the admission form.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-4">
            <QRCode value={window.location.origin + '/apply'} className="mx-auto" />
            <div>
              <p className="text-sm text-gray-600 mb-2">Application URL:</p>
              <p className="text-xs bg-gray-100 p-2 rounded break-all">{window.location.origin + '/apply'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog> */}
    </div>
  )
}
export default StudentEnrollment;
