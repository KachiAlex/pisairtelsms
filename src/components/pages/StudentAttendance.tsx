import React, { useState, useEffect, useCallback } from 'react'
import {
  CalendarCheck,
  AlertTriangle,
  Users,
  TrendingDown,
  RefreshCcw,
  Download,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Loader2,
  FileText,
  Upload,
  Check,
  X,
  Clock,
  ClipboardCheck,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ClassArmSelect } from '../ui/class-arm-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { useToast } from '../ui/use-toast'
import { tenantApiGet, tenantApiPost } from '../../lib/tenantApi'

// TypeScript interfaces

interface DashboardStats {
  presentRate: number
  absentRate: number
  lateRate: number
  totalRecords: number
  dataFreshness: string
}

interface HeatmapEntry {
  week: string
  presentPct: number
  absentPct: number
  latePct: number
  total: number
  color: 'green' | 'yellow' | 'red'
}

interface AtRiskStudent {
  studentId: string
  name: string
  class: string
  attendance: number
  reason: string
  absenceCount: number
  lateCount: number
  owner: string | null
}

interface LeaderboardEntry {
  homeroom: string
  rate: number
  studentCount: number
  presentCount: number
}

interface LeaderboardData {
  entries: LeaderboardEntry[]
  calculationDate: string
}

const AT_RISK_PAGE_SIZE = 10

function heatmapBgClass(color: HeatmapEntry['color']): string {
  if (color === 'green') return 'bg-emerald-500'
  if (color === 'yellow') return 'bg-amber-400'
  return 'bg-rose-500'
}

