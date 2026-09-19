import { useAcademicYears, useTimetableTerms } from '../hooks/useTimetableTerms'

/**
 * Renders "<academic year> Academic Session - <current term>" using the
 * Timetable & Scheduling data as the single source of truth.
 * Renders nothing until configured data exists.
 */
export function SessionTermLabel({ className }: { className?: string }) {
  const { currentYearName } = useAcademicYears()
  const { currentTermName } = useTimetableTerms()

  if (!currentYearName && !currentTermName) return null

  const label = currentYearName
    ? `${currentYearName} Academic Session${currentTermName ? ` - ${currentTermName}` : ''}`
    : currentTermName

  return <p className={className ?? 'text-xs text-gray-500'}>{label}</p>
}
