import React, { useMemo, useState } from 'react'
import { Clock, Filter, ShieldCheck, Download } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface AuditEntry {
  id: string
  time: string
  actor: string
  action: string
  surface: string
  meta: string
  severity: 'info' | 'warning' | 'critical'
}

const entries: AuditEntry[] = [
  {
    id: '1',
    time: '2026-02-21 09:45',
    actor: 'Adaeze Nwosu',
    action: 'Updated fee structure',
    surface: 'Finance',
    meta: 'Adjusted JSS3 term fees',
    severity: 'info',
  },
  {
    id: '2',
    time: '2026-02-21 09:32',
    actor: 'System',
    action: 'Revoked dormant session',
    surface: 'Security',
    meta: 'Lola Balogun',
    severity: 'warning',
  },
  {
    id: '3',
    time: '2026-02-21 09:10',
    actor: 'Chioma Okeke',
    action: 'Published exam results',
    surface: 'Examinations',
    meta: 'SS2 Mock',
    severity: 'info',
  },
  {
    id: '4',
    time: '2026-02-21 08:55',
    actor: 'Tunde Ajayi',
    action: 'Changed user role',
    surface: 'Access',
    meta: 'Upgraded Ibrahim to School Admin',
    severity: 'critical',
  },
  {
    id: '5',
    time: '2026-02-21 08:30',
    actor: 'System',
    action: 'Backup completed',
    surface: 'Platform',
    meta: 'Daily automated backup',
    severity: 'info',
  },
]

const severityColors: Record<AuditEntry['severity'], string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-rose-100 text-rose-700',
}

export function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [surfaceFilter, setSurfaceFilter] = useState('all')

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSurface = surfaceFilter === 'all' || entry.surface === surfaceFilter
      const matchesSearch =
        entry.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.meta.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSurface && matchesSearch
    })
  }, [searchTerm, surfaceFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Observability</p>
          <h1 className="text-2xl font-bold text-gray-900">Audit logs</h1>
          <p className="text-sm text-gray-500">Trace every configuration change across Scholix tenant surfaces.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Advanced filters
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 text-blue-600" />
            Log stream
          </CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Input
                placeholder="Search actor, action, or metadata"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
              <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={surfaceFilter}
                onChange={(event) => setSurfaceFilter(event.target.value)}
              >
                <option value="all">All surfaces</option>
                <option value="Finance">Finance</option>
                <option value="Security">Security</option>
                <option value="Examinations">Examinations</option>
                <option value="Access">Access</option>
                <option value="Platform">Platform</option>
              </select>
              <Button variant="ghost" size="sm">Live feed</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Surface</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-gray-500">{entry.time}</TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{entry.actor}</TableCell>
                    <TableCell className="text-sm text-gray-700">{entry.action}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600">
                        {entry.surface}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{entry.meta}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${severityColors[entry.severity]}`}>
                        {entry.severity}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default AuditLogs;
