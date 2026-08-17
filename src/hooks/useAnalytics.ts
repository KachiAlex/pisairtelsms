import { useCallback, useEffect, useState } from 'react'

export interface AnalyticsFilters {
  academicSession?: string
  term?: string
  class?: string
  startDate?: string
  endDate?: string
}

export type AnalyticsMetric =
  | 'academic'
  | 'performance'
  | 'student-progress'
  | 'teacher-performance'
  | 'attendance'
  | 'financial'

function buildAuthHeaders() {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`
  return headers
}

function buildUrl(metric: AnalyticsMetric, filters: AnalyticsFilters) {
  const params = new URLSearchParams({ metric })
  if (filters.academicSession) params.set('academicSession', filters.academicSession)
  if (filters.term) params.set('term', filters.term)
  if (filters.class) params.set('class', filters.class)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  return `/api/tenant/analytics?${params.toString()}`
}

export interface UseAnalyticsResult<T = unknown> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAnalytics<T = unknown>(
  metric: AnalyticsMetric,
  filters: AnalyticsFilters = {}
): UseAnalyticsResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(buildUrl(metric, filters), {
        headers: buildAuthHeaders(),
      })
      if (!res.ok) throw new Error(`Failed to fetch ${metric}`)
      const json = await res.json()
      setData(json.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [metric, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
