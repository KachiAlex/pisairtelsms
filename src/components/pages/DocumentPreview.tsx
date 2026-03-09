import React, { useState, useEffect, useRef } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'

interface DocumentPreviewProps {
  file: File | null
  isOpen: boolean
  onClose: () => void
  onDownload?: () => void
  title?: string
  metadata?: {
    category?: string
    uploadedBy?: string
    uploadDate?: string
    studentName?: string
    validationStatus?: 'valid' | 'warning' | 'error'
  }
}

export function DocumentPreview({
  file,
  isOpen,
  onClose,
  onDownload,
  title,
  metadata
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (file && isOpen) {
      loadPreview()
    } else {
      setPreviewUrl(null)
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file, isOpen])

  const loadPreview = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Create object URL for preview
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Simulate page count for PDFs (in production, use pdf library)
      if (file.type === 'application/pdf') {
        setTotalPages(Math.max(1, Math.floor(file.size / 100000))) // Rough estimate
      } else {
        setTotalPages(1)
      }

      setCurrentPage(1)
    } catch (err) {
      console.error('Preview load error:', err)
      setError('Failed to load document preview')
    } finally {
      setIsLoading(false)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25))
  }

  const handleZoomReset = () => {
    setZoom(100)
    setRotation(0)
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading preview...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-2">Preview not available</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      )
    }

    if (!file || !previewUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">No document selected</p>
          </div>
        </div>
      )
    }

    // Image preview
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          />
        </div>
      )
    }

    // PDF preview (simulated)
    if (file.type === 'application/pdf') {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-2">{file.name}</p>
            <p className="text-xs text-gray-600 mb-4">
              PDF Document • {file.size} bytes
            </p>
            <div className="bg-gray-100 rounded-lg p-4 max-w-md">
              <p className="text-sm text-gray-700">
                PDF preview requires additional libraries. In production, this would show the actual PDF content with zoom and navigation.
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Text file preview
    if (file.type === 'text/plain') {
      return (
        <div className="h-full p-4">
          <div
            ref={contentRef}
            className="bg-gray-50 rounded-lg p-4 h-full overflow-auto"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
            }}
          >
            <pre className="text-sm font-mono whitespace-pre-wrap text-gray-900">
              Loading text content...
            </pre>
          </div>
        </div>
      )
    }

    // Default file preview
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-sm font-medium text-gray-900 mb-2">{file.name}</p>
          <p className="text-xs text-gray-600 mb-4">
            {file.type || 'Unknown type'} • {file.size} bytes
          </p>
          <div className="bg-gray-100 rounded-lg p-4 max-w-md">
            <p className="text-sm text-gray-700">
              Preview not available for this file type. You can download the file to view it.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm ${
      isFullscreen ? 'p-0' : 'p-4'
    }`}>
      <div
        ref={containerRef}
        className={`bg-white rounded-lg shadow-xl overflow-hidden flex flex-col ${
          isFullscreen ? 'w-full h-full' : 'max-w-6xl max-h-[90vh] w-full mx-auto'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium text-gray-900">
                {title || file?.name || 'Document Preview'}
              </h3>
              {metadata?.studentName && (
                <p className="text-xs text-gray-600">Student: {metadata.studentName}</p>
              )}
            </div>
            {metadata?.validationStatus && (
              <Badge
                variant={
                  metadata.validationStatus === 'valid' ? 'secondary' :
                  metadata.validationStatus === 'warning' ? 'outline' : 'destructive'
                }
                className="text-xs"
              >
                {metadata.validationStatus}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                className="h-7 w-7 p-0"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-xs text-gray-600 min-w-[3rem] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                className="h-7 w-7 p-0"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>

            {/* Navigation Controls */}
            {totalPages > 1 && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-gray-600 min-w-[4rem] text-center">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Action Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotate}
              className="h-7 w-7 p-0"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomReset}
              className="h-7 w-7 p-0"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-7 w-7 p-0"
            >
              {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
            </Button>

            {onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
                className="h-7 w-7 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {renderContent()}
        </div>

        {/* Footer */}
        {!isFullscreen && metadata && (
          <div className="flex items-center justify-between p-3 bg-gray-50 border-t text-xs text-gray-600">
            <div className="flex items-center gap-4">
              {metadata.category && <span>Category: {metadata.category}</span>}
              {metadata.uploadedBy && <span>Uploaded by: {metadata.uploadedBy}</span>}
              {metadata.uploadDate && <span>Date: {metadata.uploadDate}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span>Zoom: {zoom}%</span>
              {rotation > 0 && <span>Rotation: {rotation}°</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentPreview
