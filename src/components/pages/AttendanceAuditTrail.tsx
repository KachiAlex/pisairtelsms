import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  RefreshCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
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

// TypeScript interfaces

interface AuditTrailEntry {
  id: string
  attendanceRecordId: string
  action: 'create' | 'update' | 'delete'
  oldValue?: Record<string, any>
  newValue?: Record<string, any>
  changedBy: string
  changedAt: string
}

interface AuditTrailResponse {
  success: boolean
  data: AuditTrailEntry[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

interface FilterState {
  studentId: string
  startDate: string
  endDate: string
  action: string
}

const AUDIT_PAGE_SIZE = 25

function getTenantHeaders(): Record<string, string> {
  try {
    const auth = localStorage.getItem('auth')
    const tenantId = auth ? JSON.parse(auth).tenantId || 'default-tenant' : 'default-tenant'
    return {   } catch {
    return {   }
}

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' {
  if (action === 'create') return 'default'
  if (action === 'update') return 'secondary'
  return 'destructive'
}

function getActionIcon(action: string) {
  if (action === 'create') return <Plus className="h-3 w-3" />
  if (action === 'update') return <ArrowUp className="h-3 w-3" />
  return <Trash2 className="h-3 w-3" />
}

function formatChangeValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getChangedFields(oldValue?: Record<string, any>, newValue?: Record<string, any>): string[] {
  const fields = new Set<string>()
  if (oldValue) Object.keys(oldValue).forEach((k) => fields.add(k))
  if (newValue) Object.keys(newValue).forEach((k) => fields.add(k))
  return Array.from(fields).sort()
}

export function AttendanceAuditTrail() {
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    studentId: '',
    startDate: '',
    endDate: '',
    action: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Audit trail data
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Expanded rows for change history visualization
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const fetchAuditTrail = useCallback(async (pageNum = 0) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: String(AUDIT_PAGE_SIZE),
        offset: String(pageNum * AUDIT_PAGE_SIZE),
      })

      if (filters.studentId) params.set('studentId', filters.studentId)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.action) params.set('action', filters.action)

      const res = await fetch(`/api/tenant/attendance/audit-trail?${params}`, {
        headers: getTenantHeaders(),
      })

      if (!res.ok) throw new Error('Failed to fetch audit trail')
      const json: AuditTrailResponse = await res.json()
      setAuditEntries(json.data || [])
      setTotal(json.pagination?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const refreshData = useCallback(async () => {
    setPage(0)
    await fetchAuditTrail(0)
    setLastRefreshed(new Date())
  }, [fetchAuditTrail])

  // Initial load
  useEffect(() => {
    fetchAuditTrail(0)
    setLastRefreshed(new Date())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filters change
  useEffect(() => {
    setPage(0)
    fetchAuditTrail(0)
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when page changes
  useEffect(() => {
    fetchAuditTrail(page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      studentId: '',
      startDate: '',
      endDate: '',
      action: '',
    })
  }

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const exportToCSV = () => {
    const headers = [
      'Timestamp',
      'Action',
      'Student ID',
      'Changed By',
      'Changed Fields',
      'Old Value',
      'New Value',
    ]

    const rows = auditEntries.map((entry) => {
      const changedFields = getChangedFields(entry.oldValue, entry.newValue)
      return [
        new Date(entry.changedAt).toLocaleString(),
        entry.action,
        entry.attendanceRecordId,
        entry.changedBy,
        changedFields.join('; '),
        formatChangeValue(entry.oldValue),
        formatChangeValue(entry.newValue),
      ]
    })

    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / AUDIT_PAGE_SIZE)
  const hasActiveFilters = filters.studentId || filters.startDate || filters.endDate || filters.action

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Compliance</p>
          <h1 className="text-2xl font-bold text-gray-900">Attendance audit trail</h1>
          <p className="text-sm text-gray-600">
            Complete record of all attendance changes with timestamps and user information.
          </p>
          {lastRefreshed && (
            <p className="text-xs text-gray-400 mt-1">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            data-testid="toggle-filters-button"
          >
            <Filter className="h-4 w-4 mr-2" /> Filters
            {hasActiveFilters && <Badge className="ml-2 bg-blue-600">Active</Badge>}
          </Button>
          <Button variant="outline" onClick={refreshData} data-testid="refresh-button">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={exportToCSV} disabled={auditEntries.length === 0} data-testid="export-csv-button">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card data-testid="filters-panel">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Student ID</label>
                  <Input
                    placeholder="Filter by student ID"
                    value={filters.studentId}
                    onChange={(e) => handleFilterChange('studentId', e.target.value)}
                    data-testid="student-id-filter"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    data-testid="start-date-filter"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">End Date</label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    data-testid="end-date-filter"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Action</label>
                  <select
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    data-testid="action-filter"
                    aria-label="Filter by action"
                  >
                    <option value="">All actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  data-testid="clear-filters-button"
                >
                  <X className="h-4 w-4 mr-2" /> Clear filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail Table */}
      <Card data-testid="audit-trail-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="h-4 w-4 text-blue-600" /> Audit trail entries
              </CardTitle>
              <CardDescription>
                {total > 0 ? (
                  <>
                    {total} change{total !== 1 ? 's' : ''} recorded
                    {hasActiveFilters && <span className="ml-1 font-medium text-gray-700">(filtered)</span>}
                  </>
                ) : (
                  'No audit trail entries found'
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8" data-testid="audit-trail-loading">
              <div className="text-sm text-gray-500">Loading audit trail…</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8" data-testid="audit-trail-error">
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          ) : auditEntries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">No audit trail entries found.</div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Changed Fields</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEntries.map((entry) => {
                    const isExpanded = expandedRows.has(entry.id)
                    const changedFields = getChangedFields(entry.oldValue, entry.newValue)

                    return (
                      <React.Fragment key={entry.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleRowExpanded(entry.id)}
                          data-testid={`audit-row-${entry.id}`}
                        >
                          <TableCell>
                            <button
                              className="p-1 hover:bg-gray-200 rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleRowExpanded(entry.id)
                              }}
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              />
                            </button>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(entry.changedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(entry.action)}>
                              {getActionIcon(entry.action)}
                              <span className="ml-1 capitalize">{entry.action}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-600">
                            {entry.attendanceRecordId.substring(0, 8)}…
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {entry.changedBy.substring(0, 20)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex flex-wrap gap-1">
                              {changedFields.slice(0, 2).map((field) => (
                                <Badge key={field} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                              {changedFields.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{changedFields.length - 2} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row - Change history visualization */}
                        {isExpanded && (
                          <TableRow className="bg-gray-50" data-testid={`audit-expanded-${entry.id}`}>
                            <TableCell colSpan={6} className="p-4">
                              <div className="space-y-4">
                                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                                  {/* Old Value */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                      <ArrowUp className="h-3 w-3 text-amber-600" /> Previous Value
                                    </h4>
                                    {entry.oldValue && Object.keys(entry.oldValue).length > 0 ? (
                                      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                                        {Object.entries(entry.oldValue).map(([key, value]) => (
                                          <div key={key} className="text-xs">
                                            <span className="font-medium text-gray-700">{key}:</span>
                                            <span className="text-gray-600 ml-2 break-all">
                                              {formatChangeValue(value)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500 italic">No previous value</div>
                                    )}
                                  </div>

                                  {/* New Value */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                      <ArrowDown className="h-3 w-3 text-emerald-600" /> New Value
                                    </h4>
                                    {entry.newValue && Object.keys(entry.newValue).length > 0 ? (
                                      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                                        {Object.entries(entry.newValue).map(([key, value]) => (
                                          <div key={key} className="text-xs">
                                            <span className="font-medium text-gray-700">{key}:</span>
                                            <span className="text-gray-600 ml-2 break-all">
                                              {formatChangeValue(value)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500 italic">No new value</div>
                                    )}
                                  </div>
                                </div>

                                {/* Change Summary */}
                                <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                                  <h4 className="text-xs font-semibold text-blue-900 mb-2">Change Summary</h4>
                                  <div className="text-xs text-blue-800 space-y-1">
                                    <p>
                                      <span className="font-medium">Record ID:</span> {entry.attendanceRecordId}
                                    </p>
                                    <p>
                                      <span className="font-medium">Changed By:</span> {entry.changedBy}
                                    </p>
                                    <p>
                                      <span className="font-medium">Timestamp:</span>{' '}
                                      {new Date(entry.changedAt).toLocaleString()}
                                    </p>
                                    <p>
                                      <span className="font-medium">Fields Changed:</span> {changedFields.join(', ')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 gap-3" data-testid="pagination">
                <p className="text-sm text-gray-500">
                  {total} change{total !== 1 ? 's' : ''}
                  {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    data-testid="prev-page-button"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    data-testid="next-page-button"
                    aria-label="Next page"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AttendanceAuditTrail
