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
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'

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

function getTenantHeaders(): Record<string, string> {
  try {
    const auth = localStorage.getItem('auth')
    const tenantId = auth ? JSON.parse(auth).tenantId || 'default-tenant' : 'default-tenant'
    return { 'x-tenant-id': tenantId }
  } catch {
    return { 'x-tenant-id': 'default-tenant' }
  }
}

function heatmapBgClass(color: HeatmapEntry['color']): string {
  if (color === 'green') return 'bg-emerald-500'
  if (color === 'yellow') return 'bg-amber-400'
  return 'bg-rose-500'
}

export function StudentAttendance() {
  const [activeTab, setActiveTab] = useState('students')

  // Filters
  const [classFilter, setClassFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
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

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true)
    setDashboardError(null)
    try {
      const params = new URLSearchParams()
      if (termFilter) params.set('term', termFilter)
      const res = await fetch(`/api/tenant/attendance/analytics/dashboard?${params}`, {
        headers: getTenantHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch dashboard stats')
      const json = await res.json()
      setDashboardStats(json.data)
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : 'Failed to load dashboard stats')
    } finally {
      setDashboardLoading(false)
    }
  }, [termFilter])

  const fetchHeatmap = useCallback(async () => {
    setHeatmapLoading(true)
    setHeatmapError(null)
    try {
      const params = new URLSearchParams({ weeks: '4' })
      if (classFilter) params.set('class', classFilter)
      const res = await fetch(`/api/tenant/attendance/analytics/heatmap?${params}`, {
        headers: getTenantHeaders(),
      })
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
      const res = await fetch(`/api/tenant/attendance/analytics/at-risk-students?${params}`, {
        headers: getTenantHeaders(),
      })
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
      const res = await fetch(`/api/tenant/attendance/analytics/homeroom-leaderboard?${params}`, {
        headers: getTenantHeaders(),
      })
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
          <Button>
            <Bell className="h-4 w-4 mr-2" /> Send absence notices
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Student Attendance
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="h-4 w-4 mr-2" />
            Staff Attendance
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
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
                <div className="flex flex-wrap gap-3">
                  <select
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    data-testid="class-filter"
                    aria-label="Filter by class"
                  >
                    <option value="">All classes</option>
                    {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                    data-testid="term-filter"
                    aria-label="Filter by term"
                  >
                    <option value="">All terms</option>
                    {['1', '2', '3'].map((t) => (
                      <option key={t} value={t}>Term {t}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    value={reasonFilter}
                    onChange={(e) => setReasonFilter(e.target.value)}
                    data-testid="reason-filter"
                    aria-label="Filter by reason"
                  >
                    <option value="">All reasons</option>
                    <option value="absence">Absence</option>
                    <option value="late">Late</option>
                  </select>
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

        {/* Staff Attendance Tab */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Staff Attendance</p>
              <p className="text-sm text-gray-500 mt-1">Staff attendance tracking coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Attendance Reports</p>
              <p className="text-sm text-gray-500 mt-1">Detailed reports and analytics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StudentAttendance