export function StudentAttendance({ initialTab }: { initialTab?: string }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState(initialTab || 'students')

  // Filters
  const [classFilter, setClassFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [academicSession, setAcademicSession] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  // Heatmap
  const [heatmapData, setHeatmapData] = useState<HeatmapEntry[]>([])
  const [heatmapLoading, setHeatmapLoading] = useState(false)
  const [heatmapError, setHeatmapError] = useState<string | null>(null)

  // At-risk students
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([])
  const [atRiskTotal, setAtRiskTotal] = useState(0)
  const [atRiskLoading, setAtRiskLoading] = useState(false)
  const [atRiskError, setAtRiskError] = useState<string | null>(null)
  const [atRiskPage, setAtRiskPage] = useState(0)

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)

  // Notifications
  const [sendingNotices, setSendingNotices] = useState(false)

  // Reports
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportClass, setReportClass] = useState('')
  const [reportFormat, setReportFormat] = useState<'csv' | 'pdf'>('csv')
  const [reportTerm, setReportTerm] = useState('')
  const [reportStudentId, setReportStudentId] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportPreview, setReportPreview] = useState<any>(null)
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false)
  const [reportPreviewError, setReportPreviewError] = useState<string | null>(null)

  // Staff attendance (admin oversight)
  const [staffAttData, setStaffAttData] = useState<any>(null)
  const [staffAttLoading, setStaffAttLoading] = useState(false)
  const [staffAttError, setStaffAttError] = useState<string | null>(null)
  const [staffAttDate, setStaffAttDate] = useState('')
  const [overrideStaff, setOverrideStaff] = useState<any>(null)
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'absent' | 'late' | 'half_day'>('present')
  const [overrideCheckIn, setOverrideCheckIn] = useState('')
  const [overrideCheckOut, setOverrideCheckOut] = useState('')
  const [overrideNotes, setOverrideNotes] = useState('')
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)

  // Mark Attendance tab
  const [markClass, setMarkClass] = useState('')
  const [markDate, setMarkDate] = useState('')
  const [markTerm, setMarkTerm] = useState('First Term')
  const [markStudents, setMarkStudents] = useState<any[]>([])
  const [markAttendance, setMarkAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
  const [markLoading, setMarkLoading] = useState(false)
  const [markSubmitting, setMarkSubmitting] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)

  // Batch Upload tab
  const [batchFile, setBatchFile] = useState<File | null>(null)
  const [batchPreview, setBatchPreview] = useState<any>(null)
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false)
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const y = now.getFullYear()
    setAcademicSession(`${y}/${y + 1}`)
  }, [])

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true)
    setDashboardError(null)
    try {
      const params = new URLSearchParams()
      if (termFilter) params.set('term', termFilter)
      if (academicSession) params.set('academicSession', academicSession)
      const res = await tenantApiGet(`/api/tenant/attendance/analytics/dashboard?${params}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard stats')
      const json = await res.json()
      setDashboardStats(json.data)
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : 'Failed to load dashboard stats')
    } finally {
      setDashboardLoading(false)
    }
  }, [termFilter, academicSession])

  const fetchHeatmap = useCallback(async () => {
    setHeatmapLoading(true)
    setHeatmapError(null)
    try {
      const params = new URLSearchParams({ weeks: '4' })
      if (classFilter) params.set('class', classFilter)
      const res = await tenantApiGet(`/api/tenant/attendance/analytics/heatmap?${params}`)
      if (!res.ok) throw new Error('Failed to fetch heatmap data')
      const json = await res.json()
      setHeatmapData(json.data || [])
    } catch (err) {
      setHeatmapError(err instanceof Error ? err.message : 'Failed to load heatmap')
    } finally {
      setHeatmapLoading(false)
    }
  }, [classFilter])

  const fetchAtRisk = useCallback(async (page = 0) => {
    setAtRiskLoading(true)
    setAtRiskError(null)
    try {
      const params = new URLSearchParams({
        limit: String(AT_RISK_PAGE_SIZE),
        offset: String(page * AT_RISK_PAGE_SIZE),
      })
      if (classFilter) params.set('class', classFilter)
      if (reasonFilter) params.set('reason', reasonFilter)
      const res = await tenantApiGet(`/api/tenant/attendance/analytics/at-risk-students?${params}`)
      if (!res.ok) throw new Error('Failed to fetch at-risk students')
      const json = await res.json()
      setAtRiskStudents(json.data || [])
      setAtRiskTotal(json.pagination?.total ?? 0)
    } catch (err) {
      setAtRiskError(err instanceof Error ? err.message : 'Failed to load at-risk students')
    } finally {
      setAtRiskLoading(false)
    }
  }, [classFilter, reasonFilter])

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    try {
      const params = new URLSearchParams()
      if (termFilter) params.set('term', termFilter)
      const res = await tenantApiGet(`/api/tenant/attendance/analytics/homeroom-leaderboard?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      const json = await res.json()
      setLeaderboard(json.data)
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLeaderboardLoading(false)
    }
  }, [termFilter])

  const refreshAll = useCallback(async () => {
    setAtRiskPage(0)
    await Promise.all([fetchDashboard(), fetchHeatmap(), fetchAtRisk(0), fetchLeaderboard()])
    setLastRefreshed(new Date())
  }, [fetchDashboard, fetchHeatmap, fetchAtRisk, fetchLeaderboard])

  const handleSendNotices = async () => {
    setSendingNotices(true)
    try {
      const body: Record<string, string> = {}
      if (classFilter) body.class = classFilter
      const res = await tenantApiPost('/api/tenant/attendance/notifications/bulk-send', body)
      const data = await res.json()
      if (res.ok && data.success) {
        toast({
          title: 'Notices sent',
          description: data.data?.message || `${data.data?.notificationCount || 0} guardians notified.`,
        })
      } else {
        toast({ title: 'Failed to send notices', description: data.error || 'Please try again.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' })
    } finally {
      setSendingNotices(false)
    }
  }

  const handleReportPreview = async () => {
    if (!reportStartDate || !reportEndDate) {
      toast({ title: 'Date range required', description: 'Please select start and end dates.', variant: 'destructive' })
      return
    }
    setReportPreviewLoading(true)
    setReportPreviewError(null)
    setReportPreview(null)
    try {
      const body: Record<string, any> = {
        format: 'json',
        startDate: reportStartDate,
        endDate: reportEndDate,
      }
      if (reportClass) body.class = reportClass
      if (reportTerm) body.term = reportTerm
      if (reportStudentId) body.studentId = reportStudentId

      const res = await tenantApiPost('/api/tenant/attendance/reports', body)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate preview')
      }
      const json = await res.json()
      setReportPreview(json.data)
    } catch (e) {
      setReportPreviewError(e instanceof Error ? e.message : 'Failed to generate preview')
    } finally {
      setReportPreviewLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      toast({ title: 'Date range required', description: 'Please select start and end dates.', variant: 'destructive' })
      return
    }
    setGeneratingReport(true)
    try {
      const body: Record<string, any> = {
        format: reportFormat,
        startDate: reportStartDate,
        endDate: reportEndDate,
      }
      if (reportClass) body.class = reportClass
      if (reportTerm) body.term = reportTerm
      if (reportStudentId) body.studentId = reportStudentId

      const res = await tenantApiPost('/api/tenant/attendance/reports', body)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate report')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = reportFormat === 'csv' ? 'csv' : 'txt'
      a.download = `attendance-report-${reportStartDate}-to-${reportEndDate}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Report generated', description: `Attendance report downloaded as ${ext.toUpperCase()}.` })
    } catch (e) {
      toast({ title: 'Report failed', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setGeneratingReport(false)
    }
  }

  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'term') => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    let start = new Date()
    if (preset === 'today') {
      // already today
    } else if (preset === 'week') {
      const day = now.getDay() || 7 // Monday = 1
      start = new Date(now)
      start.setDate(now.getDate() - day + 1)
    } else if (preset === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (preset === 'term') {
      start = new Date(now.getFullYear(), 0, 1) // Start of year as approximation
    }
    setReportStartDate(start.toISOString().split('T')[0])
    setReportEndDate(today)
    setReportPreview(null)
  }

  const fetchStaffAttendance = useCallback(async (date?: string) => {
    setStaffAttLoading(true)
    setStaffAttError(null)
    try {
      const targetDate = date || staffAttDate || new Date().toISOString().split('T')[0]
      const params = new URLSearchParams({ date: targetDate })
      const res = await tenantApiGet(`/api/tenant/staff-attendance?${params}`)
      if (!res.ok) throw new Error('Failed to fetch staff attendance')
      const json = await res.json()
      setStaffAttData(json.data)
    } catch (err) {
      setStaffAttError(err instanceof Error ? err.message : 'Failed to load staff attendance')
    } finally {
      setStaffAttLoading(false)
    }
  }, [staffAttDate])

  const handleOverrideSubmit = async () => {
    if (!overrideStaff) return
    setOverrideSubmitting(true)
    try {
      const body: Record<string, any> = {
        staffId: overrideStaff.staffId,
        date: staffAttDate || new Date().toISOString().split('T')[0],
        status: overrideStatus,
      }
      if (overrideCheckIn) body.checkIn = overrideCheckIn
      if (overrideCheckOut) body.checkOut = overrideCheckOut
      if (overrideNotes) body.notes = overrideNotes

      const res = await tenantApiPost('/api/tenant/staff-attendance', body)
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Attendance overridden', description: data.message || 'Staff attendance updated successfully.' })
        setOverrideStaff(null)
        setOverrideStatus('present')
        setOverrideCheckIn('')
        setOverrideCheckOut('')
        setOverrideNotes('')
        fetchStaffAttendance(staffAttDate)
      } else {
        toast({ title: 'Override failed', description: data.error || 'Please try again.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' })
    } finally {
      setOverrideSubmitting(false)
    }
  }

  // Mark Attendance handlers
  const fetchStudentsForMarking = useCallback(async (selectedClass: string) => {
    if (!selectedClass) return
    setMarkLoading(true)
    setMarkError(null)
    try {
      const params = new URLSearchParams({ class: selectedClass })
      const res = await tenantApiGet(`/api/tenant/students?${params}`)
      if (!res.ok) throw new Error('Failed to fetch students')
      const json = await res.json()
      setMarkStudents(json.data || [])
      const initialMarks: Record<string, 'present' | 'absent' | 'late'> = {}
      ;(json.data || []).forEach((s: any) => {
        initialMarks[s.id] = 'present'
      })
      setMarkAttendance(initialMarks)
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setMarkLoading(false)
    }
  }, [])

  const handleMarkAll = (status: 'present' | 'absent' | 'late') => {
    const allMarks: Record<string, 'present' | 'absent' | 'late'> = {}
    markStudents.forEach((s) => {
      allMarks[s.id] = status
    })
    setMarkAttendance(allMarks)
  }

  const handleSubmitAttendance = async () => {
    if (!markClass || !markDate || markStudents.length === 0) {
      toast({ title: 'Missing fields', description: 'Please select class and date, and load students.', variant: 'destructive' })
      return
    }
    setMarkSubmitting(true)
    try {
      const records = markStudents.map((s) => ({
        studentId: s.id,
        class: s.class,
        date: markDate,
        status: markAttendance[s.id] || 'present',
        source: 'teacher_entry',
        academicSession,
        term: markTerm,
      }))
      const res = await tenantApiPost('/api/tenant/attendance', { records })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Attendance saved', description: `${records.length} student records marked for ${markClass} on ${markDate}.` })
      } else {
        toast({ title: 'Failed to save', description: data.error || 'Please try again.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not reach the server.', variant: 'destructive' })
    } finally {
      setMarkSubmitting(false)
    }
  }

  // Batch Upload handlers
  const handleDownloadTemplate = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/attendance/batch-upload')
      if (!res.ok) throw new Error('Failed to download template')
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'attendance-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast({ title: 'Download failed', description: e instanceof Error ? e.message : 'Could not download template.', variant: 'destructive' })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBatchFile(file)
      setBatchPreview(null)
      setBatchError(null)
    }
  }

  const handlePreviewUpload = async () => {
    if (!batchFile) return
    setBatchPreviewLoading(true)
    setBatchError(null)
    try {
      const csvContent = await batchFile.text()
      const res = await tenantApiPost('/api/tenant/attendance/batch-upload?preview=true', csvContent)
      const data = await res.json()
      if (res.ok && data.success) {
        setBatchPreview(data.data)
      } else {
        setBatchError(data.error || 'Preview failed')
      }
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : 'Failed to preview file')
    } finally {
      setBatchPreviewLoading(false)
    }
  }

  const handleConfirmUpload = async () => {
    if (!batchFile) return
    setBatchUploading(true)
    setBatchError(null)
    try {
      const csvContent = await batchFile.text()
      const res = await tenantApiPost('/api/tenant/attendance/batch-upload', csvContent)
      const data = await res.json()
      if (res.ok && data.success) {
        toast({ title: 'Upload complete', description: data.data?.message || 'Attendance records imported successfully.' })
        setBatchPreview(null)
        setBatchFile(null)
      } else {
        setBatchError(data.error || 'Upload failed')
        toast({ title: 'Upload failed', description: data.error || 'Some records could not be processed.', variant: 'destructive' })
      }
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : 'Failed to upload file')
    } finally {
      setBatchUploading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchDashboard()
    fetchHeatmap()
    fetchAtRisk(0)
    fetchLeaderboard()
    setLastRefreshed(new Date())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when class filter changes
  useEffect(() => {
    fetchHeatmap()
    setAtRiskPage(0)
    fetchAtRisk(0)
  }, [classFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when term filter changes
  useEffect(() => {
    fetchDashboard()
    fetchLeaderboard()
  }, [termFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when academic session changes
  useEffect(() => {
    if (academicSession) {
      fetchDashboard()
    }
  }, [academicSession]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch staff attendance when staff tab is opened
  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffAttendance()
    }
  }, [activeTab, fetchStaffAttendance])

  // Re-fetch when reason filter changes
  useEffect(() => {
    setAtRiskPage(0)
    fetchAtRisk(0)
  }, [reasonFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pagination
  useEffect(() => {
    fetchAtRisk(atRiskPage)
  }, [atRiskPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportAtRiskToCSV = () => {
    const headers = ['Student Name', 'Class', 'Attendance %', 'Reason', 'Absences', 'Late Count', 'Owner']
    const rows = atRiskStudents.map((s) => [
      s.name,
      s.class,
      `${s.attendance}%`,
      s.reason,
      s.absenceCount,
      s.lateCount,
      s.owner || '',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `at-risk-students-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredAtRisk = atRiskStudents.filter((s) => {
    if (!searchTerm) return true
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.class.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const totalPages = Math.ceil(atRiskTotal / AT_RISK_PAGE_SIZE)

  const statCards = dashboardStats
    ? [
        {
          label: 'Present rate',
          value: `${dashboardStats.presentRate}%`,
          trend: dashboardStats.dataFreshness ? `As of ${dashboardStats.dataFreshness}` : 'Live data',
          tone: 'text-emerald-600',
        },
        {
          label: 'Absent rate',
          value: `${dashboardStats.absentRate}%`,
          trend: `${dashboardStats.totalRecords} total records`,
          tone: 'text-rose-600',
        },
        {
          label: 'Late rate',
          value: `${dashboardStats.lateRate}%`,
          trend: 'Rolling period',
          tone: 'text-amber-600',
        },
        {
          label: 'Total records',
          value: dashboardStats.totalRecords.toLocaleString(),
          trend: 'Loaded from database',
          tone: 'text-blue-600',
        },
      ]
    : [
        { label: 'Present rate', value: '—', trend: dashboardLoading ? 'Loading…' : (dashboardError ?? 'No data'), tone: 'text-emerald-600' },
        { label: 'Absent rate', value: '—', trend: dashboardLoading ? 'Loading…' : (dashboardError ?? 'No data'), tone: 'text-rose-600' },
        { label: 'Late rate', value: '—', trend: dashboardLoading ? 'Loading…' : (dashboardError ?? 'No data'), tone: 'text-amber-600' },
        { label: 'Total records', value: '—', trend: dashboardLoading ? 'Loading…' : (dashboardError ?? 'No data'), tone: 'text-blue-600' },
      ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Operations</p>
          <h1 className="text-2xl font-bold text-gray-900">Attendance management</h1>
          <p className="text-sm text-gray-600">
            Monitor daily presence, identify risks, and sync alerts with guardians.
          </p>
          {lastRefreshed && (
            <p className="text-xs text-gray-400 mt-1">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={refreshAll} data-testid="refresh-button">
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh data
          </Button>
          <Button onClick={handleSendNotices} disabled={sendingNotices}>
            {sendingNotices ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )} Send absence notices
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Student Attendance
          </TabsTrigger>
          <TabsTrigger value="mark">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="h-4 w-4 mr-2" />
            Staff Attendance
          </TabsTrigger>
          <TabsTrigger value="batch">
            <Upload className="h-4 w-4 mr-2" />
            Batch Upload
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Student Attendance Tab */}
        <TabsContent value="students" className="space-y-4">

          {/* Summary stats cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" data-testid="stats-cards">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                  {dashboardLoading ? (
                    <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-2" data-testid="stats-loading" />
                  ) : (
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  )}
                  <p className={`text-xs mt-1 ${stat.tone}`}>{stat.trend}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search student or class"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="min-w-[180px]">
                    <ClassArmSelect
                      value={classFilter}
                      onChange={setClassFilter}
                      allowAll
                      placeholder="All classes"
                    />
                  </div>
                  <Select value={termFilter || '_all'} onValueChange={(v) => setTermFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[150px]" data-testid="term-filter">
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All terms</SelectItem>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={reasonFilter || '_all'} onValueChange={(v) => setReasonFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[140px]" data-testid="reason-filter">
                      <SelectValue placeholder="All reasons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All reasons</SelectItem>
                      <SelectItem value="absence">Absence</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="w-[160px]">
                    <Input
                      type="text"
                      placeholder="2025/2026"
                      value={academicSession}
                      onChange={(e) => setAcademicSession(e.target.value)}
                      data-testid="session-filter"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={exportAtRiskToCSV}
                    disabled={atRiskStudents.length === 0}
                    data-testid="export-csv-button"
                  >
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Heatmap + Leaderboard row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Weekly heatmap */}
            <Card className="lg:col-span-2" data-testid="heatmap-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarCheck className="h-4 w-4 text-blue-600" /> Weekly attendance heatmap
                </CardTitle>
                <CardDescription>Present % per week — last 4 weeks.</CardDescription>
              </CardHeader>
              <CardContent>
                {heatmapLoading ? (
                  <div className="space-y-3" data-testid="heatmap-loading">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : heatmapError ? (
                  <div className="flex items-center justify-center py-8 text-sm text-rose-600" data-testid="heatmap-error">
                    {heatmapError}
                  </div>
                ) : heatmapData.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    No heatmap data available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 text-xs text-gray-500 font-medium">
                      <span>Week</span>
                      <span className="text-center text-emerald-600">Present %</span>
                      <span className="text-center text-rose-600">Absent %</span>
                      <span className="text-center text-amber-600">Late %</span>
                    </div>
                    {heatmapData.map((row) => (
                      <div key={row.week} className="grid grid-cols-4 gap-2 items-center">
                        <p className="text-xs font-semibold text-gray-600">{row.week}</p>
                        <div
                          className={`rounded-xl py-3 text-center text-xs font-semibold text-white ${heatmapBgClass(row.color)}`}
                        >
                          {row.presentPct}%
                        </div>
                        <div className="rounded-xl py-3 text-center text-xs font-semibold text-white bg-rose-400">
                          {row.absentPct}%
                        </div>
                        <div className="rounded-xl py-3 text-center text-xs font-semibold text-white bg-amber-400">
                          {row.latePct}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Homeroom leaderboard */}
            <Card data-testid="leaderboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-purple-600" /> Homeroom leaderboard
                </CardTitle>
                <CardDescription>Top classes by attendance rate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {leaderboardLoading ? (
                  <div className="space-y-2" data-testid="leaderboard-loading">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : leaderboardError ? (
                  <p className="text-sm text-rose-600 py-4" data-testid="leaderboard-error">{leaderboardError}</p>
                ) : !leaderboard || leaderboard.entries.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                    No leaderboard data available.
                  </div>
                ) : (
                  <>
                    {leaderboard.entries.map((entry, idx) => (
                      <div
                        key={entry.homeroom}
                        className="rounded-2xl border border-gray-100 p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{entry.homeroom}</p>
                            <p className="text-xs text-gray-500">{entry.studentCount} students</p>
                          </div>
                        </div>
                        <Badge
                          variant={entry.rate >= 95 ? 'default' : entry.rate >= 85 ? 'secondary' : 'destructive'}
                        >
                          {entry.rate}%
                        </Badge>
                      </div>
                    ))}
                    {leaderboard.calculationDate && (
                      <p className="text-xs text-gray-400 pt-1">
                        Calculated: {new Date(leaderboard.calculationDate).toLocaleDateString()}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* At-risk students table */}
          <Card data-testid="at-risk-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-rose-600" /> At-risk students
                  </CardTitle>
                  <CardDescription>
                    Attendance below 85% in the rolling 30-day period.
                    {atRiskTotal > 0 && (
                      <span className="ml-1 font-medium text-gray-700">
                        {atRiskTotal} student{atRiskTotal !== 1 ? 's' : ''} flagged
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAtRiskToCSV}
                  disabled={atRiskStudents.length === 0}
                  data-testid="export-csv-button-table"
                >
                  <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {atRiskLoading ? (
                <div className="flex items-center justify-center py-8" data-testid="at-risk-loading">
                  <div className="text-sm text-gray-500">Loading at-risk students…</div>
                </div>
              ) : atRiskError ? (
                <div className="flex items-center justify-center py-8" data-testid="at-risk-error">
                  <p className="text-sm text-rose-600">{atRiskError}</p>
                </div>
              ) : filteredAtRisk.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">No at-risk students found.</div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Absences</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Owner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAtRisk.map((student) => (
                        <TableRow key={student.studentId}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.class}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{student.attendance}%</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{student.reason}</TableCell>
                          <TableCell>{student.absenceCount}</TableCell>
                          <TableCell>{student.lateCount}</TableCell>
                          <TableCell className="text-sm text-gray-500">{student.owner ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 gap-3" data-testid="pagination">
                    <p className="text-sm text-gray-500">
                      {atRiskTotal} student{atRiskTotal !== 1 ? 's' : ''}
                      {totalPages > 1 && ` · Page ${atRiskPage + 1} of ${totalPages}`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAtRiskPage((p) => Math.max(0, p - 1))}
                        disabled={atRiskPage === 0}
                        data-testid="prev-page-button"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAtRiskPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={atRiskPage >= totalPages - 1}
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
        </TabsContent>

        {/* Mark Attendance Tab */}
        <TabsContent value="mark" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardCheck className="h-4 w-4 text-blue-600" /> Mark Daily Attendance
              </CardTitle>
              <CardDescription>
                Select a class and date, then mark each student as present, absent, or late. All students default to present.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selectors */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <ClassArmSelect
                    value={markClass}
                    onChange={(v) => {
                      setMarkClass(v)
                      if (v) fetchStudentsForMarking(v)
                      else setMarkStudents([])
                    }}
                    placeholder="Select class"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mark-date">Date</Label>
                  <Input
                    id="mark-date"
                    type="date"
                    value={markDate}
                    onChange={(e) => setMarkDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select value={markTerm} onValueChange={setMarkTerm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {markError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{markError}</AlertDescription>
                </Alert>
              )}

              {markLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading students…</span>
                </div>
              ) : markStudents.length > 0 ? (
                <>
                  {/* Bulk actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500 mr-2">Mark all:</span>
                    <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')}>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Present
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')}>
                      <X className="h-3.5 w-3.5 mr-1 text-rose-600" /> Absent
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMarkAll('late')}>
                      <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" /> Late
                    </Button>
                    <span className="ml-auto text-sm text-gray-500">
                      {markStudents.length} students
                    </span>
                  </div>

                  {/* Student list */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Admission No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-center">Present</TableHead>
                          <TableHead className="text-center">Absent</TableHead>
                          <TableHead className="text-center">Late</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {markStudents.map((student, idx) => (
                          <TableRow key={student.id}>
                            <TableCell className="text-gray-400">{idx + 1}</TableCell>
                            <TableCell className="font-mono text-sm">{student.admissionNo || '—'}</TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant={markAttendance[student.id] === 'present' ? 'default' : 'outline'}
                                className="h-8 w-8 p-0"
                                onClick={() => setMarkAttendance((prev) => ({ ...prev, [student.id]: 'present' }))}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant={markAttendance[student.id] === 'absent' ? 'destructive' : 'outline'}
                                className="h-8 w-8 p-0"
                                onClick={() => setMarkAttendance((prev) => ({ ...prev, [student.id]: 'absent' }))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant={markAttendance[student.id] === 'late' ? 'secondary' : 'outline'}
                                className="h-8 w-8 p-0"
                                onClick={() => setMarkAttendance((prev) => ({ ...prev, [student.id]: 'late' }))}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end">
                    <Button onClick={handleSubmitAttendance} disabled={markSubmitting || !markDate}>
                      {markSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Attendance
                    </Button>
                  </div>
                </>
              ) : markClass ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">No students found in this class.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">Select a class to load students.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Attendance Tab */}
        <TabsContent value="staff" className="space-y-4">
          {/* Summary stats */}
          {staffAttData?.summary && (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Total Staff</p>
                  <p className="text-2xl font-bold">{staffAttData.summary.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="text-2xl font-bold text-emerald-600">{staffAttData.summary.present}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Late</p>
                  <p className="text-2xl font-bold text-amber-600">{staffAttData.summary.late}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Absent</p>
                  <p className="text-2xl font-bold text-rose-600">{staffAttData.summary.absent}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">Anomalies</p>
                  <p className="text-2xl font-bold text-orange-600">{staffAttData.summary.withAnomalies}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Geofence / time window status banners */}
          {staffAttData && (staffAttData.geofenceEnabled || staffAttData.timeWindowEnabled) && (
            <div className="flex gap-2 flex-wrap">
              {staffAttData.geofenceEnabled && (
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                  <Check className="h-3 w-3 mr-1" /> Geofence enforced
                </Badge>
              )}
              {staffAttData.timeWindowEnabled && (
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                  <Clock className="h-3 w-3 mr-1" /> Time window enforced
                </Badge>
              )}
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                <Check className="h-3 w-3 mr-1" /> {staffAttData.summary.geoVerified} geo-verified
              </Badge>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-blue-600" /> Staff Attendance Oversight
                  </CardTitle>
                  <CardDescription>Real-time staff check-in/check-out with anomaly detection and admin override.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={staffAttDate}
                    onChange={(e) => {
                      setStaffAttDate(e.target.value)
                      fetchStaffAttendance(e.target.value)
                    }}
                    className="w-[160px]"
                  />
                  <Button variant="outline" size="sm" onClick={() => fetchStaffAttendance()}>
                    <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {staffAttLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading staff attendance…</span>
                </div>
              ) : staffAttError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{staffAttError}</AlertDescription>
                </Alert>
              ) : !staffAttData?.records || staffAttData.records.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-500">No staff records found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Geo</TableHead>
                      <TableHead>Anomalies</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffAttData.records.map((rec: any) => (
                      <TableRow key={rec.staffId}>
                        <TableCell className="font-medium">{rec.staffName}</TableCell>
                        <TableCell className="text-sm text-gray-500">{rec.department || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {rec.attendance?.checkIn ? (
                            <span className="font-mono">{rec.attendance.checkIn}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {rec.attendance?.checkOut ? (
                            <span className="font-mono">{rec.attendance.checkOut}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rec.attendance ? (
                            <Badge
                              variant={
                                rec.attendance.status === 'present' ? 'default' :
                                rec.attendance.status === 'late' ? 'secondary' :
                                rec.attendance.status === 'half_day' ? 'outline' : 'destructive'
                              }
                            >
                              {rec.attendance.status}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">absent</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {rec.attendance?.geoVerified ? (
                            <span title="Location verified" className="inline-flex items-center">
                              <Check className="h-4 w-4 text-emerald-600" />
                            </span>
                          ) : rec.attendance ? (
                            <span title="Location not verified" className="inline-flex items-center">
                              <X className="h-4 w-4 text-gray-400" />
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rec.anomalies.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {rec.anomalies.map((anomaly: string, i: number) => (
                                <span key={i} className="text-xs text-orange-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> {anomaly}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setOverrideStaff(rec)
                              setOverrideStatus(rec.attendance?.status || 'present')
                              setOverrideCheckIn(rec.attendance?.checkIn || '')
                              setOverrideCheckOut(rec.attendance?.checkOut || '')
                              setOverrideNotes('')
                            }}
                          >
                            Override
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Override dialog */}
          {overrideStaff && (
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ClipboardCheck className="h-4 w-4 text-blue-600" />
                    Override Attendance: {overrideStaff.staffName}
                  </CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setOverrideStaff(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={overrideStatus} onValueChange={(v) => setOverrideStatus(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="override-checkin">Check-in time</Label>
                    <Input
                      id="override-checkin"
                      type="time"
                      value={overrideCheckIn}
                      onChange={(e) => setOverrideCheckIn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="override-checkout">Check-out time</Label>
                    <Input
                      id="override-checkout"
                      type="time"
                      value={overrideCheckOut}
                      onChange={(e) => setOverrideCheckOut(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="override-notes">Notes</Label>
                    <Input
                      id="override-notes"
                      placeholder="Reason for override"
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOverrideStaff(null)}>Cancel</Button>
                  <Button onClick={handleOverrideSubmit} disabled={overrideSubmitting}>
                    {overrideSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save Override
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Batch Upload Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4 text-blue-600" /> Batch Upload Attendance
              </CardTitle>
              <CardDescription>
                Upload a CSV file to import attendance records in bulk. Download the template, fill it in, then upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Download template */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">1</span>
                  <Label className="text-sm font-medium">Download CSV template</Label>
                </div>
                <p className="text-sm text-gray-500 ml-8">
                  The template includes the required column headers and a sample row. Required columns:
                  <code className="ml-1 text-xs bg-gray-100 px-1 py-0.5 rounded">studentId, class, date, status, academicSession, term</code>
                  . Optional: <code className="ml-1 text-xs bg-gray-100 px-1 py-0.5 rounded">absenceReason</code>.
                </p>
                <div className="ml-8">
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" /> Download template
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4" />

              {/* Step 2: Upload file */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">2</span>
                  <Label className="text-sm font-medium">Select CSV file</Label>
                </div>
                <div className="ml-8">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="max-w-md"
                  />
                  {batchFile && (
                    <p className="text-sm text-gray-500 mt-2">
                      Selected: <span className="font-medium">{batchFile.name}</span> ({(batchFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4" />

              {/* Step 3: Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">3</span>
                  <Label className="text-sm font-medium">Preview & validate</Label>
                </div>
                <div className="ml-8 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePreviewUpload}
                    disabled={!batchFile || batchPreviewLoading}
                  >
                    {batchPreviewLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Preview file
                  </Button>
                </div>

                {batchError && (
                  <Alert variant="destructive" className="ml-8">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{batchError}</AlertDescription>
                  </Alert>
                )}

                {batchPreview && (
                  <div className="ml-8 space-y-3">
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Total rows</p>
                        <p className="text-xl font-bold">{batchPreview.totalRecords}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Valid</p>
                        <p className="text-xl font-bold text-emerald-600">{batchPreview.validRecords}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Invalid</p>
                        <p className="text-xl font-bold text-rose-600">{batchPreview.invalidRecords}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-gray-500">Will skip</p>
                        <p className="text-xl font-bold text-amber-600">{batchPreview.skipped}</p>
                      </div>
                    </div>

                    {batchPreview.errors && batchPreview.errors.length > 0 && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 max-h-48 overflow-y-auto">
                        <p className="text-sm font-medium text-rose-700 mb-2">
                          Errors ({batchPreview.errors.length} shown):
                        </p>
                        <ul className="space-y-1">
                          {batchPreview.errors.slice(0, 20).map((err: any, i: number) => (
                            <li key={i} className="text-xs text-rose-600">
                              Row {err.row}: {err.field} — {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        {batchPreview.message || `${batchPreview.validRecords} valid records ready to import.`}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <div className="border-t pt-4" />

              {/* Step 4: Confirm upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">4</span>
                  <Label className="text-sm font-medium">Confirm & import</Label>
                </div>
                <div className="ml-8">
                  <Button
                    onClick={handleConfirmUpload}
                    disabled={!batchFile || batchUploading || !batchPreview}
                  >
                    {batchUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Confirm & Upload
                  </Button>
                  {!batchPreview && (
                    <p className="text-sm text-gray-400 mt-2">Preview the file first before confirming upload.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {/* Quick date presets */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => applyDatePreset('today')}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => applyDatePreset('week')}>This Week</Button>
            <Button size="sm" variant="outline" onClick={() => applyDatePreset('month')}>This Month</Button>
            <Button size="sm" variant="outline" onClick={() => applyDatePreset('term')}>This Term</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" /> Generate Attendance Report
              </CardTitle>
              <CardDescription>
                Preview summary statistics, then export as CSV or PDF for a specific date range, class, term, or student.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="report-start">Start date</Label>
                  <Input
                    id="report-start"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => { setReportStartDate(e.target.value); setReportPreview(null) }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-end">End date</Label>
                  <Input
                    id="report-end"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => { setReportEndDate(e.target.value); setReportPreview(null) }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class (optional)</Label>
                  <div className="min-w-[160px]">
                    <ClassArmSelect
                      value={reportClass}
                      onChange={(v) => { setReportClass(v); setReportPreview(null) }}
                      allowAll
                      placeholder="All classes"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Term (optional)</Label>
                  <Select
                    value={reportTerm}
                    onValueChange={(v) => { setReportTerm(v); setReportPreview(null) }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-student">Student ID (optional)</Label>
                  <Input
                    id="report-student"
                    placeholder="e.g. ADM/2024/0001"
                    value={reportStudentId}
                    onChange={(e) => { setReportStudentId(e.target.value); setReportPreview(null) }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Export format</Label>
                  <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as 'csv' | 'pdf')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Excel)</SelectItem>
                      <SelectItem value="pdf">PDF (Text)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={handleReportPreview}
                  disabled={reportPreviewLoading || !reportStartDate || !reportEndDate}
                >
                  {reportPreviewLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Preview Summary
                </Button>
                <Button onClick={handleGenerateReport} disabled={generatingReport || !reportStartDate || !reportEndDate}>
                  {generatingReport ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download Report
                </Button>
              </div>

              {/* Preview error */}
              {reportPreviewError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{reportPreviewError}</AlertDescription>
                </Alert>
              )}

              {/* Preview results */}
              {reportPreview && (
                <div className="space-y-4">
                  {/* Summary stats cards */}
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Total Records</p>
                        <p className="text-2xl font-bold">{reportPreview.summary.totalRecords}</p>
                        {reportPreview.totalRecords > reportPreview.records.length && (
                          <p className="text-xs text-gray-400">Showing first {reportPreview.records.length} of {reportPreview.totalRecords}</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Present</p>
                        <p className="text-2xl font-bold text-emerald-600">{reportPreview.summary.presentCount}</p>
                        <p className="text-xs text-emerald-500">{reportPreview.summary.presentRate.toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Absent</p>
                        <p className="text-2xl font-bold text-rose-600">{reportPreview.summary.absentCount}</p>
                        <p className="text-xs text-rose-500">{reportPreview.summary.absentRate.toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-gray-500">Late</p>
                        <p className="text-2xl font-bold text-amber-600">{reportPreview.summary.lateCount}</p>
                        <p className="text-xs text-amber-500">{reportPreview.summary.lateRate.toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Attendance rate progress bar */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Attendance Rate</span>
                        <span className="text-sm font-bold">{reportPreview.summary.presentRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${reportPreview.summary.presentRate}%` }}
                        />
                        <div
                          className="bg-amber-400 h-full"
                          style={{ width: `${reportPreview.summary.lateRate}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${reportPreview.summary.absentRate}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Present</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Late</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Records preview table */}
                  {reportPreview.records.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Records Preview (first {reportPreview.records.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student ID</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Term</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportPreview.records.map((rec: any) => (
                              <TableRow key={rec.id}>
                                <TableCell className="font-medium text-sm">{rec.studentId}</TableCell>
                                <TableCell className="text-sm">{rec.class}</TableCell>
                                <TableCell className="text-sm">{rec.date}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      rec.status === 'present' ? 'default' :
                                      rec.status === 'late' ? 'secondary' : 'destructive'
                                    }
                                  >
                                    {rec.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-500">{rec.source}</TableCell>
                                <TableCell className="text-sm text-gray-500">{rec.term}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Applied filters summary */}
                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      Report covers {reportPreview.summary.totalRecords} records
                      {reportPreview.filters.class && ` for class ${reportPreview.filters.class}`}
                      {reportPreview.filters.term && `, ${reportPreview.filters.term}`}
                      {reportPreview.filters.studentId && `, student ${reportPreview.filters.studentId}`}
                      {' '}from {reportPreview.filters.startDate} to {reportPreview.filters.endDate}.
                      Ready to download as {reportFormat.toUpperCase()}.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {!reportPreview && !reportPreviewLoading && !reportPreviewError && (
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    Select a date range and click "Preview Summary" to see statistics before downloading.
                    Reports include all attendance records within the selected range.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StudentAttendance
