import React, { useEffect, useState } from 'react'
import { CalendarRange } from 'lucide-react'

import { Card, CardContent } from '../ui/card'
import { PageHint } from '../ui/page-hint'
import { AcademicYearManager } from './timetable/AcademicYearManager'
import { TermManager } from './timetable/TermManager'
import { HolidayManager } from './timetable/HolidayManager'
import { ExamPeriodManager } from './timetable/ExamPeriodManager'
import type { Term, Holiday, ExamPeriod } from './timetable/ConfigureTab'
import { tenantApiGet } from '../../lib/tenantApi'

/**
 * Sessions & Terms — the single place to define academic years, mark which
 * one is current, and lay out its terms, holidays, and exam windows.
 * (Moved out of Timetable → Configure; that area now only holds bell-time
 * mechanics. Every session/term default in the app resolves from here.)
 */
export function AcademicSessions() {
  const [terms, setTerms] = useState<Term[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const calRes = await tenantApiGet('/api/tenant/timetable/calendar')
      if (!calRes.ok) throw new Error('Failed to load calendar data')
      const calData = await calRes.json()
      setTerms(Array.isArray(calData.data?.terms) ? calData.data.terms : [])
      setHolidays(Array.isArray(calData.data?.holidays) ? calData.data.holidays : [])
      setExamPeriods(Array.isArray(calData.data?.examPeriods) ? calData.data.examPeriods : [])
    } catch {
      setError('Failed to load sessions & terms. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Academic Structure</p>
        <h1 className="text-2xl font-bold text-gray-900">Sessions &amp; Terms</h1>
        <p className="text-sm text-gray-600">Define academic years, mark the current one, and lay out terms, holidays, and exam windows.</p>
      </div>

      <PageHint
        id="academic-sessions"
        title="This is the single source of truth for the academic calendar"
        tips={[
          'Create each academic year once and flag exactly one as current — every module (results, attendance, finance, analytics) resolves the active session from here.',
          'Terms belong to a year and must not overlap. The term covering today is treated as the current term across the app.',
          'Holidays and exam windows attach to terms and show up on the Academic Calendar and timetable tools.',
        ]}
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-red-600">
            <p>{error}</p>
            <button onClick={fetchAll} className="mt-3 text-sm text-blue-600 underline">Retry</button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <AcademicYearManager onRefresh={fetchAll} />
          <TermManager terms={terms} onRefresh={fetchAll} />
          <HolidayManager holidays={holidays} terms={terms} onRefresh={fetchAll} />
          <ExamPeriodManager examPeriods={examPeriods} terms={terms} onRefresh={fetchAll} />
        </div>
      )}
    </div>
  )
}
export default AcademicSessions
