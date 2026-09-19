import React from 'react'
import { Filter, RotateCcw } from 'lucide-react'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import type { AnalyticsFilters } from '../../../hooks/useAnalytics'
import { useAcademicYears, useTimetableTerms } from '../../../hooks/useTimetableTerms'

export interface DashboardFiltersProps {
  filters: AnalyticsFilters
  onChange: (filters: AnalyticsFilters) => void
}

const CLASSES = ['All', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3']

export function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  // Sessions/terms from Timetable & Scheduling — the single source of truth.
  const { termNames } = useTimetableTerms(filters.term)
  const { years } = useAcademicYears()
  const sessionNames = filters.academicSession && !years.some(y => y.name === filters.academicSession)
    ? [filters.academicSession, ...years.map(y => y.name)]
    : years.map(y => y.name)
  const update = (key: keyof AnalyticsFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined })
  }

  const reset = () => {
    onChange({})
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Academic session</Label>
          <Select value={filters.academicSession || ''} onValueChange={(v) => update('academicSession', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessionNames.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Term</Label>
          <Select value={filters.term || ''} onValueChange={(v) => update('term', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {termNames.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Class</Label>
          <Select value={filters.class || ''} onValueChange={(v) => update('class', v === 'All' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Start date</Label>
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => update('startDate', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">End date</Label>
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => update('endDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
