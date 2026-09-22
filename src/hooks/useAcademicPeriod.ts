import { useEffect, useState } from 'react'
import { useAcademicYears, useTimetableTerms, type TimetableTerm } from './useTimetableTerms'
import { fetchTenantSettings } from '../lib/tenantSettingsClient'

interface UseAcademicPeriodResult {
  /** Resolved current session name, e.g. "2025/2026". Never empty once loaded. */
  session: string
  /** Resolved current term name, e.g. "First Term". */
  term: string
  /** All configured terms (unfiltered). */
  terms: TimetableTerm[]
  /** Terms belonging to the resolved session. */
  sessionTerms: TimetableTerm[]
  loading: boolean
}

/**
 * Resolves the tenant's current academic session and term from real sources,
 * in priority order:
 *
 *   session: calendar year flagged is_current (the same value the global
 *            header shows) → tenant settings currentSession → date guess
 *   term:    term covering today within the session → settings currentTerm
 *            → the session's first term
 *
 * Pages must NOT guess "${year}/${year+1}" from the calendar date — that
 * produces the wrong session around year boundaries.
 */
export function useAcademicPeriod(): UseAcademicPeriodResult {
  const { years, currentYearName, loading: yearsLoading } = useAcademicYears()
  const { terms, loading: termsLoading } = useTimetableTerms()
  const [settings, setSettings] = useState<{ session?: string; term?: string }>({})
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchTenantSettings()
      .then((s) => {
        if (!cancelled) setSettings({ session: s.currentSession, term: s.currentTerm })
      })
      .catch(() => { /* settings unavailable — other fallbacks apply */ })
      .finally(() => { if (!cancelled) setSettingsLoaded(true) })
    return () => { cancelled = true }
  }, [])

  const now = new Date()
  const guessedSession = now.getMonth() >= 8
    ? `${now.getFullYear()}/${now.getFullYear() + 1}`
    : `${now.getFullYear() - 1}/${now.getFullYear()}`

  const session = currentYearName || settings.session || guessedSession

  const sessionTerms = terms.filter((t) => !t.academic_year || t.academic_year === session)
  const today = now.toISOString().slice(0, 10)
  const term =
    sessionTerms.find((t) => t.start_date <= today && today <= t.end_date)?.name ||
    settings.term ||
    sessionTerms[0]?.name ||
    ''

  return { session, term, terms, sessionTerms, loading: yearsLoading || termsLoading || !settingsLoaded }
}
export default useAcademicPeriod
