import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Upload,
  X,
  FileText,
  Image,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Download,
  Trash2,
} from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Progress } from '../ui/progress'
import { Textarea } from '../ui/textarea'
import { DocumentPreview } from './DocumentPreview'
import { DocumentClassifier, type DocumentClassification } from '../../lib/documentClassifier'
import { tenantApiFetch } from '../../lib/tenantApi'

const detectedTypeToCategory: Record<string, string> = {
  academic: 'Academic',
  medical: 'Medical',
  financial: 'Finance',
  conduct: 'Conduct',
  administrative: 'Administrative',
  other: 'Other',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  preview?: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  category?: string
  studentId?: string
  notes?: string
  errors?: string[]
  classification?: DocumentClassification
  extractedText?: string
}

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete?: (files: UploadedFile[]) => void
  maxFiles?: number
  allowedTypes?: string[]
  maxSizeMB?: number
}

const documentCategories = [
  'Academic',
  'Medical',
  'Finance',
  'Conduct',
  'Administrative',
  'Other',
]

interface StudentOption { id: string; name: string; class: string }

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  maxFiles = 10,
  allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  maxSizeMB = 10,
}: DocumentUploadDialogProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStep, setUploadStep] = useState<'upload' | 'classify' | 'process'>('upload')
  const [globalCategory, setGlobalCategory] = useState<string>(documentCategories[0])
  const [globalNotes, setGlobalNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [students, setStudents] = useState<StudentOption[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
            fetch('/api/tenant/students?limit=200', { headers })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(json => {
          const rows: StudentOption[] = (json.data || []).map((s: any) => ({
            id: String(s.id),
            name: s.name || s.full_name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
            class: s.class_name || s.class || s.grade || '',
          }))
          setStudents(rows)
        })
        .catch(err => {
          // QUAL-02: previously silent — log so student-option load failures are diagnosable
          console.warn('Failed to fetch student options for upload dialog:', err);
        })
    } catch (err) {
      // QUAL-02: previously silent — log so auth-context parse failures are diagnosable
      console.warn('Failed to read auth context for upload dialog:', err);
    }
  }, [open])

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // For text files
      if (file.type === 'text/plain') {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve(e.target?.result as string || '')
        }
        reader.onerror = () => reject(new Error('Failed to read text file'))
        reader.readAsText(file)
        return
      }

      // For PDFs (basic text extraction - in production, use pdf-parse library)
      if (file.type === 'application/pdf') {
        // For now, extract from filename and basic metadata
        // In production, integrate with pdf-parse or similar
        const fileName = file.name.toLowerCase()
        let extractedText = fileName

        // Add some common PDF keywords based on filename
        if (fileName.includes('transcript') || fileName.includes('result')) {
          extractedText += ' academic transcript grade score assessment examination result'
        }
        if (fileName.includes('medical') || fileName.includes('health')) {
          extractedText += ' medical clearance health record immunization vaccination doctor clinic'
        }
        if (fileName.includes('fee') || fileName.includes('payment')) {
          extractedText += ' fee payment receipt invoice tuition financial'
        }

        resolve(extractedText)
        return
      }

      // For images (OCR simulation - in production, use Tesseract.js)
      if (file.type.startsWith('image/')) {
        // For now, just return filename - in production implement OCR
        resolve(file.name.toLowerCase())
        return
      }

      // For other files, return filename as basic text
      resolve(file.name.toLowerCase())
    })
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />
    return <FileText className="h-8 w-8 text-gray-500" />
  }

  const validateFile = (file: File): string[] => {
    const errors: string[] = []

    if (file.size > maxSizeMB * 1024 * 1024) {
      errors.push(`File size exceeds ${maxSizeMB}MB limit`)
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(fileExtension)) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    return errors
  }

  const processFile = async (file: File): Promise<UploadedFile> => {
    const errors = validateFile(file)

    const uploadedFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: errors.length > 0 ? 'error' : 'processing',
      progress: 0,
      errors,
    }

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        uploadedFile.preview = e.target?.result as string
        setFiles(prev => prev.map(f => f.id === uploadedFile.id ? uploadedFile : f))
      }
      reader.readAsDataURL(file)
    }

    // Extract text and classify document
    if (errors.length === 0) {
      try {
        const extractedText = await extractTextFromFile(file)
        uploadedFile.extractedText = extractedText

        // Classify the document (keyword heuristic — suggests a category)
        const classification = await DocumentClassifier.classifyDocument(
          file.name,
          file.type,
          extractedText,
          file.size
        )
        uploadedFile.classification = classification

        // Auto-suggest category from the detected document type
        uploadedFile.category = detectedTypeToCategory[classification.metadata?.detectedType] || documentCategories[0]

        // Update status to completed
        uploadedFile.status = 'completed'
        uploadedFile.progress = 100

      } catch (error) {
        console.error('Classification error:', error)
        uploadedFile.status = 'error'
        uploadedFile.category = documentCategories[0]
        uploadedFile.errors = [...(uploadedFile.errors || []), 'Failed to classify document']
      }
    }

    return uploadedFile
  }

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      if (files.length + newFiles.length >= maxFiles) break

      const processedFile = await processFile(file)
      newFiles.push(processedFile)
    }

    setFiles(prev => [...prev, ...newFiles])

    // Auto-advance to classification if files were added
    if (newFiles.length > 0 && uploadStep === 'upload') {
      setTimeout(() => setUploadStep('classify'), 500)
    }
  }, [files.length, maxFiles, uploadStep])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const updateFileCategory = (fileId: string, category: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, category } : f
    ))
  }

  const updateFileStudent = (fileId: string, studentId: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, studentId } : f
    ))
  }

  const updateFileNotes = (fileId: string, notes: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, notes } : f
    ))
  }

  const applyGlobalSettings = () => {
    setFiles(prev => prev.map(f => ({
      ...f,
      category: globalCategory || f.category,
      notes: globalNotes || f.notes,
    })))
  }

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.slice(result.indexOf(',') + 1))
      }
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
      reader.readAsDataURL(file)
    })

  const startUpload = async () => {
    setIsUploading(true)
    setUploadStep('process')

    for (const file of files) {
      if (file.status === 'error') continue

      file.status = 'uploading'
      file.progress = 30
      setFiles(prev => [...prev])

      try {
        const fileData = await readFileAsBase64(file.file)
        const student = file.studentId ? students.find(s => s.id === file.studentId) : undefined

        const response = await tenantApiFetch('/api/student-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docName: file.name,
            studentId: file.studentId || undefined,
            studentName: student?.name || '',
            cohort: student?.class || '',
            category: file.category || 'Other',
            fileType: file.name.split('.').pop()?.toLowerCase() || '',
            mimeType: file.type || undefined,
            fileSize: file.size,
            fileData,
            notes: file.notes || undefined,
          }),
        })

        if (!response.ok) {
          const json = await response.json().catch(() => ({}))
          throw new Error(json.error || 'Upload failed')
        }

        file.status = 'completed'
        file.progress = 100
      } catch (err) {
        file.status = 'error'
        file.errors = [...(file.errors || []), err instanceof Error ? err.message : 'Upload failed']
      }
      setFiles(prev => [...prev])
    }

    setIsUploading(false)

    // Call completion callback
    if (onUploadComplete) {
      onUploadComplete(files)
    }

    // Auto-close only when every upload succeeded — on failure, stay open so
    // the user can see the per-file errors instead of them flashing by.
    if (files.length > 0 && files.every(f => f.status === 'completed')) {
      setTimeout(() => {
        onOpenChange(false)
        resetDialog()
      }, 2000)
    }
  }

  const resetDialog = () => {
    setFiles([])
    setUploadStep('upload')
    setGlobalCategory('')
    setGlobalNotes('')
    setIsUploading(false)
  }

  const handlePreviewFile = (file: UploadedFile) => {
    setPreviewFile(file)
    setShowPreview(true)
  }

  const handleClose = () => {
    if (isUploading) return // Prevent closing during upload
    onOpenChange(false)
    resetDialog()
  }

  const validFilesCount = files.filter(f => f.status !== 'error').length
  const canProceed = validFilesCount > 0 && !isUploading

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </DialogTitle>
          <DialogDescription>
            Upload multiple documents with drag-and-drop. Supported formats: {allowedTypes.join(', ')}
            (Max {maxSizeMB}MB per file, {maxFiles} files max)
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-4">
            {['upload', 'classify', 'process'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  uploadStep === step ? 'bg-blue-600 text-white' :
                  ['upload', 'classify', 'process'].indexOf(uploadStep) > index ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`w-12 h-px mx-2 ${
                    ['upload', 'classify', 'process'].indexOf(uploadStep) > index ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upload Step */}
        {uploadStep === 'upload' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`mx-auto h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
              <div className="mt-4">
                <p className="text-lg font-medium text-gray-900">
                  {isDragOver ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={allowedTypes.join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3 max-h-48 overflow-y-auto">
                <h4 className="font-medium text-gray-900">Selected Files ({files.length})</h4>
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'error' && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Classification Step */}
        {uploadStep === 'classify' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-6">
            {/* Global Settings */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Apply to All Files</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-blue-800">Category</Label>
                  <Select value={globalCategory} onValueChange={setGlobalCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={applyGlobalSettings}>
                    Apply to All
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-sm text-blue-800">Notes</Label>
                <Textarea
                  placeholder="Add notes for all files..."
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Individual File Classification */}
            <div className="flex-1 overflow-y-auto space-y-4">
              <h4 className="font-medium text-gray-900">File Details ({validFilesCount} valid files)</h4>
              {files.filter(f => f.status !== 'error').map((file) => (
                <div key={file.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        {file.classification && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              AI: {file.classification.category}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {Math.round(file.classification.confidence * 100)}% confidence
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {file.preview && (
                      <Button variant="ghost" size="sm" onClick={() => handlePreviewFile(file)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Category</Label>
                      <Select
                        value={file.category || documentCategories[0]}
                        onValueChange={(value) => updateFileCategory(file.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {documentCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Student (Optional)</Label>
                      <Select
                        value={file.studentId || ''}
                        onValueChange={(value) => updateFileStudent(file.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(student => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}{student.class ? ` - ${student.class}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">Notes</Label>
                    <Textarea
                      placeholder="Add notes for this file..."
                      value={file.notes || ''}
                      onChange={(e) => updateFileNotes(file.id, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Step */}
        {uploadStep === 'process' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Processing Files</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Uploading and validating {validFilesCount} file{validFilesCount !== 1 ? 's' : ''}...
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-12 w-12 text-green-600" />
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Upload Complete</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {validFilesCount} file{validFilesCount !== 1 ? 's' : ''} processed successfully
                  </p>
                </div>
              </>
            )}

            {/* File Progress */}
            <div className="w-full max-w-md space-y-3">
              {files.map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{file.name}</span>
                    <Badge variant={file.status === 'completed' ? 'secondary' : 'outline'}>
                      {file.status}
                    </Badge>
                  </div>
                  <Progress value={file.progress} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {validFilesCount} of {files.length} files valid
          </div>
          <div className="flex gap-2">
            {uploadStep !== 'upload' && !isUploading && (
              <Button
                variant="outline"
                onClick={() => setUploadStep(uploadStep === 'classify' ? 'upload' : 'classify')}
              >
                Back
              </Button>
            )}
            {uploadStep === 'upload' && files.length > 0 && (
              <Button onClick={() => setUploadStep('classify')}>
                Next: Classify Files
              </Button>
            )}
            {uploadStep === 'classify' && canProceed && (
              <Button onClick={startUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Upload
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <DocumentPreview
        file={previewFile?.file || null}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={previewFile?.name}
        metadata={{
          category: previewFile?.category,
          studentName: previewFile?.studentId ? students.find(s => s.id === previewFile.studentId)?.name : undefined,
          validationStatus: previewFile?.errors && previewFile.errors.length > 0 ? 'error' : 'valid',
        }}
      />
    </Dialog>
  )
}

export default DocumentUploadDialog
