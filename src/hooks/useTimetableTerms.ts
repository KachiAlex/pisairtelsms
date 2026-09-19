import { useEffect, useState } from 'react'
import { tenantApiGet } from '../lib/tenantApi'

export interface TimetableTerm {
  id: string
  name: string
  start_date: string
  end_date: string
  academic_year: string
}

interface UseTimetableTermsResult {
  terms: TimetableTerm[]
  termNames: string[]
  /** Term covering today, else the earliest term — sensible default for selectors. */
  currentTermName: string
  loading: boolean
  error: string | null
}

/**
 * Fetches configured terms from Timetable & Scheduling
 * (/api/tenant/timetable/calendar?resource=terms). This is the single
 * source of truth for term names — pages must not hardcode
 * "First Term"/"Second Term"/"Third Term".
 *
 * termNames merges the currently-selected value (if provided) so that
 * historical records keyed by a since-deleted term name stay selectable.
 */
export function useTimetableTerms(selectedTerm?: string | string[], academicYear?: string): UseTimetableTermsResult {
  const [terms, setTerms] = useState<TimetableTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url = academicYear
      ? `/api/tenant/timetable/calendar?resource=terms&academicYear=${encodeURIComponent(academicYear)}`
      : '/api/tenant/timetable/calendar?resource=terms'
    tenantApiGet(url)
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(d => {
        if (cancelled) return
        setTerms(Array.isArray(d?.data) ? d.data : [])
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setTerms([])
        setError('Failed to load terms')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [academicYear])

  const names = terms.map(t => t.name)
  const extra = (Array.isArray(selectedTerm) ? selectedTerm : selectedTerm ? [selectedTerm] : []).filter(
    s => s && !names.includes(s)
  )
  const termNames = [...extra, ...names]

  const today = new Date().toISOString().slice(0, 10)
  const currentTermName =
    terms.find(t => t.start_date <= today && today <= t.end_date)?.name ||
    terms[0]?.name ||
    ''

  return { terms, termNames, currentTermName, loading, error }
}

export interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

interface UseAcademicYearsResult {
  years: AcademicYear[]
  /** Name of the year flagged is_current, else the first. */
  currentYearName: string
  loading: boolean
}

/** Fetches academic years from Timetable & Scheduling — single source of truth. */
export function useAcademicYears(): UseAcademicYearsResult {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    tenantApiGet('/api/tenant/timetable/calendar?resource=academic-years')
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(d => {
        if (!cancelled) setYears(Array.isArray(d?.data) ? d.data : [])
      })
      .catch(() => {
        if (!cancelled) setYears([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const currentYearName = years.find(y => y.is_current)?.name || years[0]?.name || ''
  return { years, currentYearName, loading }
}
