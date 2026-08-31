import React, { useState, useEffect, useCallback } from 'react'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { tenantApiGet } from '../../lib/tenantApi'

interface ClassItem {
  id: string
  name: string
  arm?: string
}

interface ClassArmSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  allowAll?: boolean
  allLabel?: string
  className?: string
}

export function ClassArmSelect({
  value,
  onChange,
  placeholder = 'Select class',
  label,
  disabled = false,
  allowAll = false,
  allLabel = 'All Classes',
  className,
}: ClassArmSelectProps) {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedName, setSelectedName] = useState('')
  const [selectedArm, setSelectedArm] = useState('')

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const res = await tenantApiGet('/api/tenant/cbt/classes')
      if (res.ok) {
        const json = await res.json()
        setClasses(json.data || json.classes || [])
      }
    } catch { /* silent */ }
  }

  // Derive unique class names
  const uniqueNames = React.useMemo(() => {
    const names = [...new Set(classes.map(c => c.name).filter(Boolean))]
    return names.sort()
  }, [classes])

  // Derive arms for the selected class name
  const armsForName = React.useMemo(() => {
    if (!selectedName) return []
    const arms = classes
      .filter(c => c.name === selectedName && c.arm && c.arm.trim())
      .map(c => c.arm as string)
    return [...new Set(arms)].sort()
  }, [classes, selectedName])

  // Parse incoming value into name + arm components
  useEffect(() => {
    if (!value) {
      setSelectedName('')
      setSelectedArm('')
      return
    }
    // Try to match value to a class+arm combination
    const match = classes.find(c => {
      const full = c.arm ? `${c.name} ${c.arm}` : c.name
      return full === value
    })
    if (match) {
      setSelectedName(match.name)
      setSelectedArm(match.arm || '')
    } else {
      // Try matching just by name
      const nameMatch = classes.find(c => c.name === value)
      if (nameMatch) {
        setSelectedName(nameMatch.name)
        setSelectedArm('')
      } else {
        setSelectedName('')
        setSelectedArm('')
      }
    }
  }, [value, classes])

  const handleNameChange = (name: string) => {
    setSelectedName(name)
    // Reset arm when name changes
    setSelectedArm('')
    // Auto-select if there's only one arm or no arms
    const arms = classes
      .filter(c => c.name === name && c.arm && c.arm.trim())
      .map(c => c.arm as string)
    const uniqueArms = [...new Set(arms)]
    if (uniqueArms.length === 0) {
      // No arms - value is just the name
      onChange(name)
    } else if (uniqueArms.length === 1) {
      // Single arm - auto-select it
      setSelectedArm(uniqueArms[0])
      onChange(`${name} ${uniqueArms[0]}`)
    }
    // Multiple arms - wait for user to select arm, don't emit yet
  }

  const handleArmChange = (arm: string) => {
    setSelectedArm(arm)
    onChange(`${selectedName} ${arm}`)
  }

  const hasArms = armsForName.length > 0

  return (
    <div className={className}>
      {label && <Label className="text-xs text-gray-500 mb-2 block">{label}</Label>}
      <div className="grid gap-2 grid-cols-2">
        <Select
          value={allowAll && value === '' ? '__all__' : selectedName}
          onValueChange={(v) => {
            if (allowAll && v === '__all__') {
              setSelectedName('')
              setSelectedArm('')
              onChange('')
            } else {
              handleNameChange(v)
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>
            {allowAll && <SelectItem value="__all__">{allLabel}</SelectItem>}
            {uniqueNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedArm}
          onValueChange={handleArmChange}
          disabled={disabled || !hasArms}
        >
          <SelectTrigger>
            <SelectValue placeholder={hasArms ? 'Arm' : 'No arms'} />
          </SelectTrigger>
          <SelectContent>
            {armsForName.map(arm => (
              <SelectItem key={arm} value={arm}>{arm}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
