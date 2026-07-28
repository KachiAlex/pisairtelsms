import React, { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Loader2,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationError {
  row: number
  field: string
  message: string
}

interface UploadResult {
  totalRecords: number
  validRecords: number
  invalidRecords: number
  inserted: number
  updated: number
  skipped: number
  failed: number
  errors: ValidationError[]
  message: string
}

interface PreviewData {
  totalRecords: number
  validRecords: number
  invalidRecords: number
  errors: ValidationError[]
}

type UploadStatus = 'idle' | 'preview' | 'uploading' | 'success' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTenantHeaders(): Record<string, string> {
  try {
    const auth = localStorage.getItem('auth')
    const tenantId = auth ? JSON.parse(auth).tenantId || 'default-tenant' : 'default-tenant'
    return { 'x-tenant-id': tenantId, 'Content-Type': 'application/json' }
  } catch {
    return { 'x-tenant-id': 'default-tenant', 'Content-Type': 'application/json' }
  }
}

function downloadTemplate() {
  const headers = ['studentId', 'class', 'date', 'status', 'academicSession', 'term', 'absenceReason']
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()
  const sampleRow = ['STU001', 'JSS 1', today, 'present', `${currentYear}/${currentYear + 1}`, '1', '']

  const csv = [headers.join(','), sampleRow.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'attendance-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttendanceBatchUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvContent, setCsvContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set())

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setFileName(file.name)
    setError(null)
    setStatus('idle')
    setPreviewData(null)
    setUploadResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(file)
  }, [])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(event)
    }
  }, [handleFileSelect])

  // Preview CSV
  const handlePreview = useCallback(async () => {
    if (!csvContent) {
      setError('Please select a CSV file first')
      return
    }

    setStatus('preview')
    setError(null)

    try {
      const response = await fetch('/api/tenant/attendance/batch-upload?preview=true', {
        method: 'POST',
        headers: getTenantHeaders(),
        body: csvContent,
      })

      const json = await response.json()

      if (!response.ok) {
        setError(json.error || 'Failed to preview CSV')
        setStatus('error')
        return
      }

      setPreviewData({
        totalRecords: json.data.totalRecords,
        validRecords: json.data.validRecords,
        invalidRecords: json.data.invalidRecords,
        errors: json.data.errors || [],
      })
      setStatus('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview CSV')
      setStatus('error')
    }
  }, [csvContent])

  // Upload CSV
  const handleUpload = useCallback(async () => {
    if (!csvContent) {
      setError('Please select a CSV file first')
      return
    }

    setStatus('uploading')
    setError(null)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/tenant/attendance/batch-upload', {
        method: 'POST',
        headers: getTenantHeaders(),
        body: csvContent,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const json = await response.json()

      if (!response.ok) {
        setError(json.error || 'Failed to upload CSV')
        setStatus('error')
        return
      }

      setUploadResult(json.data)
      setStatus('success')
      setCsvContent('')
      setFileName('')
      setPreviewData(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV')
      setStatus('error')
    } finally {
      setUploadProgress(0)
    }
  }, [csvContent])

  // Reset form
  const handleReset = useCallback(() => {
    setCsvContent('')
    setFileName('')
    setStatus('idle')
    setPreviewData(null)
    setUploadResult(null)
    setError(null)
    setUploadProgress(0)
    setShowErrorDetails(false)
    setExpandedErrors(new Set())
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Toggle error details
  const toggleErrorDetails = useCallback((index: number) => {
    const newExpanded = new Set(expandedErrors)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedErrors(newExpanded)
  }, [expandedErrors])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batch Upload Attendance</h1>
        <p className="text-gray-600 mt-2">Upload attendance records in bulk using a CSV file</p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Select a CSV file with attendance records. Download the template to see the required format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Need a template?</p>
                <p className="text-sm text-blue-700">Download the CSV template to see the required format</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          {status === 'idle' && !csvContent && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Drag and drop your CSV file here</p>
              <p className="text-sm text-gray-600 mt-1">or click to select a file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* File Selected */}
          {csvContent && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{fileName}</p>
                    <p className="text-sm text-gray-600">{csvContent.length} bytes</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={status === 'uploading'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Preview Data */}
          {previewData && status === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{previewData.totalRecords}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Valid Records</p>
                      <p className="text-2xl font-bold text-emerald-600">{previewData.validRecords}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Invalid Records</p>
                      <p className="text-2xl font-bold text-rose-600">{previewData.invalidRecords}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Validation Errors */}
              {previewData.errors.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {showErrorDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Show Validation Errors ({previewData.errors.length})
                  </button>

                  {showErrorDetails && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.errors.slice(0, 20).map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{err.row}</TableCell>
                              <TableCell>{err.field}</TableCell>
                              <TableCell className="text-red-600 text-sm">{err.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {previewData.errors.length > 20 && (
                        <div className="p-3 bg-gray-50 text-sm text-gray-600 border-t">
                          Showing 20 of {previewData.errors.length} errors
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && status === 'success' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-900">Upload Successful</p>
                  <p className="text-sm text-emerald-700 mt-1">{uploadResult.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Inserted</p>
                      <p className="text-2xl font-bold text-emerald-600">{uploadResult.inserted}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Updated</p>
                      <p className="text-2xl font-bold text-blue-600">{uploadResult.updated}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Skipped</p>
                      <p className="text-2xl font-bold text-amber-600">{uploadResult.skipped}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-rose-600">{uploadResult.failed}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Upload Errors */}
              {uploadResult.errors.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {showErrorDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Show Upload Errors ({uploadResult.errors.length})
                  </button>

                  {showErrorDetails && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadResult.errors.slice(0, 20).map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{err.row}</TableCell>
                              <TableCell>{err.field}</TableCell>
                              <TableCell className="text-red-600 text-sm">{err.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {uploadResult.errors.length > 20 && (
                        <div className="p-3 bg-gray-50 text-sm text-gray-600 border-t">
                          Showing 20 of {uploadResult.errors.length} errors
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {status === 'uploading' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-gray-900">Uploading...</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">{uploadProgress}% complete</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            {!csvContent && status === 'idle' && (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            )}

            {csvContent && status === 'idle' && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </>
            )}

            {status === 'preview' && previewData && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={previewData.validRecords === 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {previewData.validRecords} Records
                </Button>
              </>
            )}

            {status === 'success' && (
              <Button onClick={handleReset}>
                Upload Another File
              </Button>
            )}

            {status === 'error' && csvContent && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">CSV Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-gray-700">
            <span className="font-medium">Required columns:</span> studentId, class, date, status, academicSession, term
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Date format:</span> YYYY-MM-DD (e.g., 2024-05-04)
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Status values:</span> present, absent, or late
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Academic session:</span> YYYY/YYYY format (e.g., 2024/2025)
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Optional column:</span> absenceReason (for absence records)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
