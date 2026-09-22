import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { useAcademicYears } from '../../hooks/useTimetableTerms'

interface AcademicSessionSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Academic-session picker fed by /api/tenant/timetable/calendar?resource=academic-years
 * — the single source of truth for session names. Pages must not use a free-text
 * input here: a typo or date-guess produces records keyed by a session that was
 * never configured, silently splitting data.
 *
 * The currently-selected value is merged in even if it is not a configured year,
 * so historical records keyed by a since-deleted session stay selectable.
 */
export function AcademicSessionSelect({
  value,
  onChange,
  placeholder = 'Select session',
  disabled = false,
  className,
}: AcademicSessionSelectProps) {
  const { years, loading } = useAcademicYears()
  const names = years.map((y) => y.name)
  if (value && !names.includes(value)) names.unshift(value)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? 'Loading sessions…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {names.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
            {years.find((y) => y.name === name)?.is_current ? ' (current)' : ''}
          </SelectItem>
        ))}
        {names.length === 0 && (
          <SelectItem value="__none" disabled>
            No academic years configured — set one up in Academic Structure
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
